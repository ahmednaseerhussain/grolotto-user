-- ============================================
-- Migration 010 — Vendor draw schedules (open/close times)
-- Per vendor + state + draw_time schedule entries
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_draw_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  draw_state draw_state NOT NULL,
  draw_time VARCHAR(20) NOT NULL,  -- 'morning', 'midday', 'evening'
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, draw_state, draw_time)
);

CREATE INDEX IF NOT EXISTS idx_vendor_draw_schedules_vendor ON vendor_draw_schedules(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_draw_schedules_state ON vendor_draw_schedules(draw_state, draw_time);
