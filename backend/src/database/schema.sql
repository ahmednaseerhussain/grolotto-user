-- ============================================
-- GROLOTTO PostgreSQL Schema
-- Production-ready lottery system database
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('player', 'vendor', 'admin');
CREATE TYPE vendor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'active');
CREATE TYPE payout_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE transaction_type AS ENUM ('bet_payment', 'winning_payout', 'deposit', 'withdrawal', 'commission');
CREATE TYPE payment_method_type AS ENUM ('moncash');
CREATE TYPE payout_method_type AS ENUM ('moncash');
CREATE TYPE game_type AS ENUM ('senp', 'maryaj', 'loto3', 'loto4', 'loto5');
CREATE TYPE draw_state AS ENUM ('NY', 'FL', 'GA', 'TX', 'PA', 'CT', 'TN', 'NJ');
CREATE TYPE ticket_status AS ENUM ('pending', 'won', 'lost');
CREATE TYPE currency_type AS ENUM ('USD', 'HTG');
CREATE TYPE ad_type AS ENUM ('slideshow', 'banner', 'popup');
CREATE TYPE ad_status AS ENUM ('active', 'paused', 'scheduled', 'expired');
CREATE TYPE ad_audience AS ENUM ('all', 'new_players', 'active_players');
CREATE TYPE ad_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE document_type AS ENUM ('id_card', 'business_license');
CREATE TYPE lottery_round_status AS ENUM ('open', 'closed', 'drawing', 'completed');

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'player',
    phone VARCHAR(50),
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Haiti',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    refresh_token TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- EMAIL VERIFICATIONS
-- ============================================

CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);

-- ============================================
-- WALLETS TABLE
-- ============================================

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance_usd DECIMAL(12,2) DEFAULT 0.00 CHECK (balance_usd >= 0),
    balance_htg DECIMAL(12,2) DEFAULT 0.00 CHECK (balance_htg >= 0),
    total_deposited DECIMAL(12,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12,2) DEFAULT 0.00,
    total_won DECIMAL(12,2) DEFAULT 0.00,
    total_bet DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- ============================================
-- VENDORS TABLE (extends users)
-- ============================================

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    business_name VARCHAR(255),
    display_name VARCHAR(255),
    status vendor_status DEFAULT 'pending',
    application_date TIMESTAMPTZ DEFAULT NOW(),
    approved_date TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Profile
    bio TEXT,
    location VARCHAR(255),
    business_hours VARCHAR(255),
    specialties TEXT[], -- PostgreSQL array
    website VARCHAR(255),
    facebook VARCHAR(255),
    instagram VARCHAR(255),
    profile_image VARCHAR(500),
    banner_image VARCHAR(500),

    -- Financial
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    available_balance DECIMAL(12,2) DEFAULT 0.00,
    commission_rate DECIMAL(4,2) DEFAULT 0.10, -- 10% default commission

    -- Metrics
    total_players INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_tickets_sold INTEGER DEFAULT 0,

    -- Admin
    notes TEXT,
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    operating_currency VARCHAR(3) DEFAULT 'HTG',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_status ON vendors(status);

-- ============================================
-- VENDOR DOCUMENTS
-- ============================================

CREATE TABLE vendor_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    doc_type document_type NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_documents_vendor_id ON vendor_documents(vendor_id);

-- ============================================
-- DRAW CONFIGURATIONS (per vendor per state)
-- ============================================

CREATE TABLE vendor_draw_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    draw_state draw_state NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, draw_state)
);

CREATE INDEX idx_vendor_draw_configs_vendor ON vendor_draw_configs(vendor_id);

-- ============================================
-- GAME CONFIGURATIONS (per vendor draw per game type)
-- ============================================

