import { query, withTransaction } from '../database/pool';
import { AppError } from '../middleware/errorHandler';

export interface VendorPublic {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  businessName: string | null;
  displayName: string | null;
  status: string;
  bio: string | null;
  location: string | null;
  businessHours: string | null;
  specialties: string[];
  rating: number;
  totalTicketsSold: number;
  isActive: boolean;
  draws: Record<string, DrawConfig>;
  // Financial fields
  totalRevenue: number;
  totalPlayers: number;
  availableBalance: number;
  operatingCurrency: string;
  rejectionReason?: string | null;
  applicationDate?: string | null;
  approvedDate?: string | null;
}

interface DrawConfig {
  enabled: boolean;
  games: Record<string, { enabled: boolean; minAmount: number; maxAmount: number }>;
  drawTimes?: string[];
  schedules?: Array<{ drawTime: string; openTime: string; closeTime: string; isActive: boolean }>;
}

/**
 * Get all active, approved vendors with their draw configurations.
 * Used by the player dashboard to select a vendor.
 */
export async function getActiveVendors(): Promise<VendorPublic[]> {
  const vendorRows = await query(
    `SELECT v.id, v.user_id, v.first_name, v.last_name, v.business_name, v.display_name,
            v.status, v.bio, v.location, v.business_hours, v.specialties,
            v.rating, v.total_tickets_sold, v.is_active,
            v.total_revenue, v.total_players, v.available_balance,
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='operating_currency') THEN v.operating_currency ELSE 'HTG' END AS operating_currency
     FROM vendors v
     WHERE v.status IN ('approved', 'active') AND v.is_active = TRUE
     ORDER BY v.rating DESC`
  );

  const vendors: VendorPublic[] = [];

  for (const row of vendorRows.rows) {
    const draws = await getVendorDrawConfigs(row.id);
    vendors.push({
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      businessName: row.business_name,
      displayName: row.display_name,
      status: row.status,
      bio: row.bio,
      location: row.location,
      businessHours: row.business_hours,
      specialties: row.specialties || [],
      rating: parseFloat(row.rating || '0'),
      totalTicketsSold: row.total_tickets_sold,
      isActive: row.is_active,
      draws,
      totalRevenue: parseFloat(row.total_revenue || '0'),
      totalPlayers: row.total_players || 0,
      availableBalance: parseFloat(row.available_balance || '0'),
      operatingCurrency: row.operating_currency || 'HTG',
    });
  }

  return vendors;
}

/**
 * Get vendor details by vendor ID.
 */
export async function getVendorById(vendorId: string): Promise<VendorPublic> {
  const result = await query(
    `SELECT v.*, u.email, u.phone
     FROM vendors v
     JOIN users u ON u.id = v.user_id
     WHERE v.id = $1`,
    [vendorId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Vendor not found', 404);
  }

  const row = result.rows[0];
  const draws = await getVendorDrawConfigs(row.id);

  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    businessName: row.business_name,
    displayName: row.display_name,
    status: row.status,
    bio: row.bio,
    location: row.location,
    businessHours: row.business_hours,
    specialties: row.specialties || [],
    rating: parseFloat(row.rating || '0'),
    totalTicketsSold: row.total_tickets_sold,
    isActive: row.is_active,
    draws,
    totalRevenue: parseFloat(row.total_revenue || '0'),
    totalPlayers: row.total_players || 0,
    availableBalance: parseFloat(row.available_balance || '0'),
    operatingCurrency: row.operating_currency || 'HTG',
    rejectionReason: row.rejection_reason || null,
    applicationDate: row.application_date || null,
    approvedDate: row.approved_date || null,
  };
}

/**
 * Get vendor by user_id (for logged-in vendor accessing own data).
 */
export async function getVendorByUserId(userId: string): Promise<VendorPublic> {
  const result = await query(
    'SELECT id FROM vendors WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Vendor profile not found', 404);
  }
  return getVendorById(result.rows[0].id);
}

/**
 * Get draw configurations for a vendor.
 */
