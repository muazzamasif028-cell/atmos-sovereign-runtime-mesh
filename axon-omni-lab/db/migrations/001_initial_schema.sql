-- Migration 001: Initial Schema
-- Created: 2024-01-01
-- Description: Creates all core tables for Axon Omni Lab

-- This migration is idempotent (safe to run multiple times)
-- Run: psql $DATABASE_URL -f migrations/001_initial_schema.sql

\echo 'Running migration 001: Initial Schema'

-- Track migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  description TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check if already applied
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001') THEN
    RAISE NOTICE 'Migration 001 already applied, skipping.';
    RETURN;
  END IF;
END;
$$;

-- Apply the main schema
\i ../schema.sql

-- Record migration
INSERT INTO schema_migrations (version, description)
VALUES ('001', 'Initial schema — all 12 element tables')
ON CONFLICT (version) DO NOTHING;

\echo 'Migration 001 complete.'
