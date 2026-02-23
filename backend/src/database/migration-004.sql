-- ============================================
-- Migration 004: Vendor-Funded, Admin-Published Lottery Model
-- 
-- REVERSES per-vendor rounds from migration-003.
-- NEW business model:
--   - 100% of player's bet goes to vendor's balance (no commission split at bet time)
--   - Rounds are GLOBAL per state+date (not per-vendor)
--   - Admin publishes winning numbers globally per state per day
--   - Winners get multiplier-based payouts (from app_settings.win_multipliers)
--   - Vendor pays winner payouts from their balance (can go negative/debt)
--   - Admin takes 10% commission from vendor after each round
--   - vendor_id on lottery_rounds becomes nullable (global rounds)
-- ============================================

-- ============================================
-- 1. DROP per-vendor UNIQUE constraint, restore global UNIQUE
-- ============================================
DO $$
BEGIN
  -- Drop per-vendor constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lottery_rounds_vendor_state_date_time_key'
  ) THEN
    ALTER TABLE lottery_rounds DROP CONSTRAINT lottery_rounds_vendor_state_date_time_key;
  END IF;

  -- Restore global constraint (one round per state+date+time)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lottery_rounds_draw_state_draw_date_draw_time_key'
  ) THEN
    ALTER TABLE lottery_rounds ADD CONSTRAINT lottery_rounds_draw_state_draw_date_draw_time_key
      UNIQUE (draw_state, draw_date, draw_time);
  END IF;
END $$;

-- ============================================
-- 2. MAKE vendor_id NULLABLE (rounds are global, not vendor-owned)
-- ============================================
ALTER TABLE lottery_rounds ALTER COLUMN vendor_id DROP NOT NULL;
-- Set vendor_id to NULL on all rounds (rounds are now global)
UPDATE lottery_rounds SET vendor_id = NULL;

-- ============================================
-- 3. ADD admin_commission_total column
--    (10% from each vendor after round completes)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_rounds' AND column_name = 'admin_commission_total'
  ) THEN
    ALTER TABLE lottery_rounds ADD COLUMN admin_commission_total DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END $$;

-- ============================================
-- 4. MERGE duplicate rounds (per-vendor → global)
--    If migration-003 created multiple rounds for same state+date+time,
--    we need to merge them into one global round.
--    Strategy: Keep the earliest round per (draw_state, draw_date, draw_time),
--    reassign tickets from duplicate rounds to the kept round,
--    then delete duplicates.
-- ============================================
DO $$
DECLARE
  dup RECORD;
  keep_id UUID;
BEGIN
  -- For each group of rounds with same state+date+time, keep earliest
  FOR dup IN
    SELECT draw_state, draw_date, draw_time, MIN(opened_at) as min_opened
    FROM lottery_rounds
    GROUP BY draw_state, draw_date, draw_time
    HAVING COUNT(*) > 1
  LOOP
    -- Get the round to keep (earliest opened)
    SELECT id INTO keep_id
    FROM lottery_rounds
    WHERE draw_state = dup.draw_state
      AND draw_date = dup.draw_date
      AND draw_time = dup.draw_time
      AND opened_at = dup.min_opened
    LIMIT 1;

    -- Reassign tickets from duplicate rounds to the kept round
    UPDATE lottery_tickets
    SET round_id = keep_id
    WHERE round_id IN (
      SELECT id FROM lottery_rounds
      WHERE draw_state = dup.draw_state
        AND draw_date = dup.draw_date
        AND draw_time = dup.draw_time
        AND id != keep_id
    );

    -- Delete duplicate rounds
    DELETE FROM lottery_rounds
    WHERE draw_state = dup.draw_state
      AND draw_date = dup.draw_date
      AND draw_time = dup.draw_time
      AND id != keep_id;

    -- Recalculate totals for merged round
    UPDATE lottery_rounds
    SET total_bets = COALESCE((
          SELECT SUM(bet_amount) FROM lottery_tickets WHERE round_id = keep_id
        ), 0),
        total_tickets = COALESCE((
          SELECT COUNT(*) FROM lottery_tickets WHERE round_id = keep_id
        ), 0),
        vendor_id = NULL
    WHERE id = keep_id;
  END LOOP;
END $$;

-- Also null out vendor_id on remaining single rounds
UPDATE lottery_rounds SET vendor_id = NULL WHERE vendor_id IS NOT NULL;

-- ============================================
-- 5. DROP vendor_id INDEX (no longer needed for round lookups)
-- ============================================
DROP INDEX IF EXISTS idx_lottery_rounds_vendor;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'lottery_rounds'
  AND column_name IN ('vendor_id', 'prize_pool', 'vendor_commission_total', 'admin_commission_total', 'vendor_profit', 'winner_count')
ORDER BY column_name;
