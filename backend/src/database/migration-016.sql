-- ============================================
-- Migration 016: Email verification + Terms acceptance + Payment/Social handles
-- ============================================
-- Idempotent: safe to run multiple times.

-- 1. Add email_verified column to users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Backfill: mark all pre-existing users as verified to avoid locking them out.
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL OR email_verified = FALSE;

-- 2. Add Terms & Conditions tracking columns
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terms_version VARCHAR(16);

-- 3. Seed / update payment & social app_settings keys
INSERT INTO app_settings (key, value, description) VALUES
    ('zelle_email',       '"pay@grolotto.com"', 'Zelle payment destination email'),
    ('cashapp_tag',       '"$groloto"',          'Cash App $cashtag'),
    ('cashapp_phone',     '""',                  'Cash App phone (optional)'),
    ('social_facebook',   '"Grolotto"',          'Facebook page/handle'),
    ('social_instagram',  '"@Grolotto"',         'Instagram handle'),
    ('social_tiktok',     '"@Grolotto"',         'TikTok handle'),
    ('support_phone',     '""',                  'Support phone number (optional)'),
    ('paypal_email',      '""',                  'PayPal payment email (optional)')
ON CONFLICT (key) DO NOTHING;

-- Force-update zelle/cashapp to the new official handles (overrides previous test values)
UPDATE app_settings SET value = '"pay@grolotto.com"' WHERE key = 'zelle_email';
UPDATE app_settings SET value = '"$groloto"'          WHERE key = 'cashapp_tag';
UPDATE app_settings SET value = '"Grolotto"'          WHERE key = 'social_facebook';
UPDATE app_settings SET value = '"@Grolotto"'         WHERE key = 'social_instagram';
UPDATE app_settings SET value = '"@Grolotto"'         WHERE key = 'social_tiktok';