async function getVendorDrawConfigs(vendorId: string): Promise<Record<string, DrawConfig>> {
  const drawConfigs = await query(
    `SELECT dc.id, dc.draw_state, dc.enabled
     FROM vendor_draw_configs dc
     WHERE dc.vendor_id = $1`,
    [vendorId]
  );

  // Load schedules (best-effort — table may not exist on older DBs)
  let scheduleRows: any[] = [];
  try {
    const schedRes = await query(
      `SELECT draw_state, draw_time, open_time::text AS open_time, close_time::text AS close_time, is_active
       FROM vendor_draw_schedules WHERE vendor_id = $1`,
      [vendorId]
    );
    scheduleRows = schedRes.rows;
  } catch { /* table missing — ignore */ }

  // Build the dynamic state list:
  //   1. States configured by admin in draw_configs
  //   2. Plus any state already saved on this vendor (so legacy data is preserved)
  //   3. Fallback to the original hardcoded set if nothing is found
  const FALLBACK_STATES = ['NY', 'FL', 'GA', 'TX', 'PA', 'CT', 'TN', 'NJ'];
  let adminStates: string[] = [];
  try {
    const r = await query(
      `SELECT DISTINCT state FROM draw_configs WHERE is_active = TRUE ORDER BY state`
    );
    adminStates = r.rows.map((x: any) => x.state).filter(Boolean);
  } catch { /* draw_configs table missing — ignore */ }
  const vendorStates = drawConfigs.rows.map((r: any) => r.draw_state);
  const merged = Array.from(new Set([...adminStates, ...vendorStates]));
  const allStates = merged.length > 0 ? merged : FALLBACK_STATES;

  const draws: Record<string, DrawConfig> = {};

  // Initialize all states as disabled
  for (const state of allStates) {
    draws[state] = {
      enabled: false,
      games: {
        senp: { enabled: false, minAmount: 1, maxAmount: 100 },
        maryaj: { enabled: false, minAmount: 1, maxAmount: 100 },
        loto3: { enabled: false, minAmount: 1, maxAmount: 100 },
        loto4: { enabled: false, minAmount: 1, maxAmount: 100 },
        loto5: { enabled: false, minAmount: 1, maxAmount: 100 },
      },
      drawTimes: [],
      schedules: [],
    };
  }

  for (const dc of drawConfigs.rows) {
    const gameConfigs = await query(
      `SELECT game_type, enabled, min_amount, max_amount
       FROM vendor_game_configs
       WHERE draw_config_id = $1`,
      [dc.id]
    );

    const games: Record<string, { enabled: boolean; minAmount: number; maxAmount: number }> = {};
    for (const gc of gameConfigs.rows) {
      games[gc.game_type] = {
        enabled: gc.enabled,
        minAmount: parseFloat(gc.min_amount),
        maxAmount: parseFloat(gc.max_amount),
      };
    }

    if (!draws[dc.draw_state]) {
      // State exists on vendor but wasn't pre-initialized (edge case)
      draws[dc.draw_state] = {
        enabled: dc.enabled,
        games: {
          senp: { enabled: false, minAmount: 1, maxAmount: 100 },
          maryaj: { enabled: false, minAmount: 1, maxAmount: 100 },
          loto3: { enabled: false, minAmount: 1, maxAmount: 100 },
          loto4: { enabled: false, minAmount: 1, maxAmount: 100 },
          loto5: { enabled: false, minAmount: 1, maxAmount: 100 },
        },
        drawTimes: [],
        schedules: [],
      };
    }

    draws[dc.draw_state] = {
      enabled: dc.enabled,
      games: { ...draws[dc.draw_state].games, ...games },
      drawTimes: draws[dc.draw_state].drawTimes || [],
      schedules: draws[dc.draw_state].schedules || [],
    };
  }

  // Attach schedules per state
  for (const s of scheduleRows) {
    if (!draws[s.draw_state]) continue;
    if (!draws[s.draw_state].schedules) draws[s.draw_state].schedules = [];
    if (!draws[s.draw_state].drawTimes) draws[s.draw_state].drawTimes = [];
    draws[s.draw_state].schedules!.push({
      drawTime: s.draw_time,
      openTime: s.open_time,
      closeTime: s.close_time,
      isActive: s.is_active,
    });
    if (s.is_active && !draws[s.draw_state].drawTimes!.includes(s.draw_time)) {
      draws[s.draw_state].drawTimes!.push(s.draw_time);
    }
  }

  return draws;
}

