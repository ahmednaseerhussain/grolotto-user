-- ============================================
-- Migration 014 — Manual payment orders (Zelle, CashApp, PayPal,
-- Bank Transfer, Stripe).
--
-- Players create a payment order; admin verifies the off-platform
-- transfer (or Stripe webhook completes it) and the wallet is credited.
-- ============================================

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('HTG','USD')),
  payment_method VARCHAR(32) NOT NULL CHECK (
    payment_method IN ('zelle','cashapp','stripe','paypal','bank_transfer')
  ),
  gift_card_amount NUMERIC(14,2),
  stripe_payment_intent_id VARCHAR(128),
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','approved','rejected','cancelled')
  ),
  admin_notes TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created ON payment_orders(created_at DESC);
