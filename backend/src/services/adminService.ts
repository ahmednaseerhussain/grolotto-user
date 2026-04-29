import { query } from '../database/pool';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcrypt';

/**
 * Admin service for system-wide operations.
 */

export async function getSystemStats(date?: string) {
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

  const pendingApprovalResult = await query(
    `SELECT COUNT(*) as pending_approvals FROM vendors WHERE status = 'pending'`
  );

  const pendingPayoutsResult = await query(
    `SELECT COUNT(*) as pending_payouts FROM vendor_payouts WHERE status = 'pending'`
  );

  const revenueResult = await query(
    `SELECT COALESCE(SUM(bet_amount), 0) as total_revenue FROM lottery_tickets`
  );

  const filterDate = date || new Date().toISOString().split('T')[0];

  const todayResult = await query(
    `SELECT COUNT(*) as today_plays FROM lottery_tickets WHERE created_at::date = $1::date`,
    [filterDate]
  );

  // Players who placed bets on the given date
  const playersPlayedResult = await query(
    `SELECT COUNT(DISTINCT player_id) as players_played FROM lottery_tickets WHERE created_at::date = $1::date`,
    [filterDate]
  );

  // Players who won on the given date
  const playersWonResult = await query(
    `SELECT COUNT(DISTINCT player_id) as players_won FROM lottery_tickets WHERE created_at::date = $1::date AND status = 'won'`,
    [filterDate]
  );

  const u = usersResult.rows[0];
  const v = vendorResult.rows[0];
  const pa = pendingApprovalResult.rows[0];
  const pp = pendingPayoutsResult.rows[0];
  const r = revenueResult.rows[0];
  const t = todayResult.rows[0];
  const pp2 = playersPlayedResult.rows[0];
  const pw = playersWonResult.rows[0];

  return {
    totalPlayers: parseInt(u.total_players),
    totalVendors: parseInt(u.total_vendors),
    totalAdmins: parseInt(u.total_admins),
    activeVendors: parseInt(v.active_vendors),
    pendingApprovals: parseInt(pa.pending_approvals),
    pendingPayouts: parseInt(pp.pending_payouts),
    totalRevenue: parseFloat(r.total_revenue),
    todayPlays: parseInt(t.today_plays),
    playersPlayed: parseInt(pp2.players_played),
    playersWon: parseInt(pw.players_won),
  };
}

