import { query } from '../database/pool';

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

/**
 * Get notifications for a user (supports both player_notifications and vendor_notifications).
 */
export async function getUserNotifications(
  userId: string,
  role: 'player' | 'vendor',
  limit: number = 50,
  offset: number = 0
): Promise<{ notifications: Notification[]; total: number }> {
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
export async function getUnreadCount(userId: string, role: 'player' | 'vendor'): Promise<number> {
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
export async function markAsRead(notificationId: string, userId: string, role: 'player' | 'vendor'): Promise<void> {
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
export async function markAllAsRead(userId: string, role: 'player' | 'vendor'): Promise<void> {
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
 * Create a player notification.
 */
export async function createPlayerNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: any
): Promise<void> {
  try {
    await query(
      `INSERT INTO player_notifications (user_id, type, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (error) {
    // Non-critical — don't block main flows
    console.error('Failed to create player notification:', error);
  }
}

/**
 * Create a vendor notification.
 */
export async function createVendorNotification(
  vendorId: string,
  type: string,
  title: string,
  message: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO vendor_notifications (vendor_id, type, title, message)
       VALUES ($1, $2, $3, $4)`,
      [vendorId, type, title, message]
    );
  } catch (error) {
    console.error('Failed to create vendor notification:', error);
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
