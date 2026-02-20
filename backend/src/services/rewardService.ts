import { query, withTransaction } from '../database/pool';
import { AppError } from '../middleware/errorHandler';

export interface Reward {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string | null;
  claimedAt: string | null;
  createdAt: string;
}

/**
 * Get all rewards for a user.
 */
export async function getUserRewards(userId: string): Promise<Reward[]> {
  // Auto-expire any past-due rewards
  await query(
    `UPDATE rewards SET status = 'expired'
     WHERE user_id = $1 AND status = 'available' AND expires_at IS NOT NULL AND expires_at < NOW()`,
    [userId]
  );

  const result = await query(
    `SELECT id, user_id, type, title, description, amount, currency, status, expires_at, claimed_at, created_at
     FROM rewards WHERE user_id = $1
     ORDER BY
       CASE status WHEN 'available' THEN 0 WHEN 'claimed' THEN 1 ELSE 2 END,
       created_at DESC`,
    [userId]
  );

  return result.rows.map(mapReward);
}

/**
 * Claim a reward — credits the user's wallet.
 */
export async function claimReward(userId: string, rewardId: string): Promise<{ reward: Reward; newBalance: number }> {
  return withTransaction(async (client) => {
    // Lock the reward row
    const rewardResult = await client.query(
      `SELECT id, user_id, type, title, description, amount, currency, status, expires_at, claimed_at, created_at
       FROM rewards WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [rewardId, userId]
    );

    if (rewardResult.rows.length === 0) {
      throw new AppError('Reward not found', 404, 'REWARD_NOT_FOUND');
    }

    const reward = rewardResult.rows[0];

    if (reward.status === 'claimed') {
      throw new AppError('Reward already claimed', 400, 'REWARD_ALREADY_CLAIMED');
    }
    if (reward.status === 'expired') {
      throw new AppError('Reward has expired', 400, 'REWARD_EXPIRED');
    }
    if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
      await client.query(`UPDATE rewards SET status = 'expired' WHERE id = $1`, [rewardId]);
      throw new AppError('Reward has expired', 400, 'REWARD_EXPIRED');
    }

    // Mark as claimed
    await client.query(
      `UPDATE rewards SET status = 'claimed', claimed_at = NOW() WHERE id = $1`,
      [rewardId]
    );

    // Credit wallet
    const balanceField = reward.currency === 'USD' ? 'balance_usd' : 'balance_htg';
    const walletResult = await client.query(
      `UPDATE wallets SET ${balanceField} = ${balanceField} + $1
       WHERE user_id = $2
       RETURNING ${balanceField} as new_balance`,
      [reward.amount, userId]
    );

    if (walletResult.rows.length === 0) {
      throw new AppError('Wallet not found', 404);
    }

    // Create transaction
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, currency, payment_method, status, description, idempotency_key)
       VALUES ($1, 'deposit', $2, $3, 'reward', 'completed', $4, $5)`,
      [userId, reward.amount, reward.currency, `Reward: ${reward.title}`, `reward_${rewardId}`]
    );

    const updatedReward = await client.query(
      `SELECT id, user_id, type, title, description, amount, currency, status, expires_at, claimed_at, created_at
       FROM rewards WHERE id = $1`,
      [rewardId]
    );

    return {
      reward: mapReward(updatedReward.rows[0]),
      newBalance: parseFloat(walletResult.rows[0].new_balance),
    };
  });
}

/**
 * Create a welcome bonus for a new user (called on registration).
 */
export async function createWelcomeBonus(userId: string): Promise<void> {
  try {
    await query(
      `INSERT INTO rewards (user_id, type, title, description, amount, currency, status, expires_at)
       VALUES ($1, 'welcome_bonus', 'Welcome Bonus', 'Welcome to GRO Lotto! Claim your signup bonus.', 50, 'HTG', 'available', NOW() + INTERVAL '30 days')`,
      [userId]
    );
  } catch (error) {
    // Non-critical — don't block registration if reward creation fails
    console.error('Failed to create welcome bonus:', error);
  }
}

/**
 * Check and create daily reward if not already given today.
 */
export async function checkAndCreateDailyReward(userId: string): Promise<void> {
  try {
    const existing = await query(
      `SELECT id FROM rewards
       WHERE user_id = $1 AND type = 'daily_spin' AND created_at::date = CURRENT_DATE`,
      [userId]
    );

    if (existing.rows.length === 0) {
      // Random daily amount between 5 and 25 HTG
      const amount = Math.floor(Math.random() * 21) + 5;
      await query(
        `INSERT INTO rewards (user_id, type, title, description, amount, currency, status, expires_at)
         VALUES ($1, 'daily_spin', 'Daily Bonus', 'Your daily lottery bonus! Come back tomorrow for more.', $2, 'HTG', 'available', NOW() + INTERVAL '24 hours')`,
        [userId, amount]
      );
    }
  } catch (error) {
    console.error('Failed to create daily reward:', error);
  }
}

/**
 * Create first-deposit bonus reward.
 */
export async function createFirstDepositBonus(userId: string, depositAmount: number): Promise<void> {
  try {
    // Check if first deposit bonus already given
    const existing = await query(
      `SELECT id FROM rewards WHERE user_id = $1 AND type = 'first_deposit'`,
      [userId]
    );
    if (existing.rows.length > 0) return;

    // Check if this is user's first deposit
    const depositCount = await query(
      `SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = 'deposit' AND status = 'completed'`,
      [userId]
    );
    if (parseInt(depositCount.rows[0].count) > 1) return; // Not first deposit

    const bonusAmount = Math.round(depositAmount * 0.20); // 20% bonus
    if (bonusAmount <= 0) return;

    await query(
      `INSERT INTO rewards (user_id, type, title, description, amount, currency, status, expires_at)
       VALUES ($1, 'first_deposit', 'First Deposit Bonus', '20% bonus on your first deposit!', $2, 'HTG', 'available', NOW() + INTERVAL '7 days')`,
      [userId, bonusAmount]
    );
  } catch (error) {
    console.error('Failed to create first deposit bonus:', error);
  }
}

function mapReward(r: any): Reward {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    description: r.description,
    amount: parseFloat(r.amount),
    currency: r.currency,
    status: r.status,
    expiresAt: r.expires_at,
    claimedAt: r.claimed_at,
    createdAt: r.created_at,
  };
}
