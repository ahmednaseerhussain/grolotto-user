-- ============================================
-- Migration 003: Vendor-Owned Lottery Rounds with Pool-Based Payouts
-- 
-- Business model change:
--   - Rounds are now per-vendor (vendor owns a lottery)
--   - Vendor publishes results (decides winning numbers)
--   - Pool-based payouts: 80% of bets → prize pool, 10% vendor, 10% platform
--   - Winners split pool equally; if no winners, vendor keeps pool
-- ============================================

-- ============================================
-- 1. ADD vendor_id TO lottery_rounds
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_rounds' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE lottery_rounds ADD COLUMN vendor_id UUID REFERENCES vendors(id);
  END IF;
END $$;

-- ============================================
-- 2. ADD prize_pool TO lottery_rounds
--    (80% of total_bets goes to prize pool for winners)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_rounds' AND column_name = 'prize_pool'
  ) THEN
    ALTER TABLE lottery_rounds ADD COLUMN prize_pool DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END $$;

-- ============================================
-- 3. ADD vendor_commission_total TO lottery_rounds
--    (10% of total_bets goes to vendor)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_rounds' AND column_name = 'vendor_commission_total'
  ) THEN
    ALTER TABLE lottery_rounds ADD COLUMN vendor_commission_total DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END $$;

-- ============================================
-- 4. ADD vendor_profit TO lottery_rounds
--    (pool amount kept by vendor when no winners)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_rounds' AND column_name = 'vendor_profit'
  ) THEN
    ALTER TABLE lottery_rounds ADD COLUMN vendor_profit DECIMAL(12,2) DEFAULT 0.00;
  END IF;
END $$;

-- ============================================
-- 5. ADD winner_count TO lottery_rounds
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_rounds' AND column_name = 'winner_count'
  ) THEN
    ALTER TABLE lottery_rounds ADD COLUMN winner_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 6. UPDATE existing rounds: backfill vendor_id from tickets
--    Each existing round gets the vendor_id of its first ticket
-- ============================================
UPDATE lottery_rounds lr
SET vendor_id = (
  SELECT lt.vendor_id
  FROM lottery_tickets lt
  WHERE lt.round_id = lr.id
  LIMIT 1
)
WHERE lr.vendor_id IS NULL;

-- ============================================
-- 7. DROP old UNIQUE constraint and create new one including vendor_id
--    Old: UNIQUE(draw_state, draw_date, draw_time)
--    New: UNIQUE(vendor_id, draw_state, draw_date, draw_time)
-- ============================================
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lottery_rounds_draw_state_draw_date_draw_time_key'
  ) THEN
    ALTER TABLE lottery_rounds DROP CONSTRAINT lottery_rounds_draw_state_draw_date_draw_time_key;
  END IF;

  -- Create new constraint including vendor_id (only if it doesn't exist)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lottery_rounds_vendor_state_date_time_key'
  ) THEN
    ALTER TABLE lottery_rounds ADD CONSTRAINT lottery_rounds_vendor_state_date_time_key
      UNIQUE (vendor_id, draw_state, draw_date, draw_time);
  END IF;
END $$;

-- ============================================
-- 8. ADD INDEX on vendor_id for fast round lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_lottery_rounds_vendor ON lottery_rounds(vendor_id);

-- ============================================
-- 9. BACKFILL prize_pool and commissions for existing completed rounds
-- ============================================
UPDATE lottery_rounds
SET prize_pool = total_bets * 0.80,
    vendor_commission_total = total_bets * 0.10
WHERE status = 'completed' AND prize_pool = 0 AND total_bets > 0;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'lottery_rounds'
  AND column_name IN ('vendor_id', 'prize_pool', 'vendor_commission_total', 'vendor_profit', 'winner_count')
ORDER BY column_name;