CREATE TABLE vendor_game_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_config_id UUID NOT NULL REFERENCES vendor_draw_configs(id) ON DELETE CASCADE,
    game_type game_type NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    min_amount DECIMAL(10,2) DEFAULT 1.00,
    max_amount DECIMAL(10,2) DEFAULT 100.00,
    UNIQUE(draw_config_id, game_type)
);

CREATE INDEX idx_vendor_game_configs_draw ON vendor_game_configs(draw_config_id);

-- ============================================
-- NUMBER LIMITS (vendor per-draw per-number betting caps)
-- ============================================

CREATE TABLE number_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    draw_state draw_state NOT NULL,
    number VARCHAR(10) NOT NULL,
    bet_limit DECIMAL(10,2) NOT NULL,
    current_total DECIMAL(10,2) DEFAULT 0.00,
    is_stopped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, draw_state, number)
);

CREATE INDEX idx_number_limits_vendor_draw ON number_limits(vendor_id, draw_state);

-- ============================================
-- LOTTERY ROUNDS (daily draws)
-- ============================================

CREATE TABLE lottery_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_state draw_state NOT NULL,
    draw_date DATE NOT NULL,
    draw_time VARCHAR(20) NOT NULL, -- 'midday' or 'evening'
    status lottery_round_status DEFAULT 'open',
    
    -- Winning numbers (set after drawing)
    winning_numbers JSONB, -- {"senp": [42], "maryaj": [15,67], "loto3": [1,2,3], ...}
    
    total_bets DECIMAL(12,2) DEFAULT 0.00,
    total_payouts DECIMAL(12,2) DEFAULT 0.00,
    total_tickets INTEGER DEFAULT 0,
    
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    drawn_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(draw_state, draw_date, draw_time)
);

CREATE INDEX idx_lottery_rounds_state_date ON lottery_rounds(draw_state, draw_date);
CREATE INDEX idx_lottery_rounds_status ON lottery_rounds(status);

-- ============================================
-- LOTTERY TICKETS (bets placed by players)
-- ============================================

CREATE TABLE lottery_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES users(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    round_id UUID NOT NULL REFERENCES lottery_rounds(id),
    draw_state draw_state NOT NULL,
    game_type game_type NOT NULL,
    numbers INTEGER[] NOT NULL,
    bet_amount DECIMAL(10,2) NOT NULL CHECK (bet_amount > 0),
    currency currency_type DEFAULT 'USD',
    status ticket_status DEFAULT 'pending',
    win_amount DECIMAL(12,2) DEFAULT 0.00,
    win_multiplier DECIMAL(6,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

CREATE INDEX idx_lottery_tickets_player ON lottery_tickets(player_id);
CREATE INDEX idx_lottery_tickets_vendor ON lottery_tickets(vendor_id);
CREATE INDEX idx_lottery_tickets_round ON lottery_tickets(round_id);
CREATE INDEX idx_lottery_tickets_status ON lottery_tickets(status);

-- ============================================
-- TRANSACTIONS
-- ============================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency currency_type DEFAULT 'USD',
    payment_method VARCHAR(50),
    status payment_status DEFAULT 'pending',
    description TEXT,
    
    -- References
    ticket_id UUID REFERENCES lottery_tickets(id),
    vendor_id UUID REFERENCES vendors(id),
    moncash_transaction_id VARCHAR(255),
    
    -- Idempotency key to prevent duplicate transactions
    idempotency_key VARCHAR(255) UNIQUE,
    
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_moncash ON transactions(moncash_transaction_id);
CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key);

-- ============================================
-- PAYMENT METHODS (saved user payment methods)
-- ============================================

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type payment_method_type NOT NULL,
    display_name VARCHAR(255),
    last_four_digits VARCHAR(4),
    phone_number VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);

-- ============================================
-- PAYOUT METHODS (saved vendor/player payout methods)
-- ============================================

CREATE TABLE payout_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type payout_method_type NOT NULL,
    display_name VARCHAR(255),
    account_number VARCHAR(100),
    phone_number VARCHAR(50),
    bank_name VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payout_methods_user ON payout_methods(user_id);

