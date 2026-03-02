-- Migration 006: Add operating_currency to vendors table
-- Allows vendors to choose HTG or USD as their operating currency

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'operating_currency'
  ) THEN
    ALTER TABLE vendors ADD COLUMN operating_currency VARCHAR(3) DEFAULT 'HTG';
  END IF;
END $$;
