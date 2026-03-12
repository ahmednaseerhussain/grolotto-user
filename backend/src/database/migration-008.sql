-- Migration 008: Add vendor-specific payout multipliers
-- Each vendor can set their own payout rates per game type.
-- Falls back to global app_settings.win_multipliers if not set.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payout_multipliers JSONB;

-- Example value: {"senp_1st": 60, "senp_2nd": 20, "senp_3rd": 10, "maryaj": 800, "loto3": 700, "loto4": 4000, "loto5": 30000}
-- NULL means use the global default from app_settings.win_multipliers
COMMENT ON COLUMN vendors.payout_multipliers IS 'Vendor-specific payout multipliers per game type. NULL = use global defaults.';
