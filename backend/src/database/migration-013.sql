-- Migration 013: Multi-method vendor payouts (Zelle, Cash App, PayPal)
-- Adds new payout method enum values + corresponding detail columns on vendor_payouts

-- Add new enum values (must be committed before usage; Postgres supports ALTER TYPE ADD VALUE)
ALTER TYPE payout_method_type ADD VALUE IF NOT EXISTS 'bank_transfer';
ALTER TYPE payout_method_type ADD VALUE IF NOT EXISTS 'zelle';
ALTER TYPE payout_method_type ADD VALUE IF NOT EXISTS 'cashapp';
ALTER TYPE payout_method_type ADD VALUE IF NOT EXISTS 'paypal';

-- Add method-specific detail columns
ALTER TABLE vendor_payouts
    ADD COLUMN IF NOT EXISTS zelle_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS zelle_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cashapp_tag VARCHAR(100),
    ADD COLUMN IF NOT EXISTS paypal_email VARCHAR(255);