/**
 * Update vendor draw settings (vendor self-management).
 */
export async function updateDrawSettings(
  vendorId: string,
  drawState: string,
  settings: { enabled: boolean; games: Record<string, { enabled: boolean; minAmount: number; maxAmount: number }> }
): Promise<void> {
  await withTransaction(async (client) => {
    // Upsert draw config
    const dcResult = await client.query(
      `INSERT INTO vendor_draw_configs (vendor_id, draw_state, enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (vendor_id, draw_state) DO UPDATE SET enabled = $3
       RETURNING id`,
      [vendorId, drawState, settings.enabled]
    );
    const drawConfigId = dcResult.rows[0].id;

    // Upsert each game config
    for (const [gameType, gameSettings] of Object.entries(settings.games)) {
      await client.query(
        `INSERT INTO vendor_game_configs (draw_config_id, game_type, enabled, min_amount, max_amount)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (draw_config_id, game_type) DO UPDATE SET
           enabled = $3, min_amount = $4, max_amount = $5`,
        [drawConfigId, gameType, gameSettings.enabled, gameSettings.minAmount, gameSettings.maxAmount]
      );
    }
  });
}

/**
 * Register a new vendor (application).
 */
export async function registerVendor(
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    businessName?: string;
    operatingCurrency?: string;
  }
): Promise<{ vendorId: string }> {
  const currency = data.operatingCurrency === 'USD' ? 'USD' : 'HTG';

  // Insert without operating_currency in case the column hasn't been migrated yet
  const result = await query(
    `INSERT INTO vendors (user_id, first_name, last_name, business_name, display_name, status, application_date)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
     RETURNING id`,
    [userId, data.firstName, data.lastName, data.businessName || null, `${data.firstName} ${data.lastName}`]
  );

  const vendorId = result.rows[0].id;

  // Try to set operating_currency — silently skip if column doesn't exist yet
  try {
    await query(`UPDATE vendors SET operating_currency = $1 WHERE id = $2`, [currency, vendorId]);
  } catch (_e) {
    // Column doesn't exist yet — migration-006 not run; will default to 'HTG'
  }

  return { vendorId };
}

/**
 * Get vendor stats for dashboard.
 */
export async function getVendorStats(vendorId: string, period: string = 'today') {
  const vendor = await query(
    `SELECT total_revenue, available_balance, total_players, rating, total_tickets_sold
     FROM vendors WHERE id = $1`,
    [vendorId]
  );
  if (vendor.rows.length === 0) throw new AppError('Vendor not found', 404);

  // Determine date filter based on period
  let dateFilter: string;
  switch (period) {
    case 'week':
      dateFilter = `created_at >= date_trunc('week', CURRENT_DATE)`;
      break;
    case 'month':
      dateFilter = `created_at >= date_trunc('month', CURRENT_DATE)`;
      break;
    default: // 'today'
      dateFilter = `created_at::date = CURRENT_DATE`;
      break;
  }

  // Get ticket stats for the period
  const periodTickets = await query(
    `SELECT COUNT(*) as count, COALESCE(SUM(bet_amount), 0) as total_bets
     FROM lottery_tickets
     WHERE vendor_id = $1 AND ${dateFilter}`,
    [vendorId]
  );

  // Get commission already deducted (from admin_commission transactions at bet time)
  const commissionResult = await query(
    `SELECT COALESCE(SUM(t.amount), 0) as total_commission
     FROM transactions t
     JOIN vendors v ON v.user_id = t.user_id
     WHERE v.id = $1 AND t.type = 'admin_commission' AND t.${dateFilter}`,
    [vendorId]
  );

  // Get total player winnings paid by this vendor in the period
  const payoutsResult = await query(
    `SELECT COALESCE(SUM(t.amount), 0) as total_payouts
     FROM transactions t
     JOIN vendors v ON v.user_id = t.user_id
     WHERE v.id = $1 AND t.type = 'winning_payout' AND t.${dateFilter}`,
    [vendorId]
  );

  // Get system commission rate from app_settings (default 10%)
  let commissionRate = 0.10;
  try {
    const commResult = await query(
      `SELECT value FROM app_settings WHERE key = 'system_commission'`
    );
    if (commResult.rows.length > 0) {
      const parsed = parseFloat(commResult.rows[0].value);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        commissionRate = parsed;
      }
    }
  } catch {}

  const v = vendor.rows[0];
  const t = periodTickets.rows[0];
  const totalSales = parseFloat(t.total_bets);
  const totalCommission = parseFloat(commissionResult.rows[0].total_commission);
  const netIncome = totalSales - totalCommission;
  const totalPlayerWins = parseFloat(payoutsResult.rows[0].total_payouts);
  const profitLoss = netIncome - totalPlayerWins;

  return {
    totalRevenue: parseFloat(v.total_revenue),
    availableBalance: parseFloat(v.available_balance),
    totalPlayers: v.total_players,
    rating: parseFloat(v.rating),
    totalTicketsSold: v.total_tickets_sold,
    ticketsToday: parseInt(t.count),
    todayBets: totalSales,
    commissionRate,
    // Financial summary fields
    totalSales,
    totalCommission,
    netIncome,
    totalPlayerWins,
    totalProfit: profitLoss > 0 ? profitLoss : 0,
    totalLoss: profitLoss < 0 ? Math.abs(profitLoss) : 0,
    period,
  };
}

