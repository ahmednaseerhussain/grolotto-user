-- Migration 012: Device push tokens for Expo Push Notifications

CREATE TABLE IF NOT EXISTS push_device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'unknown', -- 'ios', 'android', 'web'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_device_tokens(is_active) WHERE is_active = TRUE;
