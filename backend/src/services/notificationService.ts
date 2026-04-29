import { query } from '../database/pool';
import axios from 'axios';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata: any;
  createdAt: string;
}

// ─── Push Token Management ────────────────────────────────

export async function registerPushToken(
  userId: string,
  token: string,
  platform: string = 'unknown'
): Promise<void> {
  await query(
    `INSERT INTO push_device_tokens (user_id, token, platform, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, token) DO UPDATE SET is_active = TRUE, updated_at = NOW()`,
    [userId, token, platform]
  );
}

export async function removePushToken(userId: string, token: string): Promise<void> {
  await query(
    `UPDATE push_device_tokens SET is_active = FALSE WHERE user_id = $1 AND token = $2`,
    [userId, token]
  );
}

// ─── Expo Push API ────────────────────────────────────────

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    // Expo accepts batches of up to 100
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const response = await axios.post(EXPO_PUSH_URL, batch, {
        headers: { 'Content-Type': 'application/json' },
      });
      // Deactivate invalid tokens
      const tickets = response.data?.data || [];
      for (let j = 0; j < tickets.length; j++) {
        if (tickets[j]?.status === 'error' && tickets[j]?.details?.error === 'DeviceNotRegistered') {
          await query(
            `UPDATE push_device_tokens SET is_active = FALSE WHERE token = $1`,
            [batch[j].to]
          );
        }
      }
    }
  } catch (error) {
    console.error('Expo push send failed:', error);
  }
}

/**
 * Send push notifications to a specific user (all their devices).
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const result = await query(
    `SELECT token FROM push_device_tokens WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  const messages: PushMessage[] = result.rows.map((r: any) => ({
    to: r.token,
    title,
    body,
    data,
    sound: 'default',
  }));
  await sendExpoPush(messages);
}

/**
 * Send push notifications to all users of a given role.
 */
export async function sendPushToRole(
  role: 'player' | 'vendor',
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const result = await query(
    `SELECT pdt.token FROM push_device_tokens pdt
     JOIN users u ON u.id = pdt.user_id
     WHERE u.role = $1 AND u.is_active = TRUE AND pdt.is_active = TRUE`,
    [role]
  );
  const messages: PushMessage[] = result.rows.map((r: any) => ({
    to: r.token,
    title,
    body,
    data,
    sound: 'default',
  }));
  await sendExpoPush(messages);
}

/**
 * Get notifications for a user (supports player_notifications, vendor_notifications, and admin_notifications).
 */
