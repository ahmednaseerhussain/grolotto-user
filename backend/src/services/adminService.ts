import { query } from '../database/pool';
import { AppError } from '../middleware/errorHandler';

/**
 * Admin service for system-wide operations.
 */

export async function getSystemStats() {
  const usersResult = await query(
    `SELECT
       COUNT(*) FILTER (WHERE role = 'player') as total_players,
       COUNT(*) FILTER (WHERE role = 'vendor') as total_vendors,
       COUNT(*) FILTER (WHERE role = 'admin') as total_admins
     FROM users WHERE is_active = TRUE`
  );

  const vendorResult = await query(
    `SELECT COUNT(*) as active_vendors FROM vendors WHERE status IN ('approved', 'active') AND is_active = TRUE`
  );

  const pendingResult = await query(
    `SELECT COUNT(*) as pending_approvals FROM vendors WHERE status = 'pending'`
  );

  const revenueResult = await query(
    `SELECT COALESCE(SUM(bet_amount), 0) as total_revenue FROM lottery_tickets`
  );

  const todayResult = await query(
    `SELECT COUNT(*) as today_games FROM lottery_tickets WHERE created_at::date = CURRENT_DATE`
  );

  const u = usersResult.rows[0];
  const v = vendorResult.rows[0];
  const p = pendingResult.rows[0];
  const r = revenueResult.rows[0];
  const t = todayResult.rows[0];

  return {
    totalPlayers: parseInt(u.total_players),
    totalVendors: parseInt(u.total_vendors),
    totalAdmins: parseInt(u.total_admins),
    activeVendors: parseInt(v.active_vendors),
    pendingApprovals: parseInt(p.pending_approvals),
    totalRevenue: parseFloat(r.total_revenue),
    todayGames: parseInt(t.today_games),
  };
}

export async function getAllUsers(role?: string, page: number = 1, limit: number = 50) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (role) {
    conditions.push(`u.role = $${paramIndex++}`);
    values.push(role);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.phone, u.is_verified, u.is_active, u.created_at,
            w.balance_usd
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    phone: r.phone,
    isVerified: r.is_verified,
    isActive: r.is_active,
    balance: parseFloat(r.balance_usd || '0'),
    createdAt: r.created_at,
  }));
}

export async function approveVendor(vendorId: string) {
  const result = await query(
    `UPDATE vendors SET status = 'approved', is_active = TRUE, approved_date = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id, user_id`,
    [vendorId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Vendor not found or not pending', 404);
  }
  return result.rows[0];
}

export async function rejectVendor(vendorId: string, reason: string) {
  const result = await query(
    `UPDATE vendors SET status = 'rejected', rejection_reason = $2
     WHERE id = $1 AND status = 'pending'
     RETURNING id`,
    [vendorId, reason]
  );
  if (result.rows.length === 0) {
    throw new AppError('Vendor not found or not pending', 404);
  }
  return result.rows[0];
}

export async function suspendVendor(vendorId: string) {
  await query(
    `UPDATE vendors SET is_active = FALSE, status = 'suspended' WHERE id = $1`,
    [vendorId]
  );
}

export async function activateVendor(vendorId: string) {
  await query(
    `UPDATE vendors SET is_active = TRUE, status = 'active' WHERE id = $1`,
    [vendorId]
  );
}

export async function suspendUser(userId: string) {
  await query(
    `UPDATE users SET is_active = FALSE WHERE id = $1`,
    [userId]
  );
}

export async function activateUser(userId: string) {
  await query(
    `UPDATE users SET is_active = TRUE WHERE id = $1`,
    [userId]
  );
}

export async function getAppSettings() {
  const result = await query(
    `SELECT key, value, description FROM app_settings ORDER BY key`
  );
  const settings: Record<string, any> = {};
  for (const row of result.rows) {
    // pg driver auto-parses JSONB — don't double-parse
    let val = row.value;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch { /* use as-is */ }
    }
    settings[row.key] = {
      value: val,
      description: row.description,
    };
  }
  return settings;
}