/**
 * Get vendor's game play history.
 */
export async function getVendorPlayHistory(
  vendorId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ plays: any[]; total: number }> {
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) FROM lottery_tickets WHERE vendor_id = $1',
    [vendorId]
  );

  const result = await query(
    `SELECT lt.id, lt.player_id, lt.draw_state, lt.game_type, lt.numbers,
            lt.bet_amount, lt.currency, lt.status, lt.win_amount, lt.created_at,
            u.name as player_name
     FROM lottery_tickets lt
     JOIN users u ON u.id = lt.player_id
     WHERE lt.vendor_id = $1
     ORDER BY lt.created_at DESC
     LIMIT $2 OFFSET $3`,
    [vendorId, limit, offset]
  );

  return {
    plays: result.rows.map((r) => ({
      id: r.id,
      playerId: r.player_id,
      playerName: r.player_name,
      drawState: r.draw_state,
      gameType: r.game_type,
      numbers: r.numbers,
      betAmount: parseFloat(r.bet_amount),
      currency: r.currency,
      status: r.status,
      winAmount: parseFloat(r.win_amount || '0'),
      createdAt: r.created_at,
    })),
    total: parseInt(countResult.rows[0].count),
  };
}

/**
 * Get aggregated play history summary: grouped by date + state + drawTime.
 */
export async function getVendorPlayHistorySummary(
  vendorId: string,
  filters?: { dateFrom?: string; dateTo?: string; drawState?: string; drawTime?: string }
): Promise<any[]> {
  let whereClause = 'lt.vendor_id = $1';
  const params: any[] = [vendorId];
  let paramIdx = 2;

  if (filters?.dateFrom) {
    whereClause += ` AND lt.created_at >= $${paramIdx}::date`;
    params.push(filters.dateFrom);
    paramIdx++;
  }
  if (filters?.dateTo) {
    whereClause += ` AND lt.created_at < ($${paramIdx}::date + INTERVAL '1 day')`;
    params.push(filters.dateTo);
    paramIdx++;
  }
  if (filters?.drawState) {
    whereClause += ` AND lt.draw_state = $${paramIdx}`;
    params.push(filters.drawState);
    paramIdx++;
  }
  if (filters?.drawTime) {
    whereClause += ` AND lr.draw_time = $${paramIdx}`;
    params.push(filters.drawTime);
    paramIdx++;
  }

  const result = await query(
    `SELECT lt.created_at::date as play_date,
            lt.draw_state,
            lr.draw_time,
            COUNT(DISTINCT lt.player_id) as player_count,
            COUNT(lt.id) as ticket_count,
            SUM(lt.bet_amount) as total_amount,
            SUM(CASE WHEN lt.status = 'won' THEN lt.win_amount ELSE 0 END) as total_winnings,
            lt.currency
     FROM lottery_tickets lt
     LEFT JOIN lottery_rounds lr ON lr.id = lt.round_id
     WHERE ${whereClause}
     GROUP BY lt.created_at::date, lt.draw_state, lr.draw_time, lt.currency
     ORDER BY play_date DESC, lt.draw_state, lr.draw_time`,
    params
  );

  return result.rows.map((r: any) => ({
    date: r.play_date,
    drawState: r.draw_state,
    drawTime: r.draw_time || 'midday',
    playerCount: parseInt(r.player_count),
    ticketCount: parseInt(r.ticket_count),
    totalAmount: parseFloat(r.total_amount),
    totalWinnings: parseFloat(r.total_winnings),
    currency: r.currency,
  }));
}