export async function getUserNotifications(
  userId: string,
  role: 'player' | 'vendor' | 'admin',
  limit: number = 50,
  offset: number = 0
): Promise<{ notifications: Notification[]; total: number }> {
  if (role === 'admin') {
    // Admin inbox — admin-specific OR broadcast-to-admins (admin_id IS NULL)
    const countResult = await query(
      `SELECT COUNT(*) FROM admin_notifications WHERE admin_id = $1 OR admin_id IS NULL`,
      [userId]
    );
    const result = await query(
      `SELECT id, admin_id as user_id, type, title, message, is_read, metadata, created_at
       FROM admin_notifications
       WHERE admin_id = $1 OR admin_id IS NULL
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return {
      notifications: result.rows.map(mapNotification),
      total: parseInt(countResult.rows[0].count),
    };
  }

  if (role === 'vendor') {
    // Get vendor ID from user ID
    const vendorResult = await query(
      `SELECT id FROM vendors WHERE user_id = $1`,
      [userId]
    );
    if (vendorResult.rows.length === 0) {
      return { notifications: [], total: 0 };
    }
    const vendorId = vendorResult.rows[0].id;

    const countResult = await query(
      `SELECT COUNT(*) FROM vendor_notifications WHERE vendor_id = $1`,
      [vendorId]
    );
    const result = await query(
      `SELECT id, vendor_id as user_id, type, title, message, is_read, NULL as metadata, created_at
       FROM vendor_notifications WHERE vendor_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [vendorId, limit, offset]
    );
    return {
      notifications: result.rows.map(mapNotification),
      total: parseInt(countResult.rows[0].count),
    };
  }

  // Player notifications
  const countResult = await query(
    `SELECT COUNT(*) FROM player_notifications WHERE user_id = $1`,
    [userId]
  );
  const result = await query(
    `SELECT id, user_id, type, title, message, is_read, metadata, created_at
     FROM player_notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return {
    notifications: result.rows.map(mapNotification),
    total: parseInt(countResult.rows[0].count),
  };
}

/**
 * Get unread notification count.
 */
export async function getUnreadCount(userId: string, role: 'player' | 'vendor' | 'admin'): Promise<number> {
  if (role === 'admin') {
    const result = await query(
      `SELECT COUNT(*) FROM admin_notifications
       WHERE (admin_id = $1 OR admin_id IS NULL) AND is_read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
  if (role === 'vendor') {
    const vendorResult = await query(
      `SELECT id FROM vendors WHERE user_id = $1`,
      [userId]
    );
    if (vendorResult.rows.length === 0) return 0;

    const result = await query(
      `SELECT COUNT(*) FROM vendor_notifications WHERE vendor_id = $1 AND is_read = FALSE`,
      [vendorResult.rows[0].id]
    );
    return parseInt(result.rows[0].count);
  }

  const result = await query(
    `SELECT COUNT(*) FROM player_notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string, userId: string, role: 'player' | 'vendor' | 'admin'): Promise<void> {
  if (role === 'admin') {
    await query(
      `UPDATE admin_notifications SET is_read = TRUE
       WHERE id = $1 AND (admin_id = $2 OR admin_id IS NULL)`,
      [notificationId, userId]
    );
    return;
  }
  if (role === 'vendor') {
    const vendorResult = await query(`SELECT id FROM vendors WHERE user_id = $1`, [userId]);
    if (vendorResult.rows.length > 0) {
      await query(
        `UPDATE vendor_notifications SET is_read = TRUE WHERE id = $1 AND vendor_id = $2`,
        [notificationId, vendorResult.rows[0].id]
      );
    }
    return;
  }
  await query(
    `UPDATE player_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(userId: string, role: 'player' | 'vendor' | 'admin'): Promise<void> {
  if (role === 'admin') {
    await query(
      `UPDATE admin_notifications SET is_read = TRUE
       WHERE (admin_id = $1 OR admin_id IS NULL) AND is_read = FALSE`,
      [userId]
    );
    return;
  }
  if (role === 'vendor') {
    const vendorResult = await query(`SELECT id FROM vendors WHERE user_id = $1`, [userId]);
    if (vendorResult.rows.length > 0) {
      await query(
        `UPDATE vendor_notifications SET is_read = TRUE WHERE vendor_id = $1 AND is_read = FALSE`,
        [vendorResult.rows[0].id]
      );
    }
    return;
  }
  await query(
    `UPDATE player_notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
}

/**
 * Create a player notification (and send push).
 */
export async function createPlayerNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: any,
  origin?: { role?: 'system' | 'admin' | 'player' | 'vendor'; id?: string }
): Promise<void> {
  try {
    await query(
      `INSERT INTO player_notifications (user_id, type, title, message, metadata, created_by_role, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        type,
        title,
        message,
        metadata ? JSON.stringify(metadata) : null,
        origin?.role || 'system',
        origin?.id || null,
      ]
    );
    // Send push notification (fire and forget)
    sendPushToUser(userId, title, message, { type }).catch(() => {});
  } catch (error) {
    // Non-critical — don't block main flows
    console.error('Failed to create player notification:', error);
  }
}

/**
 * Create a vendor notification (and send push).
 */
export async function createVendorNotification(
  vendorId: string,
  type: string,
  title: string,
  message: string,
  origin?: { role?: 'system' | 'admin' | 'player' | 'vendor'; id?: string }
): Promise<void> {
  try {
    await query(
      `INSERT INTO vendor_notifications (vendor_id, type, title, message, created_by_role, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [vendorId, type, title, message, origin?.role || 'system', origin?.id || null]
    );
    // Look up user_id for push
    const userResult = await query(`SELECT user_id FROM vendors WHERE id = $1`, [vendorId]);
    if (userResult.rows.length > 0) {
      sendPushToUser(userResult.rows[0].user_id, title, message, { type }).catch(() => {});
    }
  } catch (error) {
    console.error('Failed to create vendor notification:', error);
  }
}

/**
 * Notify all admins (or a single admin) of an event from the player/vendor side
 * — e.g. payout request, withdrawal request, vendor signup, dispute, etc.
 * Falls back silently if the admin_notifications table does not exist yet.
 */
export async function notifyAdmins(
  type: string,
  title: string,
  message: string,
  source?: { role?: 'player' | 'vendor' | 'system'; id?: string },
  metadata?: any,
  adminId?: string | null
): Promise<void> {
  try {
    await query(
      `INSERT INTO admin_notifications (admin_id, type, title, message, metadata, source_role, source_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adminId || null,
        type,
        title,
        message,
        metadata ? JSON.stringify(metadata) : null,
        source?.role || 'system',
        source?.id || null,
      ]
    );
  } catch (error) {
    // Don't block primary flows if the table is missing or insert fails.
    console.error('Failed to create admin notification:', error);
  }
}

function mapNotification(r: any): Notification {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    isRead: r.is_read,
    metadata: r.metadata,
    createdAt: r.created_at,
  };
}
