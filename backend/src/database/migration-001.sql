-- ============================================
-- Migration 001: Add brute-force protection columns,
-- rename moonpay → moncash, narrow ENUMs, add email_verifications
-- Run this against the LIVE database on Render.
-- ============================================

-- 1. Add brute-force protection columns to users (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_failed_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Rename moonpay_transaction_id → moncash_transaction_id in transactions table (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'moonpay_transaction_id'
  ) THEN
    ALTER TABLE transactions RENAME COLUMN moonpay_transaction_id TO moncash_transaction_id;
  END IF;
END $$;

-- 3. Create email_verifications table if not exists
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add moncash to payment_method_type enum if it doesn't exist
-- (We can't easily remove old values from PG enums, but we can add missing ones)
DO $$
BEGIN
  -- Check if 'moncash' exists in enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'moncash'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method_type')
  ) THEN
    ALTER TYPE payment_method_type ADD VALUE IF NOT EXISTS 'moncash';
  END IF;
EXCEPTION
  WHEN others THEN NULL; -- enum might not exist yet
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'moncash'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payout_method_type')
  ) THEN
    ALTER TYPE payout_method_type ADD VALUE IF NOT EXISTS 'moncash';
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 5. Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 001 completed successfully.';
  RAISE NOTICE 'Verify: SELECT column_name FROM information_schema.columns WHERE table_name = ''users'' AND column_name IN (''failed_login_attempts'', ''last_failed_login'');';
END $$;