export async function getAnalytics(startDate?: string, endDate?: string) {
  const end = endDate || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  // Daily revenue trend (USD + HTG separate)
  const revenueTrend = await query(
    `SELECT
       created_at::date as date,
       currency,
       SUM(amount) as total
     FROM transactions
     WHERE type = 'bet_payment' AND status = 'completed'
       AND created_at::date BETWEEN $1::date AND $2::date
     GROUP BY created_at::date, currency
     ORDER BY date ASC`,
    [start, end]
  );

  // Game performance
  const gamePerformance = await query(
    `SELECT
       lt.game_type,
       COUNT(lt.id) as total_plays,
       COALESCE(SUM(lt.bet_amount), 0) as total_wagered,
       COUNT(DISTINCT lt.player_id) as unique_players,
       lt.currency
     FROM lottery_tickets lt
     LEFT JOIN lottery_rounds r ON r.id = lt.round_id
     WHERE lt.created_at::date BETWEEN $1::date AND $2::date
     GROUP BY lt.game_type, lt.currency
     ORDER BY total_wagered DESC`,
    [start, end]
  );

  // Revenue by currency (totals for period)
  const revenueByCurrency = await query(
    `SELECT
       currency,
       COALESCE(SUM(amount), 0) as total_revenue,
       COUNT(*) as transaction_count
     FROM transactions
     WHERE type = 'bet_payment' AND status = 'completed'
       AND created_at::date BETWEEN $1::date AND $2::date
     GROUP BY currency`,
    [start, end]
  );

  // Payout totals for period
  const payoutTotals = await query(
    `SELECT
       currency,
       COALESCE(SUM(amount), 0) as total_payouts,
       COUNT(*) as payout_count
     FROM transactions
     WHERE type = 'winning_payout' AND status = 'completed'
       AND created_at::date BETWEEN $1::date AND $2::date
     GROUP BY currency`,
    [start, end]
  );

  return {
    period: { start, end },
    revenueTrend: revenueTrend.rows.map(r => ({
      date: r.date,
      currency: r.currency,
      total: parseFloat(r.total),
    })),
    gamePerformance: gamePerformance.rows.map(r => ({
      gameType: r.game_type || 'unknown',
      totalPlays: parseInt(r.total_plays),
      totalWagered: parseFloat(r.total_wagered),
      uniquePlayers: parseInt(r.unique_players),
      currency: r.currency,
    })),
    revenueByCurrency: revenueByCurrency.rows.map(r => ({
      currency: r.currency,
      totalRevenue: parseFloat(r.total_revenue),
      transactionCount: parseInt(r.transaction_count),
    })),
    payoutTotals: payoutTotals.rows.map(r => ({
      currency: r.currency,
      totalPayouts: parseFloat(r.total_payouts),
      payoutCount: parseInt(r.payout_count),
    })),
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

  // Count total for pagination
  const countResult = await query(
    `SELECT COUNT(*) as total FROM users u ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total);

  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.phone, u.is_verified, u.is_active, u.created_at,
            u.last_login,
            w.balance_usd, w.total_won, w.total_bet,
            v.id as vendor_id, v.first_name as v_first_name, v.last_name as v_last_name,
            v.status as vendor_status, v.total_revenue, v.available_balance as v_available_balance,
            v.commission_rate, v.display_name as business_name,
            u.city, u.country
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     LEFT JOIN vendors v ON v.user_id = u.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  const users = result.rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    phone: r.phone,
    isVerified: r.is_verified,
    isActive: r.is_active,
    balance: parseFloat(r.balance_usd || '0'),
    createdAt: r.created_at,
    lastLogin: r.last_login || null,
    totalWon: parseFloat(r.total_won || '0'),
    totalSpent: parseFloat(r.total_bet || '0'),
    // Vendor-specific fields (null for non-vendors)
    vendorId: r.vendor_id || null,
    vendorFirstName: r.v_first_name || null,
    vendorLastName: r.v_last_name || null,
    vendorStatus: r.vendor_status || null,
    totalRevenue: parseFloat(r.total_revenue || '0'),
    availableBalance: parseFloat(r.v_available_balance || '0'),
    commissionRate: parseFloat(r.commission_rate || '0'),
    businessName: r.business_name || null,
    city: r.city || null,
    country: r.country || null,
  }));

  return { users, total, page, limit };
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
    `UPDATE vendors SET is_active = TRUE, status = 'approved' WHERE id = $1`,
    [vendorId]
  );
}

export async function updateVendorCommission(vendorId: string, rate: number) {
  if (rate < 0 || rate > 0.5) {
    throw new AppError('Commission rate must be between 0 and 0.5 (0-50%)', 400);
  }
  const result = await query(
    `UPDATE vendors SET commission_rate = $2 WHERE id = $1 RETURNING id, commission_rate`,
    [vendorId, rate]
  );
  if (result.rows.length === 0) {
    throw new AppError('Vendor not found', 404);
  }
  return { commissionRate: parseFloat(result.rows[0].commission_rate) };
}

export async function suspendUser(userId: string, reason?: string) {
  await query(
    `UPDATE users SET is_active = FALSE WHERE id = $1`,
    [userId]
  );
  // Store suspension reason in app_settings as a log entry
  const reasonText = reason || 'Your account has been suspended by an administrator.';
  try {
    await query(
      `INSERT INTO app_settings (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $2`,
      [`suspension_reason_${userId}`, JSON.stringify({ reason: reasonText, date: new Date().toISOString() }), `Suspension reason for user ${userId}`]
    );
  } catch { /* non-critical, don't fail the suspension */ }

  // Create a player notification so the player sees the reason
  try {
    // Check if player_notifications table exists and insert
    const userRow = await query(`SELECT role FROM users WHERE id = $1`, [userId]);
    const userRole = userRow.rows[0]?.role || 'player';
    const notifTable = userRole === 'vendor' ? 'vendor_notifications' : 'player_notifications';
    await query(
      `INSERT INTO ${notifTable} (id, user_id, type, title, message, metadata, created_at)
       VALUES (gen_random_uuid(), $1, 'account_suspension', 'Account Suspended', $2, $3, NOW())`,
      [
        userId,
        `Your account has been suspended. Reason: ${reasonText}. Please contact support if you believe this is an error.`,
        JSON.stringify({ reason: reasonText, date: new Date().toISOString() }),
      ]
    );
  } catch { /* non-critical */ }

  // Send push notification
  try {
    const tokensResult = await query(
      `SELECT token FROM push_device_tokens WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );
    if (tokensResult.rows.length > 0) {
      const messages = tokensResult.rows.map((row: any) => ({
        to: row.token,
        sound: 'default',
        title: 'Account Suspended',
        body: `Your account has been suspended. Reason: ${reasonText}`,
        data: { type: 'account_suspension', reason: reasonText },
      }));
      // Fire-and-forget push (Expo)
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      }).catch(() => {});
    }
  } catch { /* non-critical */ }
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
  // Validate specific settings to prevent dangerous values
  if (key === 'system_commission') {
    const num = Number(value);
    if (isNaN(num) || num < 0 || num > 1) {
      throw new AppError('Commission rate must be between 0 and 1 (e.g. 0.10 for 10%)', 400);
    }
  }
  if (key === 'win_multipliers') {
    const obj = typeof value === 'object' ? value : null;
    if (!obj || typeof obj !== 'object') {
      throw new AppError('Win multipliers must be an object', 400);
    }
    for (const [game, mult] of Object.entries(obj)) {
      if (typeof mult !== 'number' || mult <= 0) {
        throw new AppError(`Invalid multiplier for ${game}: must be a positive number`, 400);
      }
    }
  }
  if (key === 'number_auto_stop_threshold') {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      throw new AppError('Auto-stop threshold must be a non-negative number', 400);
    }
  }

  await query(
    `UPDATE app_settings SET value = $1, updated_at = NOW(), updated_by = $3
     WHERE key = $2`,
    [JSON.stringify(value), key, updatedBy]
  );
}

