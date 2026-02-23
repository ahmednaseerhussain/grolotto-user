import { query, withTransaction } from '../database/pool';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';
import * as notificationService from './notificationService';

type GameType = 'senp' | 'maryaj' | 'loto3' | 'loto4' | 'loto5';
type DrawState = 'NY' | 'FL' | 'GA' | 'TX' | 'PA' | 'CT' | 'TN' | 'NJ';

export interface PlaceBetInput {
  playerId: string;
  vendorId: string;
  drawState: DrawState;
  gameType: GameType;
  numbers: number[];
  betAmount: number;
  currency: 'USD' | 'HTG';
}

/**
 * Expected number count per game type.
 */
const GAME_NUMBER_COUNT: Record<GameType, number> = {
  senp: 1,
  maryaj: 2,
  loto3: 3,
  loto4: 4,
  loto5: 5,
};

/**
 * Max number range per game type.
 */
const GAME_MAX_NUMBER: Record<GameType, number> = {
  senp: 99,    // 00-99
  maryaj: 99,  // 00-99
  loto3: 9,    // 0-9
  loto4: 9,    // 0-9
  loto5: 9,    // 0-9
};

/**
 * Place a lottery bet.
 * Validates everything, deducts from wallet, creates ticket and transaction.
 */
export async function placeBet(input: PlaceBetInput) {
  const { playerId, vendorId, drawState, gameType, numbers, betAmount, currency } = input;

  // 1. Validate number count
  if (numbers.length !== GAME_NUMBER_COUNT[gameType]) {
    throw new AppError(
      `${gameType} requires exactly ${GAME_NUMBER_COUNT[gameType]} number(s)`,
      400,
      'INVALID_NUMBERS'
    );
  }

  // 2. Validate number range
  const maxNum = GAME_MAX_NUMBER[gameType];
  for (const num of numbers) {
    if (num < 0 || num > maxNum || !Number.isInteger(num)) {
      throw new AppError(
        `Numbers for ${gameType} must be integers between 0 and ${maxNum}`,
        400,
        'INVALID_NUMBER_RANGE'
      );
    }
  }

  return withTransaction(async (client) => {
    // 3. Check vendor exists and draw is enabled
    const vendorCheck = await client.query(
      `SELECT dc.id as draw_config_id, dc.enabled
       FROM vendor_draw_configs dc
       JOIN vendors v ON v.id = dc.vendor_id
       WHERE v.id = $1 AND dc.draw_state = $2 AND v.is_active = TRUE AND v.status = 'approved'`,
      [vendorId, drawState]
    );

    if (vendorCheck.rows.length === 0 || !vendorCheck.rows[0].enabled) {
      throw new AppError('This draw is not available from this vendor', 400, 'DRAW_UNAVAILABLE');
    }

    // 4. Check game type is enabled with proper min/max
    const gameCheck = await client.query(
      `SELECT enabled, min_amount, max_amount
       FROM vendor_game_configs
       WHERE draw_config_id = $1 AND game_type = $2`,
      [vendorCheck.rows[0].draw_config_id, gameType]
    );

    if (gameCheck.rows.length === 0 || !gameCheck.rows[0].enabled) {
      throw new AppError('This game type is not available', 400, 'GAME_UNAVAILABLE');
    }

    const { min_amount, max_amount } = gameCheck.rows[0];
    if (betAmount < parseFloat(min_amount) || betAmount > parseFloat(max_amount)) {
      throw new AppError(
        `Bet amount must be between ${min_amount} and ${max_amount}`,
        400,
        'INVALID_BET_AMOUNT'
      );
    }

    // 5. Check number limits (scoped to today)
    for (const num of numbers) {
      const formattedNumber = num.toString().padStart(2, '0');
      const limitCheck = await client.query(
        `SELECT bet_limit, current_total, is_stopped
         FROM number_limits
         WHERE vendor_id = $1 AND draw_state = $2 AND number = $3
         AND (draw_date = CURRENT_DATE OR draw_date IS NULL)`,
        [vendorId, drawState, formattedNumber]
      );

      if (limitCheck.rows.length > 0) {
        const limit = limitCheck.rows[0];
        if (limit.is_stopped) {
          throw new AppError(`Number ${formattedNumber} sales are stopped`, 400, 'NUMBER_STOPPED');
        }
        const remaining = parseFloat(limit.bet_limit) - parseFloat(limit.current_total);
        if (betAmount > remaining) {
          throw new AppError(
            `Number ${formattedNumber} limit reached. Remaining: $${remaining.toFixed(2)}`,
            400,
            'NUMBER_LIMIT_EXCEEDED'
          );
        }
      }
    }

    // 6. Deduct from player wallet
    const balanceField = currency === 'USD' ? 'balance_usd' : 'balance_htg';
    const walletResult = await client.query(
      `UPDATE wallets SET ${balanceField} = ${balanceField} - $1, total_bet = total_bet + $1
       WHERE user_id = $2 AND ${balanceField} >= $1
       RETURNING ${balanceField} as new_balance`,
      [betAmount, playerId]
    );

    if (walletResult.rows.length === 0) {
      throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
    }

    // 7. Find or create current open GLOBAL round (one per state+date)
    let roundResult = await client.query(
      `SELECT id FROM lottery_rounds
       WHERE draw_state = $1 AND draw_date = CURRENT_DATE AND status = 'open'
       ORDER BY draw_time LIMIT 1`,
      [drawState]
    );

    if (roundResult.rows.length === 0) {
      // Create a new global round
      roundResult = await client.query(
        `INSERT INTO lottery_rounds (draw_state, draw_date, draw_time, status)
         VALUES ($1, CURRENT_DATE, 'midday', 'open')
         RETURNING id`,
        [drawState]
      );
    }

    const roundId = roundResult.rows[0].id;

    // 9. Create idempotency key from unique bet details
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${playerId}-${vendorId}-${drawState}-${gameType}-${numbers.join(',')}-${Date.now()}`)
      .digest('hex');

    // 9. Create lottery ticket
    const ticketResult = await client.query(
      `INSERT INTO lottery_tickets (player_id, vendor_id, round_id, draw_state, game_type, numbers, bet_amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [playerId, vendorId, roundId, drawState, gameType, numbers, betAmount, currency]
    );

    const ticket = ticketResult.rows[0];

    // 10. Create bet_payment transaction
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, currency, payment_method, status, description, ticket_id, vendor_id, idempotency_key)
       VALUES ($1, 'bet_payment', $2, $3, 'wallet', 'completed', $4, $5, $6, $7)`,
      [
        playerId,
        betAmount,
        currency,
        `Bet on ${gameType.toUpperCase()} - ${drawState} [${numbers.join(', ')}]`,
        ticket.id,
        vendorId,
        idempotencyKey,
      ]
    );

    // 11. Credit vendor with FULL bet amount (100% goes to vendor)
    await client.query(
      `UPDATE vendors SET
         total_tickets_sold = total_tickets_sold + 1,
         total_revenue = total_revenue + $1,
         available_balance = available_balance + $1
       WHERE id = $2`,
      [betAmount, vendorId]
    );

    // 12. Create bet_received transaction for vendor
    const vendorUserResult = await client.query(
      `SELECT user_id FROM vendors WHERE id = $1`,
      [vendorId]
    );
    if (vendorUserResult.rows.length > 0) {
      const commIdempotencyKey = `bet_recv_${ticket.id}`;
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, payment_method, status, description, ticket_id, vendor_id, idempotency_key)
         VALUES ($1, 'commission', $2, $3, 'system', 'completed', $4, $5, $6, $7)`,
        [
          vendorUserResult.rows[0].user_id,
          betAmount,
          currency,
          `Bet received: ${gameType.toUpperCase()} ticket on ${drawState}`,
          ticket.id,
          vendorId,
          commIdempotencyKey,
        ]
      );
    }

    // 13. Update round stats
    await client.query(
      `UPDATE lottery_rounds SET
         total_bets = total_bets + $1,
         total_tickets = total_tickets + 1
       WHERE id = $2`,
      [betAmount, roundId]
    );

    // 15. Update number limit totals (scoped to today)
    for (const num of numbers) {
      const formattedNumber = num.toString().padStart(2, '0');
      await client.query(
        `UPDATE number_limits SET current_total = current_total + $1
         WHERE vendor_id = $2 AND draw_state = $3 AND number = $4
         AND (draw_date = CURRENT_DATE OR draw_date IS NULL)`,
        [betAmount, vendorId, drawState, formattedNumber]
      );
    }

    // 15. Send notifications (non-blocking)
    notificationService.createPlayerNotification(
      playerId,
      'bet_placed',
      'Bet Placed Successfully',
      `Your ${gameType.toUpperCase()} bet of ${betAmount} ${currency} on ${drawState} has been placed.`,
      { ticketId: ticket.id, drawState, gameType, numbers, betAmount }
    );
    notificationService.createVendorNotification(
      vendorId,
      'new_ticket',
      'New Ticket Sold',
      `A ${gameType.toUpperCase()} ticket (${betAmount} ${currency}) was purchased. Full amount credited to your balance.`
    );

    return {
      ticketId: ticket.id,
      roundId,
      drawState,
      gameType,
      numbers,
      betAmount,
      currency,
      newBalance: parseFloat(walletResult.rows[0].new_balance),
      createdAt: ticket.created_at,
    };
  });
}