export async function updateAppSetting(key: string, value: any, updatedBy: string) {
  await query(
    `UPDATE app_settings SET value = $1, updated_at = NOW(), updated_by = $3
     WHERE key = $2`,
    [JSON.stringify(value), key, updatedBy]
  );
}

/**
 * Get all pending vendor payout requests.
 */
export async function getPendingPayouts() {
  const result = await query(
    `SELECT vp.*, v.display_name as vendor_name, v.first_name, v.last_name
     FROM vendor_payouts vp
     JOIN vendors v ON v.id = vp.vendor_id
     WHERE vp.status = 'pending'
     ORDER BY vp.request_date ASC`
  );
  return result.rows;
}

/**
 * Process a vendor payout.
 */
export async function processVendorPayout(
  payoutId: string,
  action: 'approved' | 'rejected',
  processedBy: string,
  notes?: string,
  transferReference?: string
) {
  const result = await query(
    `UPDATE vendor_payouts SET
       status = $2,
       processed_date = NOW(),
       processed_by = $3,
       notes = COALESCE($4, notes),
       transfer_reference = $5
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [payoutId, action, processedBy, notes, transferReference]
  );

  if (result.rows.length === 0) {
    throw new AppError('Payout not found or already processed', 404);
  }

  // If rejected, return the amount to vendor's available balance
  if (action === 'rejected') {
    const payout = result.rows[0];
    await query(
      `UPDATE vendors SET available_balance = available_balance + $1 WHERE id = $2`,
      [payout.amount, payout.vendor_id]
    );
  }

  return result.rows[0];
}

/**
 * CRUD operations for advertisements.
 */
export async function getAdvertisements(statusFilter?: string) {
  const condition = statusFilter ? `WHERE status = $1` : '';
  const values = statusFilter ? [statusFilter] : [];

  const result = await query(
    `SELECT * FROM advertisements ${condition} ORDER BY display_order ASC`,
    values
  );

  return result.rows.map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    content: r.content,
    backgroundColor: r.background_color,
    textColor: r.text_color,
    imageUrl: r.image_url,
    linkUrl: r.link_url,
    linkText: r.link_text,
    type: r.ad_type,
    status: r.status,
    startDate: r.start_date,
    endDate: r.end_date,
    clicks: r.clicks,
    impressions: r.impressions,
    targetAudience: r.target_audience,
    priority: r.priority,
    order: r.display_order,
  }));
}

export async function createAdvertisement(data: any, createdBy: string) {
  const result = await query(
    `INSERT INTO advertisements (title, subtitle, content, background_color, text_color,
     image_url, link_url, link_text, ad_type, status, start_date, end_date,
     target_audience, priority, display_order, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING id`,
    [
      data.title, data.subtitle, data.content, data.backgroundColor || '#3b82f6',
      data.textColor || '#ffffff', data.imageUrl, data.linkUrl, data.linkText,
      data.type || 'slideshow', data.status || 'active', data.startDate, data.endDate,
      data.targetAudience || 'all', data.priority || 'medium', data.order || 0, createdBy,
    ]
  );
  return result.rows[0];
}

export async function updateAdvertisement(adId: string, updates: any) {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    title: 'title',
    subtitle: 'subtitle',
    content: 'content',
    backgroundColor: 'background_color',
    textColor: 'text_color',
    imageUrl: 'image_url',
    linkUrl: 'link_url',
    linkText: 'link_text',
    type: 'ad_type',
    status: 'status',
    startDate: 'start_date',
    endDate: 'end_date',
    targetAudience: 'target_audience',
    priority: 'priority',
    order: 'display_order',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) {
      setClauses.push(`${dbField} = $${paramIndex++}`);
      values.push(updates[key]);
    }
  }

  if (setClauses.length === 0) return;

  values.push(adId);
  await query(
    `UPDATE advertisements SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function deleteAdvertisement(adId: string) {
  await query('DELETE FROM advertisements WHERE id = $1', [adId]);
}

export async function recordAdClick(adId: string) {
  await query('UPDATE advertisements SET clicks = clicks + 1 WHERE id = $1', [adId]);
}

export async function recordAdImpression(adId: string) {
  await query('UPDATE advertisements SET impressions = impressions + 1 WHERE id = $1', [adId]);
}
