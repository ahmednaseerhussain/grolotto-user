-- ============================================
-- Migration 002: Rewards, Notifications, Commission tracking, DOB enforcement
-- Run against Neon DB after migration-001
-- ============================================

-- ============================================
-- 1. REWARDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'welcome_bonus', 'daily_spin', 'first_deposit', 'referral', 'loyalty'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency currency_type DEFAULT 'HTG',
    status VARCHAR(20) NOT NULL DEFAULT 'available', -- 'available', 'claimed', 'expired'
    expires_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON rewards(status);
CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(type);

-- ============================================
-- 2. PLAYER NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS player_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'bet_placed', 'win', 'deposit', 'reward', 'system'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_notifications_user ON player_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_player_notifications_read ON player_notifications(is_read);

-- ============================================
-- 3. ADD platform_commission_total TO lottery_rounds
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_rounds' AND column_name = 'platform_commission_total'
  ) THEN
    ALTER TABLE lottery_rounds ADD COLUMN platform_commission_total DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END $$;

-- ============================================
-- 4. ADD vendor_commission_amount TO lottery_tickets
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_tickets' AND column_name = 'vendor_commission_amount'
  ) THEN
    ALTER TABLE lottery_tickets ADD COLUMN vendor_commission_amount DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END $$;

-- ============================================
-- 5. ADD platform_commission_amount TO lottery_tickets
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_tickets' AND column_name = 'platform_commission_amount'
  ) THEN
    ALTER TABLE lottery_tickets ADD COLUMN platform_commission_amount DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END $$;

-- ============================================
-- 6. ADD draw_date TO number_limits for daily scoping
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'number_limits' AND column_name = 'draw_date'
  ) THEN
    ALTER TABLE number_limits ADD COLUMN draw_date DATE DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Drop old unique constraint and create new one including draw_date
-- (only if the old one exists and new one doesn't)
DO $$
BEGIN
  -- Check if old constraint exists (without draw_date)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'number_limits_vendor_id_draw_state_number_key'
  ) THEN
    ALTER TABLE number_limits DROP CONSTRAINT number_limits_vendor_id_draw_state_number_key;
    ALTER TABLE number_limits ADD CONSTRAINT number_limits_vendor_draw_number_date_key
      UNIQUE (vendor_id, draw_state, number, draw_date);
  END IF;
END $$;

-- ============================================
-- 7. FIX allowed_states: remove 'MA' (not in draw_state enum)
-- ============================================

UPDATE app_settings
SET value = '["GA", "NY", "FL", "CT", "NJ", "TX", "PA", "TN"]'
WHERE key = 'allowed_states' AND value::text LIKE '%MA%';

-- ============================================
-- 8. ADD currency column to vendor_payouts if missing
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_payouts' AND column_name = 'currency'
  ) THEN
    ALTER TABLE vendor_payouts ADD COLUMN currency currency_type DEFAULT 'HTG';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables were created
SELECT 'rewards' as entity, COUNT(*) as row_count FROM rewards
UNION ALL
SELECT 'player_notifications', COUNT(*) FROM player_notifications;

-- Verify new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('lottery_rounds', 'lottery_tickets', 'number_limits', 'vendor_payouts')
  AND column_name IN ('platform_commission_total', 'vendor_commission_amount', 'platform_commission_amount', 'draw_date', 'currency')
ORDER BY table_name, column_name;
