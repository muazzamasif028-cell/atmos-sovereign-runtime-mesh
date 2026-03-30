-- Migration 002: API Keys Table
-- Created: 2024-01-02
-- Description: Adds API key management for service-to-service auth

\echo 'Running migration 002: API Keys'

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '002') THEN
    RAISE NOTICE 'Migration 002 already applied, skipping.';
    RETURN;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  key_hash    TEXT UNIQUE NOT NULL,  -- SHA-256 hash of the actual key
  key_prefix  TEXT NOT NULL,         -- First 8 chars for identification (e.g. "axon_abc")
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  scopes      TEXT[] NOT NULL DEFAULT '{}',  -- ['read', 'write', 'admin']
  rate_limit  INTEGER NOT NULL DEFAULT 1000, -- requests per hour
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash  ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id   ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

INSERT INTO schema_migrations (version, description)
VALUES ('002', 'API keys table for service authentication')
ON CONFLICT (version) DO NOTHING;

\echo 'Migration 002 complete.'