/**
 * Get vendor reviews.
 */
export async function getVendorReviews(vendorId: string) {
  const result = await query(
    `SELECT vr.*, u.name as player_name
     FROM vendor_reviews vr
     JOIN users u ON u.id = vr.player_id
     WHERE vr.vendor_id = $1 AND vr.is_visible = TRUE
     ORDER BY vr.created_at DESC`,
    [vendorId]
  );

  return result.rows.map((r) => ({
    id: r.id,
    vendorId: r.vendor_id,
    playerId: r.player_id,
    playerName: r.player_name,
    rating: r.rating,
    comment: r.comment,
    vendorResponse: r.vendor_response,
    vendorResponseAt: r.vendor_response_at,
    isReported: r.is_reported,
    createdAt: r.created_at,
  }));
}

/**
 * Number limits CRUD
 */
export async function getNumberLimits(vendorId: string) {
  const result = await query(
    `SELECT id, draw_state, number, bet_limit, current_total, is_stopped, created_at
     FROM number_limits WHERE vendor_id = $1 ORDER BY draw_state, number`,
    [vendorId]
  );
  return result.rows.map(r => ({
    id: r.id,
    drawState: r.draw_state,
    number: r.number,
    betLimit: parseFloat(r.bet_limit),
    currentTotal: parseFloat(r.current_total),
    isStopped: r.is_stopped,
    createdAt: r.created_at,
  }));
}

export async function createNumberLimit(vendorId: string, data: {
  drawState: string; number: string; betLimit: number; isStopped?: boolean;
}) {
  const result = await query(
    `INSERT INTO number_limits (vendor_id, draw_state, number, bet_limit, is_stopped)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (vendor_id, draw_state, number) DO UPDATE SET bet_limit = $4, is_stopped = $5
     RETURNING id`,
    [vendorId, data.drawState, data.number, data.betLimit, data.isStopped || false]
  );
  return result.rows[0];
}

export async function updateNumberLimit(vendorId: string, limitId: string, data: {
  betLimit?: number; isStopped?: boolean;
}) {
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (data.betLimit !== undefined) { setClauses.push(`bet_limit = $${idx++}`); values.push(data.betLimit); }
  if (data.isStopped !== undefined) { setClauses.push(`is_stopped = $${idx++}`); values.push(data.isStopped); }
  if (setClauses.length === 0) throw new AppError('No fields to update', 400);
  values.push(limitId, vendorId);
  const result = await query(
    `UPDATE number_limits SET ${setClauses.join(', ')} WHERE id = $${idx++} AND vendor_id = $${idx}`,
    values
  );
  if (result.rowCount === 0) throw new AppError('Number limit not found', 404);
}

export async function deleteNumberLimit(vendorId: string, limitId: string) {
  const result = await query(
    'DELETE FROM number_limits WHERE id = $1 AND vendor_id = $2',
    [limitId, vendorId]
  );
  if (result.rowCount === 0) throw new AppError('Number limit not found', 404);
}

/**
 * Submit a payout request for a vendor.
 */
