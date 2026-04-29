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
  drawTime?: 'midday' | 'evening';
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

  // Determine draw time: use provided value, or auto-detect from current time
  // Before 3 PM ET = midday, after 3 PM ET = evening
  let drawTime = input.drawTime || 'midday';
  if (!input.drawTime) {
    // DST-aware ET detection: US Eastern is UTC-5 (EST) or UTC-4 (EDT)
    const now = new Date();
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    });
    const etHour = parseInt(etFormatter.format(now), 10);
    drawTime = etHour >= 15 ? 'evening' : 'midday';
  }

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

    // 3b. Check vendor draw schedule (if one is set)
    const scheduleCheck = await client.query(
      `SELECT open_time, close_time, is_active
       FROM vendor_draw_schedules
       WHERE vendor_id = $1 AND draw_state = $2 AND draw_time = $3 AND is_active = TRUE`,
      [vendorId, drawState, drawTime]
    );

    if (scheduleCheck.rows.length > 0) {
      const sched = scheduleCheck.rows[0];
      const now = new Date();
      const etFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const etParts = etFormatter.formatToParts(now);
      const etHour = parseInt(etParts.find(p => p.type === 'hour')?.value || '0', 10);
      const etMin = parseInt(etParts.find(p => p.type === 'minute')?.value || '0', 10);
      const currentMinutes = etHour * 60 + etMin;

      const [openH, openM] = sched.open_time.split(':').map(Number);
      const [closeH, closeM] = sched.close_time.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
        const openStr = sched.open_time.slice(0, 5);
        const closeStr = sched.close_time.slice(0, 5);
        throw new AppError(
          `This draw is currently closed. Open: ${openStr} - ${closeStr} ET`,
          400,
          'DRAW_CLOSED'
        );
      }
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

    // 7. Find or create current open GLOBAL round (one per state+date+drawTime)
    let roundResult = await client.query(
      `SELECT id FROM lottery_rounds
       WHERE draw_state = $1 AND draw_date = CURRENT_DATE AND draw_time = $2 AND status = 'open'
       ORDER BY created_at DESC LIMIT 1`,
      [drawState, drawTime]
    );

    if (roundResult.rows.length === 0) {
      // Create a new global round for this draw time
      roundResult = await client.query(
        `INSERT INTO lottery_rounds (draw_state, draw_date, draw_time, status)
         VALUES ($1, CURRENT_DATE, $2, 'open')
         RETURNING id`,
        [drawState, drawTime]
      );
    }

    const roundId = roundResult.rows[0].id;

    // 8. Get system commission rate (admin takes this % from every bet immediately)
    let systemCommissionRate = 0.10;
    try {
      const commRateResult = await client.query(
        `SELECT value FROM app_settings WHERE key = 'system_commission'`
      );
      if (commRateResult.rows.length > 0) {
        const val = commRateResult.rows[0].value;
        const parsed = parseFloat(typeof val === 'string' ? val : JSON.stringify(val));
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          systemCommissionRate = parsed;
        }
      }
    } catch { /* use default 10% */ }

    // 9. Calculate commission split — admin commission deducted IMMEDIATELY at bet time
    const adminCommission = Math.round(betAmount * systemCommissionRate * 100) / 100;
    const vendorNetAmount = Math.round((betAmount - adminCommission) * 100) / 100;

    // 10. Create idempotency key from unique bet details (no Date.now to prevent duplicates)
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${playerId}-${vendorId}-${drawState}-${gameType}-${numbers.join(',')}-${drawTime}-${betAmount}`)
      .digest('hex');

    // 11. Create lottery ticket with commission amounts
    const ticketResult = await client.query(
      `INSERT INTO lottery_tickets (player_id, vendor_id, round_id, draw_state, game_type, numbers, bet_amount, currency, platform_commission_amount, vendor_commission_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, created_at`,
      [playerId, vendorId, roundId, drawState, gameType, numbers, betAmount, currency, adminCommission, vendorNetAmount]
    );

    const ticket = ticketResult.rows[0];

    // 12. Create bet_payment transaction for player
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

    // 13. Credit vendor with NET amount (betAmount minus admin commission)
    await client.query(
      `UPDATE vendors SET
         total_tickets_sold = total_tickets_sold + 1,
         total_revenue = total_revenue + $1,
         available_balance = available_balance + $2
       WHERE id = $3`,
      [betAmount, vendorNetAmount, vendorId]
    );

    // 14. Create bet_received transaction for vendor (net amount)
    const vendorUserResult = await client.query(
      `SELECT user_id FROM vendors WHERE id = $1`,
      [vendorId]
    );
    if (vendorUserResult.rows.length > 0) {
      const betRecvKey = `bet_recv_${ticket.id}`;
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, payment_method, status, description, ticket_id, vendor_id, idempotency_key)
         VALUES ($1, 'commission', $2, $3, 'system', 'completed', $4, $5, $6, $7)`,
        [
          vendorUserResult.rows[0].user_id,
          vendorNetAmount,
          currency,
          `Bet received (net after ${systemCommissionRate * 100}% commission): ${gameType.toUpperCase()} on ${drawState}`,
          ticket.id,
          vendorId,
          betRecvKey,
        ]
      );

      // 15. Create admin_commission transaction immediately (commission secured at bet time)
      const commKey = `admin_comm_${ticket.id}`;
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, payment_method, status, description, ticket_id, vendor_id, idempotency_key)
         VALUES ($1, 'admin_commission', $2, $3, 'system', 'completed', $4, $5, $6, $7)`,
        [
          vendorUserResult.rows[0].user_id,
          adminCommission,
          currency,
          `Admin commission (${systemCommissionRate * 100}%) on ${gameType.toUpperCase()} bet of ${betAmount} ${currency}`,
          ticket.id,
          vendorId,
          commKey,
        ]
      );
    }

    // 16. Update round stats (track admin commission incrementally)
    await client.query(
      `UPDATE lottery_rounds SET
         total_bets = total_bets + $1,
         total_tickets = total_tickets + 1,
         admin_commission_total = COALESCE(admin_commission_total, 0) + $2
       WHERE id = $3`,
      [betAmount, adminCommission, roundId]
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

    // 15b. Auto-stop numbers that reach the global threshold (default $1000)
    try {
      const thresholdResult = await client.query(
        `SELECT value FROM app_settings WHERE key = 'number_auto_stop_threshold'`
      );
      const autoStopThreshold = thresholdResult.rows.length > 0
        ? parseFloat(thresholdResult.rows[0].value)
        : 1000;

      for (const num of numbers) {
        const formattedNumber = num.toString().padStart(2, '0');
        await client.query(
          `UPDATE number_limits SET is_stopped = TRUE
           WHERE vendor_id = $1 AND draw_state = $2 AND number = $3
           AND (draw_date = CURRENT_DATE OR draw_date IS NULL)
           AND current_total >= $4 AND is_stopped = FALSE`,
          [vendorId, drawState, formattedNumber, autoStopThreshold]
        );
      }
    } catch (autoStopErr) {
      // Non-fatal: auto-stop is optional
      console.error('[AutoStop] Error checking threshold:', autoStopErr);
    }

    // Send notifications (non-blocking)
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
      `A ${gameType.toUpperCase()} ticket (${betAmount} ${currency}) was purchased. Net ${vendorNetAmount} ${currency} credited (${systemCommissionRate * 100}% commission deducted).`
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
 * - Admin commission is already deducted at bet placement time (not here)
 * - Admin distributes winnings to player wallets
 * - Winners get notified with amounts
 */
export async function publishResults(
  drawState: string,
  winningNumbers: Record<string, number[]>,
  publishedBy: string,
  drawDate?: string,
  drawTime: string = 'midday'
) {
  return withTransaction(async (client) => {
    const targetDate = drawDate || new Date().toISOString().split('T')[0];
    const targetDrawTime = drawTime;

    // 1. Find the open/closed round for this state+date+drawTime (or auto-create one)
    const roundResult = await client.query(
      `SELECT id, draw_state, status, total_bets, total_tickets
       FROM lottery_rounds
       WHERE draw_state = $1 AND draw_date = $2 AND draw_time = $3 AND status IN ('open', 'closed')
       ORDER BY created_at DESC LIMIT 1`,
      [drawState, targetDate, targetDrawTime]
    );

    let round;
    if (roundResult.rows.length === 0) {
      // Auto-create a round so admin can publish results even without a pre-existing round
      const created = await client.query(
        `INSERT INTO lottery_rounds (draw_state, draw_date, draw_time, status, opened_at)
         VALUES ($1, $2, $3, 'open', NOW())
         ON CONFLICT (draw_state, draw_date, draw_time) DO UPDATE SET status = lottery_rounds.status
         RETURNING id, draw_state, status, total_bets, total_tickets`,
        [drawState, targetDate, targetDrawTime]
      );
      round = created.rows[0];
    } else {
      round = roundResult.rows[0];
    }
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

    // 3. Store winning numbers and mark completed
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

    // 6. Check each ticket for wins using vendor-specific payout multipliers.
    // For senp, support multi-position winning numbers (1st, 2nd, 3rd prizes).
    const winners: Array<typeof tickets.rows[0] & { winAmount: number; usedMultiplier: number }> = [];
    const losers: typeof tickets.rows = [];

    // Cache vendor payout multipliers to avoid repeated DB queries
    const vendorMultipliersCache: Record<string, Record<string, number>> = {};

    async function getVendorMultipliers(vendorId: string): Promise<Record<string, number>> {
      if (vendorMultipliersCache[vendorId]) return vendorMultipliersCache[vendorId];
      try {
        const vmResult = await client.query(
          'SELECT payout_multipliers FROM vendors WHERE id = $1',
          [vendorId]
        );
        if (vmResult.rows.length > 0 && vmResult.rows[0].payout_multipliers) {
          const val = vmResult.rows[0].payout_multipliers;
          vendorMultipliersCache[vendorId] = typeof val === 'string' ? JSON.parse(val) : val;
          return vendorMultipliersCache[vendorId];
        }
      } catch { /* fall through to global defaults */ }
      // Fall back to global win_multipliers converted to the new key format
      vendorMultipliersCache[vendorId] = {
        senp_1st: winMultipliers['senp'] || 50,
        senp_2nd: Math.round((winMultipliers['senp'] || 50) / 3),
        senp_3rd: Math.round((winMultipliers['senp'] || 50) / 6),
        maryaj: winMultipliers['maryaj'] || 100,
        loto3: winMultipliers['loto3'] || 500,
        loto4: winMultipliers['loto4'] || 5000,
        loto5: winMultipliers['loto5'] || 50000,
      };
      return vendorMultipliersCache[vendorId];
    }

    for (const ticket of tickets.rows) {
      const gameWinningNums = winningNumbers[ticket.game_type];
      if (!gameWinningNums) {
        losers.push(ticket);
        continue;
      }

      const vMults = await getVendorMultipliers(ticket.vendor_id);

      if (ticket.game_type === 'senp') {
        // Senp: check ticket's single number against each winning position
        const position = checkSenpPosition(ticket.numbers[0], gameWinningNums);
        if (position >= 0) {
          const multKey = position === 0 ? 'senp_1st' : position === 1 ? 'senp_2nd' : 'senp_3rd';
          const multiplier = vMults[multKey] || winMultipliers['senp'] || 50;
          const winAmount = Math.round(parseFloat(ticket.bet_amount) * multiplier * 100) / 100;
          winners.push({ ...ticket, winAmount, usedMultiplier: multiplier });
        } else {
          losers.push(ticket);
        }
      } else {
        // maryaj, loto3-5: standard exact match
        if (checkWin(ticket.game_type, ticket.numbers, gameWinningNums)) {
          const multiplier = vMults[ticket.game_type] || winMultipliers[ticket.game_type] || 1;
          const winAmount = Math.round(parseFloat(ticket.bet_amount) * multiplier * 100) / 100;
          winners.push({ ...ticket, winAmount, usedMultiplier: multiplier });
        } else {
          losers.push(ticket);
        }
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
    const vendorCurrencies: Record<string, string> = {}; // vendorId → currency
    const vendorBets: Record<string, number> = {}; // vendorId → total bets collected (for must-send calc)

    for (const ticket of tickets.rows) {
      vendorBets[ticket.vendor_id] = (vendorBets[ticket.vendor_id] || 0) + parseFloat(ticket.bet_amount);
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
          `Won ${winner.game_type.toUpperCase()} - ${drawState}: ${winner.usedMultiplier}x payout = $${winAmount.toFixed(2)}`,
          winner.id,
          winner.vendor_id,
        ]
      );

      // Track vendor payout totals
      vendorPayouts[winner.vendor_id] = (vendorPayouts[winner.vendor_id] || 0) + winAmount;
      vendorCurrencies[winner.vendor_id] = winner.currency;
      totalPayouts += winAmount;

      // Notify winner
      notificationService.createPlayerNotification(
        winner.player_id,
        'win',
        'Congratulations! You Won!',
        `Your ${winner.game_type.toUpperCase()} bet on ${drawState} won $${winAmount.toFixed(2)} (${winner.usedMultiplier}x multiplier)!`,
        { ticketId: winner.id, winAmount, gameType: winner.game_type, multiplier: winner.usedMultiplier }
      );
    }

    // 9. Deduct winner payouts from each vendor's balance (vendor pays winners)
    for (const [vid, payoutAmount] of Object.entries(vendorPayouts)) {
      if (payoutAmount > 0) {
        // Deduct payout — vendor can go negative but we warn on excessive debt
        const balResult = await client.query(
          `UPDATE vendors SET available_balance = available_balance - $1 WHERE id = $2
           RETURNING available_balance`,
          [payoutAmount, vid]
        );

        // Warn vendor if balance goes significantly negative
        const newBalance = parseFloat(balResult.rows[0]?.available_balance || '0');
        if (newBalance < -10000) {
          notificationService.createVendorNotification(
            vid,
            'balance_warning',
            'High Debt Warning',
            `Your balance is ${newBalance.toFixed(2)}. Please contact admin to resolve your debt.`
          );
        }

        // Create payout deduction transaction for vendor
        const vendorUserResult = await client.query(
          `SELECT user_id FROM vendors WHERE id = $1`,
          [vid]
        );
        if (vendorUserResult.rows.length > 0) {
          const vendorCurrency = vendorCurrencies[vid] || 'HTG';
          await client.query(
            `INSERT INTO transactions (user_id, type, amount, currency, status, description, vendor_id)
             VALUES ($1, 'winning_payout', $2, $3, 'completed', $4, $5)`,
            [
              vendorUserResult.rows[0].user_id,
              payoutAmount,
              vendorCurrency,
              `Winner payouts for ${drawState} round (${targetDate})`,
              vid,
            ]
          );
        }

        // Notify vendor about payouts
        const vendorCurrencySymbol = (vendorCurrencies[vid] || 'HTG') === 'USD' ? '$' : 'G';
        notificationService.createVendorNotification(
          vid,
          'payout_deduction',
          'Winner Payouts Deducted',
          `${vendorCurrencySymbol}${payoutAmount.toFixed(2)} deducted from your balance for winner payouts in ${drawState} (${targetDate}).`
        );
      }
    }

    // 10. Update round with final payout stats (admin_commission_total already tracked at bet time)
    await client.query(
      `UPDATE lottery_rounds SET
         total_payouts = $1,
         winner_count = $2
       WHERE id = $3`,
      [totalPayouts, winners.length, roundId]
    );

    // 11. Vendor "must send" — if payouts owed exceed bets collected, the vendor
    //     owes the platform the difference.
    for (const [vid, payoutAmount] of Object.entries(vendorPayouts)) {
      const collected = vendorBets[vid] || 0;
      const owed = payoutAmount - collected;
      if (owed > 0.005) {
        try {
          await client.query(
            `INSERT INTO vendor_must_send
              (vendor_id, draw_id, amount, currency, status, notes)
             VALUES ($1, $2, $3, $4, 'pending', $5)`,
            [
              vid,
              roundId,
              Math.round(owed * 100) / 100,
              (vendorCurrencies[vid] || 'HTG') === 'USD' ? 'USD' : 'HTG',
              `Auto-generated for ${drawState} (${targetDate}): payouts ${payoutAmount.toFixed(2)} − bets ${collected.toFixed(2)}`,
            ]
          );
          notificationService.createVendorNotification(
            vid,
            'must_send',
            'Action required: send funds',
            `Your ${drawState} round had ${owed.toFixed(2)} more in winnings than bets. Please send the difference to the platform.`
          );
          notificationService.notifyAdmins(
            'must_send_created',
            'Vendor must-send generated',
            `Vendor owes ${owed.toFixed(2)} from ${drawState} (${targetDate}).`,
            { role: 'system' },
            { vendorId: vid, roundId, owed }
          ).catch(() => {});
        } catch { /* table may be missing on legacy installs */ }
      }
    }

    return {
      roundId,
      drawState,
      drawDate: targetDate,
      winningNumbers,
      totalTickets: tickets.rows.length,
      winnerCount: winners.length,
      totalBets: parseFloat(round.total_bets || '0'),
      totalPayouts,
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
    `lr.id IN (SELECT DISTINCT round_id FROM lottery_tickets WHERE vendor_id = $1)`
  ];
  const values: any[] = [vendorId];
  let paramIndex = 2;

  if (filters?.status) {
    conditions.push(`lr.status = $${paramIndex++}`);
    values.push(filters.status);
  }
  if (filters?.date) {
    conditions.push(`lr.draw_date = $${paramIndex++}`);
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
 * - MARYAJ: ticket has 2 numbers (a pair); winning has 6 numbers = 3 pairs
 *   [fp,sp, fp,tp, sp,tp]. Player wins if their pair matches ANY winning pair
 *   (order within the pair matters).
 * - LOTO3-5: 3-5 digits (0-9) must match in exact order
 */
function checkWin(gameType: string, ticketNumbers: number[], winningNumbers: number[]): boolean {
  if (gameType === 'maryaj') {
    // Winning numbers: [fp,sp, fp,tp, sp,tp] = 3 sequential pairs
    // Ticket numbers: [a, b] = 1 pair
    if (ticketNumbers.length !== 2) return false;
    const [ta, tb] = ticketNumbers;
    for (let i = 0; i + 1 < winningNumbers.length; i += 2) {
      if (winningNumbers[i] === ta && winningNumbers[i + 1] === tb) return true;
    }
    return false;
  }

  if (ticketNumbers.length !== winningNumbers.length) return false;

  // All numbers must match in order
  for (let i = 0; i < ticketNumbers.length; i++) {
    if (ticketNumbers[i] !== winningNumbers[i]) return false;
  }

  return true;
}

/**
 * For senp with multi-position winning numbers (1st, 2nd, 3rd):
 * Returns the prize position (0=1st, 1=2nd, 2=3rd) or -1 if no match.
 * Ticket has 1 number; winning numbers may have 1-3 numbers for different positions.
 */
function checkSenpPosition(ticketNumber: number, winningNumbers: number[]): number {
  for (let i = 0; i < winningNumbers.length; i++) {
    if (ticketNumber === winningNumbers[i]) return i;
  }
  return -1;
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