/**
 * Get vendor payout requests. If status is provided, filter by status.
 */
export async function getPendingPayouts(status?: string) {
  const condition = status && status !== 'all' ? 'WHERE vp.status = $1' : '';
  const values = status && status !== 'all' ? [status] : [];
  const result = await query(
    `SELECT vp.*, v.display_name as vendor_name, v.first_name, v.last_name,
            u.email as vendor_email
     FROM vendor_payouts vp
     JOIN vendors v ON v.id = vp.vendor_id
     JOIN users u ON u.id = v.user_id
     ${condition}
     ORDER BY vp.created_at DESC`,
    values
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
      data.type || 'slideshow', data.status || 'active',
      data.startDate || new Date().toISOString(),
      data.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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

// ──────────────────────────────────────────────────────────
// Draw Configs CRUD
// ──────────────────────────────────────────────────────────

export async function getDrawConfigs() {
  const result = await query(
    `SELECT * FROM draw_configs ORDER BY state, name`
  );
  return result.rows.map((r) => ({
    id: r.id,
    state: r.state,
    name: r.name,
    drawTime: r.draw_time,
    cutoffTime: r.cutoff_time,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createDrawConfig(data: { state: string; name: string; drawTime: string; cutoffTime?: string }) {
  const result = await query(
    `INSERT INTO draw_configs (state, name, draw_time, cutoff_time) VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.state, data.name, data.drawTime, data.cutoffTime || null]
  );
  const r = result.rows[0];
  return { id: r.id, state: r.state, name: r.name, drawTime: r.draw_time, cutoffTime: r.cutoff_time, isActive: r.is_active };
}

export async function updateDrawConfig(id: string, updates: { name?: string; drawTime?: string; cutoffTime?: string; isActive?: boolean }) {
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
  if (updates.drawTime !== undefined) { setClauses.push(`draw_time = $${idx++}`); values.push(updates.drawTime); }
  if (updates.cutoffTime !== undefined) { setClauses.push(`cutoff_time = $${idx++}`); values.push(updates.cutoffTime); }
  if (updates.isActive !== undefined) { setClauses.push(`is_active = $${idx++}`); values.push(updates.isActive); }

  if (setClauses.length === 0) return;
  setClauses.push(`updated_at = NOW()`);

  values.push(id);
  await query(`UPDATE draw_configs SET ${setClauses.join(', ')} WHERE id = $${idx}`, values);
}

export async function deleteDrawConfig(id: string) {
  await query('DELETE FROM draw_configs WHERE id = $1', [id]);
}

// ──────────────────────────────────────────────────────────
// Gift Cards
// ──────────────────────────────────────────────────────────

function generatePin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 16; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3 || i === 7 || i === 11) pin += '-';
  }
  return pin; // XXXX-XXXX-XXXX-XXXX
}

export async function generateGiftCardBatch(quantity: number, amount: number, currency: string, createdBy: string) {
  // Create batch
  const batchResult = await query(
    `INSERT INTO gift_card_batches (quantity, amount, currency, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
    [quantity, amount, currency, createdBy]
  );
  const batch = batchResult.rows[0];

  // Generate cards
  const cards = [];
  for (let i = 0; i < quantity; i++) {
    const pin = generatePin();
    const cardResult = await query(
      `INSERT INTO gift_cards (batch_id, pin_code, code, amount, currency, purchased_by) VALUES ($1, $2, $2, $3, $4, NULL) RETURNING *`,
      [batch.id, pin, amount, currency]
    );
    cards.push(cardResult.rows[0]);
  }

  return {
    id: batch.id,
    quantity: batch.quantity,
    amount: parseFloat(batch.amount),
    currency: batch.currency,
    createdAt: batch.created_at,
    createdBy: batch.created_by,
    giftCards: cards.map((c) => ({
      id: c.id,
      pinCode: c.pin_code,
      amount: parseFloat(c.amount),
      currency: c.currency,
      isRedeemed: c.is_redeemed,
      createdAt: c.created_at,
    })),
  };
}

export async function getGiftCardBatches() {
  const result = await query(
    `SELECT gb.*, 
            COUNT(gc.id) as total_cards,
            COUNT(gc.id) FILTER (WHERE gc.is_redeemed = TRUE) as redeemed_count
     FROM gift_card_batches gb
     LEFT JOIN gift_cards gc ON gc.batch_id = gb.id
     GROUP BY gb.id
     ORDER BY gb.created_at DESC`
  );
  return result.rows.map((r) => ({
    id: r.id,
    quantity: r.quantity,
    amount: parseFloat(r.amount),
    currency: r.currency,
    createdBy: r.created_by,
    createdAt: r.created_at,
    totalCards: parseInt(r.total_cards),
    redeemedCount: parseInt(r.redeemed_count),
  }));
}

export async function getGiftCards(batchId?: string) {
  const condition = batchId ? 'WHERE gc.batch_id = $1' : '';
  const values = batchId ? [batchId] : [];
  const result = await query(
    `SELECT gc.*, u.name as redeemed_by_name
     FROM gift_cards gc
     LEFT JOIN users u ON u.id = gc.redeemed_by
     ${condition}
     ORDER BY gc.created_at DESC`,
    values
  );
  return result.rows.map((c) => ({
    id: c.id,
    batchId: c.batch_id,
    pinCode: c.pin_code,
    amount: parseFloat(c.amount),
    currency: c.currency,
    isRedeemed: c.is_redeemed,
    redeemedBy: c.redeemed_by,
    redeemedByName: c.redeemed_by_name,
    redeemedAt: c.redeemed_at,
    createdAt: c.created_at,
  }));
}

export async function redeemGiftCard(pinCode: string, userId: string) {
  const result = await query(
    `UPDATE gift_cards SET is_redeemed = TRUE, redeemed_by = $2, redeemed_at = NOW()
     WHERE pin_code = $1 AND is_redeemed = FALSE RETURNING *`,
    [pinCode, userId]
  );
  if (result.rows.length === 0) throw new AppError('Gift card not found or already redeemed', 404);

  const card = result.rows[0];
  // Credit user wallet
  const currency = card.currency === 'HTG' ? 'balance_htg' : 'balance_usd';
  await query(
    `UPDATE wallets SET ${currency} = ${currency} + $1, total_deposited = total_deposited + $1 WHERE user_id = $2`,
    [card.amount, userId]
  );

  return {
    id: card.id,
    pinCode: card.pin_code,
    amount: parseFloat(card.amount),
    currency: card.currency,
  };
}

export async function deactivateGiftCard(cardId: number) {
  const result = await query(
    `UPDATE gift_cards SET status = 'deactivated' WHERE id = $1 AND is_redeemed = FALSE RETURNING id`,
    [cardId]
  );
  if (result.rows.length === 0) throw new AppError('Gift card not found or already redeemed', 404);
  return { success: true };
}

export async function deleteGiftCard(cardId: number) {
  const result = await query(
    `DELETE FROM gift_cards WHERE id = $1 AND is_redeemed = FALSE RETURNING id`,
    [cardId]
  );
  if (result.rows.length === 0) throw new AppError('Gift card not found or already redeemed (cannot delete redeemed cards)', 404);
  return { success: true };
}

// ──────────────────────────────────────────────────────────
// Broadcast Notifications
// ──────────────────────────────────────────────────────────

import { sendPushToRole } from './notificationService';

export async function broadcastNotification(
  title: string,
  message: string,
  type: string,
  targetAudience: 'players' | 'vendors' | 'all',
  sentBy?: string
) {
  const targets: string[] = [];
  if (targetAudience === 'players' || targetAudience === 'all') targets.push('player');
  if (targetAudience === 'vendors' || targetAudience === 'all') targets.push('vendor');

  let totalSent = 0;

  for (const role of targets) {
    const usersResult = await query(
      `SELECT id FROM users WHERE role = $1 AND is_active = TRUE`,
      [role]
    );

    const table = role === 'vendor' ? 'vendor_notifications' : 'player_notifications';
    const fkColumn = role === 'vendor' ? 'vendor_id' : 'user_id';

    if (role === 'vendor') {
      const userIds = usersResult.rows.map((r: any) => r.id);
      if (userIds.length === 0) continue;
      const vendorResult = await query(
        `SELECT id FROM vendors WHERE user_id = ANY($1::uuid[])`,
        [userIds]
      );
      for (const v of vendorResult.rows) {
        await query(
          `INSERT INTO ${table} (${fkColumn}, type, title, message, created_by_role, created_by_id)
           VALUES ($1, $2, $3, $4, 'admin', $5)`,
          [v.id, type, title, message, sentBy || null]
        );
        totalSent++;
      }
    } else {
      for (const u of usersResult.rows) {
        await query(
          `INSERT INTO ${table} (${fkColumn}, type, title, message, created_by_role, created_by_id)
           VALUES ($1, $2, $3, $4, 'admin', $5)`,
          [u.id, type, title, message, sentBy || null]
        );
        totalSent++;
      }
    }

    // Send push notifications for this role
    sendPushToRole(role as 'player' | 'vendor', title, message, { type }).catch((err) => {
      console.error(`Push notification failed for ${role}:`, err);
    });
  }

  // Log broadcast to history
  try {
    await query(
      `INSERT INTO broadcast_history (title, message, type, target_audience, total_sent, sent_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, message, type, targetAudience, totalSent, sentBy || null]
    );
  } catch (err) {
    console.error('Failed to log broadcast history:', err);
  }

  return { totalSent, targetAudience };
}

export async function getBroadcastHistory(limit = 50, offset = 0) {
  const result = await query(
    `SELECT bh.*, u.email as sent_by_email
     FROM broadcast_history bh
     LEFT JOIN users u ON u.id = bh.sent_by
     ORDER BY bh.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const countResult = await query(`SELECT COUNT(*) FROM broadcast_history`);
  return {
    broadcasts: result.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      targetAudience: r.target_audience,
      totalSent: r.total_sent,
      sentByEmail: r.sent_by_email,
      createdAt: r.created_at,
    })),
    total: parseInt(countResult.rows[0].count),
  };
}

// ──────────────────────────────────────────────────────────
// Transactions (admin view)
// ──────────────────────────────────────────────────────────

export async function getTransactions(page: number = 1, limit: number = 50, filters?: { type?: string; userId?: string; paymentMethod?: string }) {
  const conditions: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (filters?.type) { conditions.push(`t.type = $${idx++}`); values.push(filters.type); }
  if (filters?.userId) { conditions.push(`t.user_id = $${idx++}`); values.push(filters.userId); }
  if (filters?.paymentMethod) { conditions.push(`t.payment_method = $${idx++}`); values.push(filters.paymentMethod); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(
    `SELECT COUNT(*) as total FROM transactions t ${whereClause}`, values
  );
  const total = parseInt(countResult.rows[0].total);

  const result = await query(
    `SELECT t.*, u.name as user_name, u.email as user_email, v.business_name as vendor_name
     FROM transactions t
     LEFT JOIN users u ON u.id = t.user_id
     LEFT JOIN vendors v ON v.id = t.vendor_id
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset]
  );

  return {
    transactions: result.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      vendorName: r.vendor_name || null,
      type: r.type,
      amount: parseFloat(r.amount),
      currency: r.currency,
      paymentMethod: r.payment_method || null,
      status: r.status,
      description: r.description,
      ticketId: r.ticket_id || null,
      metadata: r.metadata || null,
      createdAt: r.created_at,
    })),
    total,
    page,
    limit,
  };
}

// ──────────────────────────────────────────────────────────
// Admin User CRUD
// ──────────────────────────────────────────────────────────

export async function createAdminUser(email: string, name: string, password: string, adminRole: string = 'admin') {
  const validRoles = ['super_admin', 'admin', 'moderator', 'viewer', 'result_manager', 'payout_manager', 'ads_manager', 'player_manager'];
  const role = validRoles.includes(adminRole) ? adminRole : 'admin';
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (email, name, password_hash, role, admin_role, is_active, is_verified)
     VALUES ($1, $2, $3, 'admin', $4, TRUE, TRUE) RETURNING id, email, name, role, admin_role, is_active, created_at`,
    [email, name, passwordHash, role]
  );
  return result.rows[0];
}

export async function updateAdminUser(userId: string, updates: { name?: string; email?: string; isActive?: boolean; adminRole?: string }) {
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.name !== undefined) { setClauses.push(`name = $${idx++}`); values.push(updates.name); }
  if (updates.email !== undefined) { setClauses.push(`email = $${idx++}`); values.push(updates.email); }
  if (updates.isActive !== undefined) { setClauses.push(`is_active = $${idx++}`); values.push(updates.isActive); }
  if (updates.adminRole !== undefined) {
    const validRoles = ['super_admin', 'admin', 'moderator', 'viewer', 'result_manager', 'payout_manager', 'ads_manager', 'player_manager'];
    if (validRoles.includes(updates.adminRole)) {
      setClauses.push(`admin_role = $${idx++}`);
      values.push(updates.adminRole);
    }
  }

  if (setClauses.length === 0) return;

  values.push(userId);
  await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx} AND role = 'admin'`,
    values
  );
}

export async function deleteAdminUser(userId: string) {
  // Soft delete — set is_active = false
  await query(
    `UPDATE users SET is_active = FALSE WHERE id = $1 AND role = 'admin'`,
    [userId]
  );
}

// ──────────────────────────────────────────────────────────
// Create Lottery Round
// ──────────────────────────────────────────────────────────

export async function createLotteryRound(drawState: string, drawDate: string, drawTime: string) {
  const result = await query(
    `INSERT INTO lottery_rounds (draw_state, draw_date, draw_time, status, opened_at)
     VALUES ($1, $2, $3, 'open', NOW())
     ON CONFLICT (draw_state, draw_date, draw_time) DO NOTHING
     RETURNING *`,
    [drawState, drawDate, drawTime]
  );
  if (result.rows.length === 0) {
    throw new AppError('Round already exists for this state, date, and time', 409);
  }
  return result.rows[0];
}

// ──────────────────────────────────────────────────────────
// Player Withdrawal Management
// ──────────────────────────────────────────────────────────

export async function getPendingWithdrawals() {
  const result = await query(
    `SELECT t.id, t.user_id, t.amount, t.currency, t.payment_method, t.status,
            t.description, t.metadata, t.created_at,
            u.name as player_name, u.email as player_email
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE t.type = 'withdrawal' AND t.status = 'pending'
     ORDER BY t.created_at ASC`
  );
  return result.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    playerName: r.player_name,
    playerEmail: r.player_email,
    amount: parseFloat(r.amount),
    currency: r.currency,
    method: r.payment_method,
    status: r.status,
    description: r.description,
    bankName: r.metadata?.bankName || '',
    accountHolderName: r.metadata?.accountHolderName || '',
    accountNumber: r.metadata?.accountNumber || '',
    routingNumber: r.metadata?.routingNumber || '',
    cashappTag: r.metadata?.cashappTag || '',
    moncashPhone: r.metadata?.moncashPhone || '',
    paypalEmail: r.metadata?.paypalEmail || '',
    zelleEmail: r.metadata?.zelleEmail || '',
    notes: r.metadata?.notes || '',
    requestDate: r.created_at,
  }));
}

export async function processPlayerWithdrawal(
  withdrawalId: string,
  action: 'approved' | 'rejected',
  processedBy: string,
  adminNotes?: string,
  transferReference?: string
) {
  const status = action === 'approved' ? 'completed' : 'failed';

  const result = await query(
    `UPDATE transactions SET
       status = $2,
       metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
       updated_at = NOW()
     WHERE id = $1 AND type = 'withdrawal' AND status = 'pending'
     RETURNING *`,
    [
      withdrawalId,
      status,
      JSON.stringify({
        processedBy,
        processedAt: new Date().toISOString(),
        adminAction: action,
        adminNotes: adminNotes || null,
        transferReference: transferReference || null,
      }),
    ]
  );

  if (result.rows.length === 0) {
    throw new AppError('Withdrawal not found or already processed', 404);
  }

  // If rejected, refund the amount back to wallet
  if (action === 'rejected') {
    const tx = result.rows[0];
    const balanceField = tx.currency === 'USD' ? 'balance_usd' : 'balance_htg';
    await query(
      `UPDATE wallets SET ${balanceField} = ${balanceField} + $1, total_withdrawn = total_withdrawn - $1
       WHERE user_id = $2`,
      [tx.amount, tx.user_id]
    );
  }

  return result.rows[0];
}