-- ============================================
-- VENDOR PAYOUTS (withdrawal requests)
-- ============================================

CREATE TABLE vendor_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency currency_type DEFAULT 'HTG',
    method payout_method_type NOT NULL,
    status payout_status DEFAULT 'pending',
    bank_name VARCHAR(255),
    bank_account_name VARCHAR(255),
    bank_account_number VARCHAR(255),
    bank_routing_number VARCHAR(255),
    moncash_phone VARCHAR(50),
    request_date TIMESTAMPTZ DEFAULT NOW(),
    processed_date TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    notes TEXT,
    transfer_reference VARCHAR(255),
    confirmation_code VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_payouts_vendor ON vendor_payouts(vendor_id);
CREATE INDEX idx_vendor_payouts_status ON vendor_payouts(status);

-- ============================================
-- VENDOR REVIEWS
-- ============================================

CREATE TABLE vendor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    player_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    ticket_id UUID REFERENCES lottery_tickets(id),
    
    vendor_response TEXT,
    vendor_response_at TIMESTAMPTZ,
    
    is_reported BOOLEAN DEFAULT FALSE,
    report_reason TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_reviews_vendor ON vendor_reviews(vendor_id);
CREATE INDEX idx_vendor_reviews_player ON vendor_reviews(player_id);

-- ============================================
-- VENDOR NOTIFICATIONS
-- ============================================

CREATE TABLE vendor_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_notifications_vendor ON vendor_notifications(vendor_id);
CREATE INDEX idx_vendor_notifications_read ON vendor_notifications(is_read);

-- ============================================
-- ADVERTISEMENTS
-- ============================================

CREATE TABLE advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    content TEXT,
    background_color VARCHAR(20) DEFAULT '#3b82f6',
    text_color VARCHAR(20) DEFAULT '#ffffff',
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    link_text VARCHAR(100),
    ad_type ad_type DEFAULT 'slideshow',
    status ad_status DEFAULT 'active',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    target_audience ad_audience DEFAULT 'all',
    priority ad_priority DEFAULT 'medium',
    display_order INTEGER DEFAULT 0,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_advertisements_status ON advertisements(status);
CREATE INDEX idx_advertisements_dates ON advertisements(start_date, end_date);

-- ============================================
-- TCHALA / DREAM DICTIONARY
-- ============================================

CREATE TABLE dream_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword VARCHAR(100) NOT NULL,
    numbers INTEGER[] NOT NULL,
    description TEXT,
    language VARCHAR(5) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dream_dictionary_keyword ON dream_dictionary(keyword);
CREATE INDEX idx_dream_dictionary_lang ON dream_dictionary(language);

-- ============================================
-- APP SETTINGS
-- ============================================

CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Insert default settings
INSERT INTO app_settings (key, value, description) VALUES
('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
('min_bet_amount', '1', 'Minimum bet amount in USD'),
('max_bet_amount', '10000', 'Maximum bet amount in USD'),
('system_commission', '0.10', 'System commission rate (0.10 = 10%)'),
('allowed_states', '["GA", "NY", "FL", "CT", "MA", "NJ", "TX", "PA", "TN"]', 'States allowed for draws'),
('game_availability', '{"senp": true, "maryaj": true, "loto3": true, "loto4": true, "loto5": true}', 'Which game types are available'),
('win_multipliers', '{"senp": 50, "maryaj": 100, "loto3": 500, "loto4": 5000, "loto5": 50000}', 'Win multiplier per game type'),
('htg_exchange_rate', '150', 'HTG to USD exchange rate');

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- ============================================
-- HELPER FUNCTION: Update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_draw_configs_updated_at BEFORE UPDATE ON vendor_draw_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_payouts_updated_at BEFORE UPDATE ON vendor_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_advertisements_updated_at BEFORE UPDATE ON advertisements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