/**
 * Get player's ticket history.
 */
export async function getPlayerTickets(
  playerId: string,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) FROM lottery_tickets WHERE player_id = $1',
    [playerId]
  );

  const result = await query(
    `SELECT lt.id, lt.draw_state, lt.game_type, lt.numbers, lt.bet_amount,
            lt.currency, lt.status, lt.win_amount, lt.created_at,
            v.display_name as vendor_name
     FROM lottery_tickets lt
     JOIN vendors v ON v.id = lt.vendor_id
     WHERE lt.player_id = $1
     ORDER BY lt.created_at DESC
     LIMIT $2 OFFSET $3`,
    [playerId, limit, offset]
  );

  return {
    tickets: result.rows.map((r) => ({
      id: r.id,
      drawState: r.draw_state,
      gameType: r.game_type,
      numbers: r.numbers,
      betAmount: parseFloat(r.bet_amount),
      currency: r.currency,
      status: r.status,
      winAmount: parseFloat(r.win_amount || '0'),
      vendorName: r.vendor_name,
      createdAt: r.created_at,
    })),
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}

/**
 * Publish lottery results — VENDOR-FUNDED, ADMIN-PUBLISHED MODEL.
 * 
 * Business rules:
 * - Admin publishes winning numbers globally per state per day
 * - One set of winning numbers per (draw_state, draw_date) — same for ALL vendors
 * - Winners get MULTIPLIER-based payouts (from app_settings.win_multipliers):
 *     senp=50x, maryaj=100x, loto3=500x, loto4=5000x, loto5=50000x
 * - winAmount = betAmount × multiplier
 * - Vendor PAYS the winner payouts (deducted from vendor's available_balance)
 * - Vendor can go into negative balance (debt)
 * - Admin takes 10% commission from each vendor's total bets after each round
 * - Admin distributes winnings to player wallets
 * - Winners get notified with amounts
 */
