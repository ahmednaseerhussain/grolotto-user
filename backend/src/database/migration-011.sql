-- Migration 011: Add admin_role column for granular admin permissions
-- Values: 'super_admin', 'admin', 'moderator', 'viewer'

ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role VARCHAR(20) DEFAULT 'admin';

-- Set existing admins to super_admin (they had full access before)
UPDATE users SET admin_role = 'super_admin' WHERE role = 'admin' AND admin_role = 'admin';

COMMENT ON COLUMN users.admin_role IS 'Admin permission level: super_admin (full), admin (manage), moderator (content), viewer (read-only)';
