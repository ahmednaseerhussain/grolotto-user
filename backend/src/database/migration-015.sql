-- ============================================
-- Migration 015 — Client change requests:
--   1) Notification origin metadata so the admin badge can ignore broadcasts
--      the admin themselves created and only count notifications addressed
--      *to* the admin (e.g. player/vendor activity alerts).
--   2) Add 'cash' to vendor payout method enum (in-person HTG payouts).
--   3) New `vendor_must_send` table tracking vendor losses on settled draws
--      that the vendor must remit back to the platform.
--   4) New `admin_notifications` inbox table for admin-targeted alerts.
-- ============================================

-- ─── 1. Notification origin columns ─────────────────────────────────────────
ALTER TABLE player_notifications
    ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(16) NOT NULL DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS created_by_id UUID;

ALTER TABLE vendor_notifications
    ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(16) NOT NULL DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS created_by_id UUID;

CREATE INDEX IF NOT EXISTS idx_player_notif_creator ON player_notifications(created_by_role);
CREATE INDEX IF NOT EXISTS idx_vendor_notif_creator ON vendor_notifications(created_by_role);

-- ─── 2. Payout method: cash ─────────────────────────────────────────────────
ALTER TYPE payout_method_type ADD VALUE IF NOT EXISTS 'cash';

-- ─── 3. Vendor must-send table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_must_send (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    draw_id UUID,                                  -- optional: tie to a specific draw round
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'HTG' CHECK (currency IN ('HTG','USD')),
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','submitted','paid','waived')),
    proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_must_send_vendor ON vendor_must_send(vendor_id);
CREATE INDEX IF NOT EXISTS idx_must_send_status ON vendor_must_send(status);
CREATE INDEX IF NOT EXISTS idx_must_send_created ON vendor_must_send(created_at DESC);

-- ─── 4. Admin notifications inbox ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- NULL admin_id = visible to every admin (broadcast to admin role)
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    source_role VARCHAR(16),       -- 'player' | 'vendor' | 'system'
    source_id UUID,                -- e.g. player user_id or vendor_id
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notif_admin ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notif_unread ON admin_notifications(admin_id, is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notif_created ON admin_notifications(created_at DESC);
