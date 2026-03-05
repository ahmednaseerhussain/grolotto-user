-- Migration 007: Gift Cards system
-- Users can purchase gift cards and share codes with friends to redeem

CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(16) UNIQUE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'HTG',
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, redeemed, expired, cancelled
  purchased_by UUID REFERENCES users(id),
  redeemed_by UUID REFERENCES users(id),
  recipient_name VARCHAR(100),
  message TEXT,
  purchased_at TIMESTAMP DEFAULT NOW(),
  redeemed_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 year'),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchased_by ON gift_cards(purchased_by);
CREATE INDEX IF NOT EXISTS idx_gift_cards_redeemed_by ON gift_cards(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
