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
}

interface DrawConfig {
  enabled: boolean;
  games: Record<string, { enabled: boolean; minAmount: number; maxAmount: number }>;
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
            v.total_revenue, v.total_players, v.available_balance
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

  const draws: Record<string, DrawConfig> = {};
  const allStates = ['NY', 'FL', 'GA', 'TX', 'PA', 'CT', 'TN', 'NJ'];

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

    draws[dc.draw_state] = {
      enabled: dc.enabled,
      games: { ...draws[dc.draw_state].games, ...games },
    };
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
  }
): Promise<{ vendorId: string }> {
  const result = await query(
    `INSERT INTO vendors (user_id, first_name, last_name, business_name, display_name, status, application_date)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
     RETURNING id`,
    [userId, data.firstName, data.lastName, data.businessName || null, `${data.firstName} ${data.lastName}`]
  );

  return { vendorId: result.rows[0].id };
}

/**
 * Get vendor stats for dashboard.
 */
export async function getVendorStats(vendorId: string) {
  const vendor = await query(
    `SELECT total_revenue, available_balance, total_players, rating, total_tickets_sold
     FROM vendors WHERE id = $1`,
    [vendorId]
  );
  if (vendor.rows.length === 0) throw new AppError('Vendor not found', 404);

  const todayTickets = await query(
    `SELECT COUNT(*) as count, COALESCE(SUM(bet_amount), 0) as total_bets
     FROM lottery_tickets
     WHERE vendor_id = $1 AND created_at::date = CURRENT_DATE`,
    [vendorId]
  );

  const v = vendor.rows[0];
  const t = todayTickets.rows[0];

  return {
    totalRevenue: parseFloat(v.total_revenue),
    availableBalance: parseFloat(v.available_balance),
    totalPlayers: v.total_players,
    rating: parseFloat(v.rating),
    totalTicketsSold: v.total_tickets_sold,
    ticketsToday: parseInt(t.count),
    todayBets: parseFloat(t.total_bets),
    earningsToday: parseFloat(t.total_bets) * 0.1, // 10% commission
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
  drawState: string; number: string; betLimit: number;
}) {
  const result = await query(
    `INSERT INTO number_limits (vendor_id, draw_state, number, bet_limit)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (vendor_id, draw_state, number) DO UPDATE SET bet_limit = $4
     RETURNING id`,
    [vendorId, data.drawState, data.number, data.betLimit]
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
  currency: string = 'HTG'
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

  // Deduct from available balance and create payout request
  await query(
    'UPDATE vendors SET available_balance = available_balance - $1 WHERE id = $2',
    [amount, vendorId]
  );

  const result = await query(
    `INSERT INTO vendor_payouts (vendor_id, amount, currency, method, status, request_date)
     VALUES ($1, $2, $3, $4, 'pending', NOW())
     RETURNING *`,
    [vendorId, amount, currency, method]
  );

  return result.rows[0];
}