export async function publishResults(
  drawState: string,
  winningNumbers: Record<string, number[]>,
  publishedBy: string,
  drawDate?: string
) {
  return withTransaction(async (client) => {
    const targetDate = drawDate || new Date().toISOString().split('T')[0];

    // 1. Find the open/closed round for this state+date
    const roundResult = await client.query(
      `SELECT id, draw_state, status, total_bets, total_tickets
       FROM lottery_rounds
       WHERE draw_state = $1 AND draw_date = $2 AND status IN ('open', 'closed')
       ORDER BY draw_time LIMIT 1`,
      [drawState, targetDate]
    );

    if (roundResult.rows.length === 0) {
      throw new AppError('No active round found for this state and date', 400, 'ROUND_NOT_FOUND');
    }

    const round = roundResult.rows[0];
    const roundId = round.id;

    // 2. Get win multipliers from app_settings
    let winMultipliers: Record<string, number> = {
      senp: 50, maryaj: 100, loto3: 500, loto4: 5000, loto5: 50000
    };
    try {
      const multResult = await client.query(
        `SELECT value FROM app_settings WHERE key = 'win_multipliers'`
      );
      if (multResult.rows.length > 0) {
        const val = multResult.rows[0].value;
        winMultipliers = typeof val === 'string' ? JSON.parse(val) : val;
      }
    } catch { /* use defaults */ }

    // 3. Get system commission rate from app_settings
    let systemCommissionRate = 0.10;
    try {
      const sysCommResult = await client.query(
        `SELECT value FROM app_settings WHERE key = 'system_commission'`
      );
      if (sysCommResult.rows.length > 0) {
        const val = sysCommResult.rows[0].value;
        systemCommissionRate = parseFloat(typeof val === 'string' ? val : JSON.stringify(val));
      }
    } catch { /* use default 10% */ }

    // 4. Store winning numbers and mark completed
    await client.query(
      `UPDATE lottery_rounds SET
         winning_numbers = $1,
         status = 'completed',
         drawn_at = NOW(),
         published_at = NOW(),
         published_by = $2
       WHERE id = $3`,
      [JSON.stringify(winningNumbers), publishedBy, roundId]
    );

    // 5. Get all pending tickets for this round
    const tickets = await client.query(
      `SELECT id, player_id, vendor_id, game_type, numbers, bet_amount, currency
       FROM lottery_tickets
       WHERE round_id = $1 AND status = 'pending'`,
      [roundId]
    );

    // 6. Check each ticket for wins using multiplier-based payouts
    const winners: Array<typeof tickets.rows[0] & { winAmount: number }> = [];
    const losers: typeof tickets.rows = [];

    for (const ticket of tickets.rows) {
      const gameWinningNums = winningNumbers[ticket.game_type];
      if (!gameWinningNums) {
        losers.push(ticket);
        continue;
      }
      if (checkWin(ticket.game_type, ticket.numbers, gameWinningNums)) {
        const multiplier = winMultipliers[ticket.game_type] || 1;
        const winAmount = Math.round(parseFloat(ticket.bet_amount) * multiplier * 100) / 100;
        winners.push({ ...ticket, winAmount });
      } else {
        losers.push(ticket);
      }
    }

    // 7. Mark all losers
    for (const loser of losers) {
      await client.query(
        `UPDATE lottery_tickets SET status = 'lost', settled_at = NOW() WHERE id = $1`,
        [loser.id]
      );
    }

    // 8. Process winners — group payouts by vendor for balance deductions
    let totalPayouts = 0;
    const vendorPayouts: Record<string, number> = {}; // vendorId → total payout amount
    const vendorBets: Record<string, number> = {}; // vendorId → total bet amount

    // Calculate total bets per vendor (for admin commission)
    for (const ticket of tickets.rows) {
      const vid = ticket.vendor_id;
      vendorBets[vid] = (vendorBets[vid] || 0) + parseFloat(ticket.bet_amount);
    }

    for (const winner of winners) {
      const { winAmount } = winner;

      // Mark ticket as won
      await client.query(
        `UPDATE lottery_tickets SET status = 'won', win_amount = $1, settled_at = NOW()
         WHERE id = $2`,
        [winAmount, winner.id]
      );

      // Credit player wallet
      const balanceField = winner.currency === 'USD' ? 'balance_usd' : 'balance_htg';
      await client.query(
        `UPDATE wallets SET ${balanceField} = ${balanceField} + $1, total_won = total_won + $1
         WHERE user_id = $2`,
        [winAmount, winner.player_id]
      );

      // Create winning transaction for player
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, description, ticket_id, vendor_id)
         VALUES ($1, 'winning_payout', $2, $3, 'completed', $4, $5, $6)`,
        [
          winner.player_id,
          winAmount,
          winner.currency,
          `Won ${winner.game_type.toUpperCase()} - ${drawState}: ${winMultipliers[winner.game_type]}x payout = $${winAmount.toFixed(2)}`,
          winner.id,
          winner.vendor_id,
        ]
      );

      // Track vendor payout totals
      vendorPayouts[winner.vendor_id] = (vendorPayouts[winner.vendor_id] || 0) + winAmount;
      totalPayouts += winAmount;

      // Notify winner
      notificationService.createPlayerNotification(
        winner.player_id,
        'win',
        'Congratulations! You Won!',
        `Your ${winner.game_type.toUpperCase()} bet on ${drawState} won $${winAmount.toFixed(2)} (${winMultipliers[winner.game_type]}x multiplier)!`,
        { ticketId: winner.id, winAmount, gameType: winner.game_type, multiplier: winMultipliers[winner.game_type] }
      );
    }

    // 9. Deduct winner payouts from each vendor's balance (vendor pays winners)
    let totalAdminCommission = 0;
    for (const [vid, payoutAmount] of Object.entries(vendorPayouts)) {
      if (payoutAmount > 0) {
        await client.query(
          `UPDATE vendors SET available_balance = available_balance - $1 WHERE id = $2`,
          [payoutAmount, vid]
        );

        // Create payout deduction transaction for vendor
        const vendorUserResult = await client.query(
          `SELECT user_id FROM vendors WHERE id = $1`,
          [vid]
        );
        if (vendorUserResult.rows.length > 0) {
          await client.query(
            `INSERT INTO transactions (user_id, type, amount, currency, status, description, vendor_id)
             VALUES ($1, 'winning_payout', $2, 'USD', 'completed', $3, $4)`,
            [
              vendorUserResult.rows[0].user_id,
              payoutAmount,
              `Winner payouts for ${drawState} round (${targetDate})`,
              vid,
            ]
          );
        }

        // Notify vendor about payouts
        notificationService.createVendorNotification(
          vid,
          'payout_deduction',
          'Winner Payouts Deducted',
          `$${payoutAmount.toFixed(2)} deducted from your balance for winner payouts in ${drawState} (${targetDate}).`
        );
      }
    }

    // 10. Deduct admin commission (10%) from each vendor's total bets
    for (const [vid, betTotal] of Object.entries(vendorBets)) {
      const adminCommission = Math.round(betTotal * systemCommissionRate * 100) / 100;
      if (adminCommission > 0) {
        // Deduct from vendor
        await client.query(
          `UPDATE vendors SET available_balance = available_balance - $1 WHERE id = $2`,
          [adminCommission, vid]
        );

        // Create admin commission transaction for vendor
        const vendorUserResult = await client.query(
          `SELECT user_id FROM vendors WHERE id = $1`,
          [vid]
        );
        if (vendorUserResult.rows.length > 0) {
          await client.query(
            `INSERT INTO transactions (user_id, type, amount, currency, status, description, vendor_id)
             VALUES ($1, 'admin_commission', $2, 'USD', 'completed', $3, $4)`,
            [
              vendorUserResult.rows[0].user_id,
              adminCommission,
              `Admin commission (${systemCommissionRate * 100}%) on ${drawState} round bets ($${betTotal.toFixed(2)})`,
              vid,
            ]
          );
        }

        totalAdminCommission += adminCommission;

        // Notify vendor about admin commission
        notificationService.createVendorNotification(
          vid,
          'admin_commission',
          'Admin Commission Charged',
          `$${adminCommission.toFixed(2)} admin commission (${systemCommissionRate * 100}%) charged on your ${drawState} bets ($${betTotal.toFixed(2)}).`
        );
      }
    }

    // 11. Update round with final payout stats
    await client.query(
      `UPDATE lottery_rounds SET
         total_payouts = $1,
         winner_count = $2,
         admin_commission_total = $3
       WHERE id = $4`,
      [totalPayouts, winners.length, totalAdminCommission, roundId]
    );

    return {
      roundId,
      drawState,
      drawDate: targetDate,
      winningNumbers,
      totalTickets: tickets.rows.length,
      winnerCount: winners.length,
      totalBets: parseFloat(round.total_bets || '0'),
      totalPayouts,
      totalAdminCommission,
      vendorPayouts,
    };
  });
}

/**
 * Get rounds where a vendor has tickets (global rounds, filtered by vendor participation).
 */
export async function getVendorRounds(
  vendorId: string,
  filters?: { status?: string; date?: string; page?: number; limit?: number }
) {
  const conditions: string[] = [
    `id IN (SELECT DISTINCT round_id FROM lottery_tickets WHERE vendor_id = $1)`
  ];
  const values: any[] = [vendorId];
  let paramIndex = 2;

  if (filters?.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(filters.status);
  }
  if (filters?.date) {
    conditions.push(`draw_date = $${paramIndex++}`);
    values.push(filters.date);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT lr.id, lr.draw_state, lr.draw_date, lr.draw_time, lr.status, lr.winning_numbers,
            lr.total_bets, lr.total_payouts, lr.total_tickets,
            lr.admin_commission_total, lr.winner_count,
            lr.opened_at, lr.closed_at, lr.drawn_at, lr.published_at,
            -- Vendor-specific stats from tickets
            COALESCE(SUM(lt.bet_amount) FILTER (WHERE lt.vendor_id = $1), 0) as vendor_bet_total,
            COUNT(lt.id) FILTER (WHERE lt.vendor_id = $1) as vendor_ticket_count,
            COALESCE(SUM(lt.win_amount) FILTER (WHERE lt.vendor_id = $1 AND lt.status = 'won'), 0) as vendor_payout_total
     FROM lottery_rounds lr
     LEFT JOIN lottery_tickets lt ON lt.round_id = lr.id
     ${whereClause}
     GROUP BY lr.id
     ORDER BY lr.draw_date DESC, lr.opened_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return result.rows.map((r) => ({
    id: r.id,
    drawState: r.draw_state,
    drawDate: r.draw_date,
    drawTime: r.draw_time,
    status: r.status,
    winningNumbers: r.winning_numbers,
    totalBets: parseFloat(r.total_bets || '0'),
    totalPayouts: parseFloat(r.total_payouts || '0'),
    totalTickets: r.total_tickets || 0,
    adminCommissionTotal: parseFloat(r.admin_commission_total || '0'),
    winnerCount: r.winner_count || 0,
    vendorBetTotal: parseFloat(r.vendor_bet_total || '0'),
    vendorTicketCount: parseInt(r.vendor_ticket_count || '0'),
    vendorPayoutTotal: parseFloat(r.vendor_payout_total || '0'),
    openedAt: r.opened_at,
    closedAt: r.closed_at,
    drawnAt: r.drawn_at,
    publishedAt: r.published_at,
  }));
}

/**
 * Get detailed info about a specific round, including vendor's tickets only.
 * Global round with vendor-scoped ticket view.
 */
export async function getVendorRoundDetails(vendorId: string, roundId: string) {
  // 1. Get round (global — no vendor_id check)
  const roundResult = await query(
    `SELECT id, draw_state, draw_date, draw_time, status, winning_numbers,
            total_bets, total_payouts, total_tickets,
            admin_commission_total, winner_count,
            opened_at, closed_at, drawn_at, published_at
     FROM lottery_rounds
     WHERE id = $1`,
    [roundId]
  );

  if (roundResult.rows.length === 0) {
    throw new AppError('Round not found', 404, 'ROUND_NOT_FOUND');
  }

  const r = roundResult.rows[0];

  // 2. Get only this vendor's tickets for this round
  const ticketsResult = await query(
    `SELECT lt.id, lt.player_id, lt.game_type, lt.numbers, lt.bet_amount,
            lt.currency, lt.status, lt.win_amount, lt.created_at,
            u.name as player_name, u.email as player_email
     FROM lottery_tickets lt
     JOIN users u ON u.id = lt.player_id
     WHERE lt.round_id = $1 AND lt.vendor_id = $2
     ORDER BY lt.created_at DESC`,
    [roundId, vendorId]
  );

  // 3. Calculate vendor-specific stats
  const vendorBetTotal = ticketsResult.rows.reduce((sum, t) => sum + parseFloat(t.bet_amount), 0);
  const vendorPayoutTotal = ticketsResult.rows
    .filter(t => t.status === 'won')
    .reduce((sum, t) => sum + parseFloat(t.win_amount || '0'), 0);

  return {
    round: {
      id: r.id,
      drawState: r.draw_state,
      drawDate: r.draw_date,
      drawTime: r.draw_time,
      status: r.status,
      winningNumbers: r.winning_numbers,
      totalBets: parseFloat(r.total_bets || '0'),
      totalPayouts: parseFloat(r.total_payouts || '0'),
      totalTickets: r.total_tickets || 0,
      adminCommissionTotal: parseFloat(r.admin_commission_total || '0'),
      winnerCount: r.winner_count || 0,
      vendorBetTotal,
      vendorPayoutTotal,
      vendorTicketCount: ticketsResult.rows.length,
      openedAt: r.opened_at,
      closedAt: r.closed_at,
      drawnAt: r.drawn_at,
      publishedAt: r.published_at,
    },
    tickets: ticketsResult.rows.map((t) => ({
      id: t.id,
      playerId: t.player_id,
      playerName: t.player_name,
      playerEmail: t.player_email,
      gameType: t.game_type,
      numbers: t.numbers,
      betAmount: parseFloat(t.bet_amount),
      currency: t.currency,
      status: t.status,
      winAmount: parseFloat(t.win_amount || '0'),
      createdAt: t.created_at,
    })),
  };
}

/**
 * Check if a ticket's numbers match the winning numbers.
 * Rules:
 * - SENP: 1 number must match exactly
 * - MARYAJ: 2 numbers must match exactly (order matters)
 * - LOTO3-5: all digits must match in exact order
 */
function checkWin(gameType: string, ticketNumbers: number[], winningNumbers: number[]): boolean {
  if (ticketNumbers.length !== winningNumbers.length) return false;

  // All numbers must match in order
  for (let i = 0; i < ticketNumbers.length; i++) {
    if (ticketNumbers[i] !== winningNumbers[i]) return false;
  }

  return true;
}

/**
 * Get lottery rounds (with optional filters).
 */
export async function getLotteryRounds(filters?: {
  drawState?: string;
  status?: string;
  date?: string;
  page?: number;
  limit?: number;
}) {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (filters?.drawState) {
    conditions.push(`draw_state = $${paramIndex++}`);
    values.push(filters.drawState);
  }
  if (filters?.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(filters.status);
  }
  if (filters?.date) {
    conditions.push(`draw_date = $${paramIndex++}`);
    values.push(filters.date);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT id, draw_state, draw_date, draw_time, status, winning_numbers,
            total_bets, total_payouts, total_tickets, opened_at, closed_at, drawn_at, published_at
     FROM lottery_rounds
     ${whereClause}
     ORDER BY draw_date DESC, draw_time DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...values, limit, offset]
  );

  return result.rows.map((r) => ({
    id: r.id,
    drawState: r.draw_state,
    drawDate: r.draw_date,
    drawTime: r.draw_time,
    status: r.status,
    winningNumbers: r.winning_numbers,
    totalBets: parseFloat(r.total_bets || '0'),
    totalPayouts: parseFloat(r.total_payouts || '0'),
    totalTickets: r.total_tickets,
    openedAt: r.opened_at,
    closedAt: r.closed_at,
    drawnAt: r.drawn_at,
    publishedAt: r.published_at,
  }));
}

/**
 * Generate cryptographically secure random winning numbers.
 */
export function generateWinningNumbers(): Record<string, number[]> {
  return {
    senp: [secureRandom(0, 99)],
    maryaj: [secureRandom(0, 99), secureRandom(0, 99)],
    loto3: [secureRandom(0, 9), secureRandom(0, 9), secureRandom(0, 9)],
    loto4: [secureRandom(0, 9), secureRandom(0, 9), secureRandom(0, 9), secureRandom(0, 9)],
    loto5: [secureRandom(0, 9), secureRandom(0, 9), secureRandom(0, 9), secureRandom(0, 9), secureRandom(0, 9)],
  };
}

/**
 * Generate a cryptographically secure random integer in range [min, max].
 */
function secureRandom(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;

  let randomValue: number;
  do {
    const randomBytes = crypto.randomBytes(bytesNeeded);
    randomValue = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = (randomValue << 8) + randomBytes[i];
    }
  } while (randomValue > maxValid);

  return min + (randomValue % range);
}