export async function requestPayout(
  vendorId: string,
  amount: number,
  method: string,
  currency: string = 'HTG',
  bankDetails?: {
    bankName?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankRoutingNumber?: string;
    moncashPhone?: string;
    zelleEmail?: string;
    zellePhone?: string;
    cashappTag?: string;
    paypalEmail?: string;
  }
) {
  // Check vendor balance
  const vendorResult = await query(
    'SELECT available_balance FROM vendors WHERE id = $1',
    [vendorId]
  );
  if (vendorResult.rows.length === 0) throw new AppError('Vendor not found', 404);

  const balance = parseFloat(vendorResult.rows[0].available_balance);
  if (amount > balance) throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
  if (amount <= 0) throw new AppError('Amount must be positive', 400);

  // Method validation
  const allowedMethods = ['moncash', 'cash', 'bank_transfer', 'zelle', 'cashapp', 'paypal'];
  if (!allowedMethods.includes(method)) {
    throw new AppError(`Unsupported payout method: ${method}`, 400);
  }
  if (method === 'cash' && currency !== 'HTG') {
    throw new AppError('Cash payouts are only available for HTG balances.', 400);
  }
  if (method === 'moncash' && !bankDetails?.moncashPhone) {
    throw new AppError('MonCash phone number is required.', 400);
  }
  if (method === 'bank_transfer' && (!bankDetails?.bankName || !bankDetails?.bankAccountNumber || !bankDetails?.bankAccountName)) {
    throw new AppError('Bank name, account name, and account number are required.', 400);
  }

  // Deduct from available balance and create payout request
  await query(
    'UPDATE vendors SET available_balance = available_balance - $1 WHERE id = $2',
    [amount, vendorId]
  );

  const result = await query(
    `INSERT INTO vendor_payouts (vendor_id, amount, currency, method, status, request_date,
       bank_name, bank_account_name, bank_account_number, bank_routing_number, moncash_phone,
       zelle_email, zelle_phone, cashapp_tag, paypal_email)
     VALUES ($1, $2, $3, $4, 'pending', NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      vendorId, amount, currency, method,
      bankDetails?.bankName || null,
      bankDetails?.bankAccountName || null,
      bankDetails?.bankAccountNumber || null,
      bankDetails?.bankRoutingNumber || null,
      bankDetails?.moncashPhone || null,
      bankDetails?.zelleEmail || null,
      bankDetails?.zellePhone || null,
      bankDetails?.cashappTag || null,
      bankDetails?.paypalEmail || null,
    ]
  );

  return result.rows[0];
}

/**
 * Return the current vendor's payout request history (newest first).
 */
export async function getMyPayouts(vendorId: string, limit = 50): Promise<any[]> {
  const result = await query(
    `SELECT id, amount, currency, method, status, request_date, processed_date,
            bank_name, bank_account_name, bank_account_number, bank_routing_number,
            moncash_phone, zelle_email, zelle_phone, cashapp_tag, paypal_email,
            notes
       FROM vendor_payouts
      WHERE vendor_id = $1
      ORDER BY request_date DESC
      LIMIT $2`,
    [vendorId, limit]
  );
  return result.rows;
}

/**
 * Default payout multipliers (matches the user's requested payout table).
 */
export const DEFAULT_PAYOUT_MULTIPLIERS = {
  senp_1st: 60,
  senp_2nd: 20,
  senp_3rd: 10,
  maryaj: 800,
  loto3: 700,
  loto4: 4000,
  loto5: 30000,
};

/**
 * Get a vendor's payout multipliers. Falls back to defaults if not set.
 */
export async function getPayoutMultipliers(vendorId: string): Promise<Record<string, number>> {
  try {
    const result = await query(
      'SELECT payout_multipliers FROM vendors WHERE id = $1',
      [vendorId]
    );
    if (result.rows.length > 0 && result.rows[0].payout_multipliers) {
      const val = result.rows[0].payout_multipliers;
      return typeof val === 'string' ? JSON.parse(val) : val;
    }
  } catch {
    // Column may not exist yet — use defaults
  }
  return { ...DEFAULT_PAYOUT_MULTIPLIERS };
}

/**
 * Update a vendor's payout multipliers.
 */
export async function updatePayoutMultipliers(
  vendorId: string,
  multipliers: Record<string, number>
): Promise<Record<string, number>> {
  // Validate all values are positive numbers
  for (const [key, val] of Object.entries(multipliers)) {
    if (typeof val !== 'number' || val <= 0) {
      throw new AppError(`Invalid multiplier for ${key}: must be a positive number`, 400);
    }
  }

  // Only allow valid keys
  const validKeys = ['senp_1st', 'senp_2nd', 'senp_3rd', 'maryaj', 'loto3', 'loto4', 'loto5'];
  const cleaned: Record<string, number> = {};
  for (const key of validKeys) {
    if (multipliers[key] !== undefined) {
      cleaned[key] = multipliers[key];
    }
  }

  await query(
    'UPDATE vendors SET payout_multipliers = $1 WHERE id = $2',
    [JSON.stringify(cleaned), vendorId]
  );

  return cleaned;
}

// ─── Draw Schedules ────────────────────────────────────────

export interface DrawSchedule {
  id: string;
  vendorId: string;
  drawState: string;
  drawTime: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

export async function getDrawSchedules(vendorId: string): Promise<DrawSchedule[]> {
  const result = await query(
    `SELECT id, vendor_id, draw_state, draw_time, open_time::text, close_time::text, is_active
     FROM vendor_draw_schedules
     WHERE vendor_id = $1
     ORDER BY draw_state, draw_time`,
    [vendorId]
  );
  return result.rows.map((r: any) => ({
    id: r.id,
    vendorId: r.vendor_id,
    drawState: r.draw_state,
    drawTime: r.draw_time,
    openTime: r.open_time,
    closeTime: r.close_time,
    isActive: r.is_active,
  }));
}

export async function upsertDrawSchedule(
  vendorId: string,
  drawState: string,
  drawTime: string,
  openTime: string,
  closeTime: string
): Promise<DrawSchedule> {
  const validStates = ['NY', 'FL', 'GA', 'TX', 'PA', 'CT', 'TN', 'NJ'];
  const validDrawTimes = ['morning', 'midday', 'evening'];

  if (!validStates.includes(drawState)) throw new AppError('Invalid draw state', 400);
  if (!validDrawTimes.includes(drawTime)) throw new AppError('Invalid draw time', 400);

  // Validate time format (HH:MM or HH:MM:SS)
  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
  if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
    throw new AppError('Invalid time format. Use HH:MM', 400);
  }

  const result = await query(
    `INSERT INTO vendor_draw_schedules (vendor_id, draw_state, draw_time, open_time, close_time)
     VALUES ($1, $2, $3, $4::time, $5::time)
     ON CONFLICT (vendor_id, draw_state, draw_time) DO UPDATE SET
       open_time = $4::time, close_time = $5::time, updated_at = NOW()
     RETURNING id, vendor_id, draw_state, draw_time, open_time::text, close_time::text, is_active`,
    [vendorId, drawState, drawTime, openTime, closeTime]
  );

  const r = result.rows[0];
  return {
    id: r.id,
    vendorId: r.vendor_id,
    drawState: r.draw_state,
    drawTime: r.draw_time,
    openTime: r.open_time,
    closeTime: r.close_time,
    isActive: r.is_active,
  };
}

export async function deleteDrawSchedule(vendorId: string, scheduleId: string): Promise<void> {
  const result = await query(
    'DELETE FROM vendor_draw_schedules WHERE id = $1 AND vendor_id = $2',
    [scheduleId, vendorId]
  );
  if (result.rowCount === 0) throw new AppError('Schedule not found', 404);
}

/**
 * Check if a vendor's draw is currently open based on schedule.
 * Returns { isOpen, message } for a specific vendor+state+drawTime.
 */
export async function checkDrawSchedule(
  vendorId: string,
  drawState: string,
  drawTime: string
): Promise<{ isOpen: boolean; message?: string; openTime?: string; closeTime?: string }> {
  const result = await query(
    `SELECT open_time::text, close_time::text, is_active
     FROM vendor_draw_schedules
     WHERE vendor_id = $1 AND draw_state = $2 AND draw_time = $3`,
    [vendorId, drawState, drawTime]
  );

  if (result.rows.length === 0) {
    // No schedule defined — draw is open by default
    return { isOpen: true };
  }

  const schedule = result.rows[0];
  if (!schedule.is_active) {
    return { isOpen: true }; // Inactive schedule = no restriction
  }

  // Compare current time (Haiti is UTC-5 / EST)
  const now = new Date();
  const haitiOffset = -5 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const haitiTime = new Date(utcMs + haitiOffset * 60000);
  const currentMinutes = haitiTime.getHours() * 60 + haitiTime.getMinutes();

  const [openH, openM] = schedule.open_time.split(':').map(Number);
  const [closeH, closeM] = schedule.close_time.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  return {
    isOpen,
    openTime: schedule.open_time,
    closeTime: schedule.close_time,
    message: isOpen ? undefined : `This draw is currently closed. Open: ${schedule.open_time} - ${schedule.close_time}`,
  };
}
