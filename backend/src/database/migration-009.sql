-- Migration 009: Fix gift_cards purchased_by constraint
-- Ensure purchased_by is nullable (admin-created batch cards have no purchaser)

ALTER TABLE gift_cards ALTER COLUMN purchased_by DROP NOT NULL;
