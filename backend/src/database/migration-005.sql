-- ============================================
-- Migration 005 — Admin data gaps
-- Fixes: transaction_type enum, new tables, seed data
-- ============================================

-- 1. Add 'admin_commission' to transaction_type enum
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'admin_commission';

-- 2. Create draw_configs table (reusable draw definitions)
CREATE TABLE IF NOT EXISTS draw_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state draw_state NOT NULL,
  name VARCHAR(100) NOT NULL,
  draw_time VARCHAR(20) NOT NULL,
  cutoff_time VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state, name)
);

-- 3. Create gift_card_batches table
CREATE TABLE IF NOT EXISTS gift_card_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quantity INTEGER NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency currency_type DEFAULT 'USD',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create gift_cards table
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES gift_card_batches(id) ON DELETE CASCADE,
  pin_code VARCHAR(20) UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency currency_type DEFAULT 'USD',
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_by UUID REFERENCES users(id),
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_pin ON gift_cards(pin_code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_batch ON gift_cards(batch_id);

-- 5. Seed draw_configs
INSERT INTO draw_configs (state, name, draw_time, cutoff_time, is_active) VALUES
  ('NY', 'New York Midday', '14:30', '14:00', TRUE),
  ('NY', 'New York Evening', '22:30', '22:00', TRUE),
  ('FL', 'Florida Midday', '13:30', '13:00', TRUE),
  ('GA', 'Georgia Midday', '12:29', '12:00', TRUE),
  ('CT', 'Connecticut Midday', '13:40', '13:10', TRUE),
  ('TX', 'Texas Day', '12:27', '12:00', TRUE),
  ('PA', 'Pennsylvania Midday', '13:00', '12:30', TRUE),
  ('TN', 'Tennessee Midday', '12:28', '12:00', TRUE),
  ('NJ', 'New Jersey Midday', '12:59', '12:30', TRUE)
ON CONFLICT (state, name) DO NOTHING;

-- 6. Seed missing app_settings keys
INSERT INTO app_settings (key, value, description) VALUES
  ('game_types', '[
    {"id":"senp","name":"senp","displayName":"Senp","isActive":true,"minPrice":0.25,"maxPrice":500,"isMandatory":true},
    {"id":"maryaj","name":"maryaj","displayName":"Maryaj","isActive":true,"minPrice":0.25,"maxPrice":500,"isMandatory":false},
    {"id":"loto3","name":"loto3","displayName":"Lotto 3","isActive":true,"minPrice":0.25,"maxPrice":500,"isMandatory":false},
    {"id":"loto4","name":"loto4","displayName":"Lotto 4","isActive":true,"minPrice":0.25,"maxPrice":500,"isMandatory":false},
    {"id":"loto5","name":"loto5","displayName":"Lotto 5","isActive":true,"minPrice":0.25,"maxPrice":500,"isMandatory":false}
  ]', 'Available game types configuration'),
  ('state_lotteries', '[
    {"id":"ny","state":"NY","fullName":"New York","abbreviation":"NY","isActive":true},
    {"id":"fl","state":"FL","fullName":"Florida","abbreviation":"FL","isActive":true},
    {"id":"ga","state":"GA","fullName":"Georgia","abbreviation":"GA","isActive":true},
    {"id":"ct","state":"CT","fullName":"Connecticut","abbreviation":"CT","isActive":true},
    {"id":"tx","state":"TX","fullName":"Texas","abbreviation":"TX","isActive":true},
    {"id":"pa","state":"PA","fullName":"Pennsylvania","abbreviation":"PA","isActive":true},
    {"id":"tn","state":"TN","fullName":"Tennessee","abbreviation":"TN","isActive":true},
    {"id":"nj","state":"NJ","fullName":"New Jersey","abbreviation":"NJ","isActive":true}
  ]', 'Available state lotteries'),
  ('payment_methods', '[
    {"id":"debit","name":"debit","displayName":"Debit Card","type":"accepting","icon":"credit-card","isActive":true},
    {"id":"moncash","name":"moncash","displayName":"MonCash","type":"accepting","icon":"phone","isActive":true},
    {"id":"natcash","name":"natcash","displayName":"NatCash","type":"accepting","icon":"phone","isActive":true},
    {"id":"gift_card","name":"gift_card","displayName":"Gift Card","type":"accepting","icon":"gift","isActive":true},
    {"id":"ach","name":"ach","displayName":"ACH Transfer","type":"payout","icon":"bank","isActive":true},
    {"id":"moncash_payout","name":"moncash_payout","displayName":"MonCash Payout","type":"payout","icon":"phone","isActive":true},
    {"id":"natcash_payout","name":"natcash_payout","displayName":"NatCash Payout","type":"payout","icon":"phone","isActive":true},
    {"id":"cash","name":"cash","displayName":"Cash","type":"payout","icon":"dollar-sign","isActive":true},
    {"id":"gift_card_payout","name":"gift_card_payout","displayName":"Gift Card","type":"payout","icon":"gift","isActive":true}
  ]', 'Payment and payout methods'),
  ('payment_configuration', '{"adminPercentage":15,"vendorCommission":5,"platformFee":0.50}', 'Admin commission and fee configuration'),
  ('app_features', '[
    {"id":"tchala","name":"tchala","displayName":"Tchala Dream Numbers","description":"Dream interpretation for lottery numbers","isEnabled":true,"targetApp":"both"},
    {"id":"live_results","name":"live_results","displayName":"Live Results","description":"Real-time lottery result updates","isEnabled":true,"targetApp":"both"},
    {"id":"push_notifications","name":"push_notifications","displayName":"Push Notifications","description":"Mobile push notification service","isEnabled":true,"targetApp":"both"},
    {"id":"commission_tracking","name":"commission_tracking","displayName":"Commission Tracking","description":"Vendor commission analytics","isEnabled":true,"targetApp":"vendor"},
    {"id":"ticket_scanner","name":"ticket_scanner","displayName":"Ticket Scanner","description":"QR/barcode ticket scanning","isEnabled":false,"targetApp":"vendor"},
    {"id":"player_rewards","name":"player_rewards","displayName":"Player Rewards","description":"Loyalty points and reward system","isEnabled":false,"targetApp":"player"}
  ]', 'Toggleable application features')
ON CONFLICT (key) DO NOTHING;
