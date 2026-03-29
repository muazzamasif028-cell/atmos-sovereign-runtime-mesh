/**
 * Axon Cloud — Database Client & Schema Definitions
 *
 * Uses the `pg` Pool for all database access.  The schema is applied via the
 * migration runner in `migrations/run.ts`.
 */

import { Pool } from 'pg';
import { logger } from '../core/logger';

// ── Connection pool ───────────────────────────────────────────────────────────

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl:
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: false },
});

db.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { message: err.message });
});

// ── Schema DDL (used by the migration runner) ─────────────────────────────────

export const SCHEMA_SQL = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  password    TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'viewer'
                          CHECK (role IN ('admin', 'editor', 'viewer')),
  level       INTEGER     NOT NULL DEFAULT 1
                          CHECK (level BETWEEN 1 AND 4),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── integrations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  integration_id TEXT        NOT NULL UNIQUE,
  config         JSONB       NOT NULL DEFAULT '{}',
  level_required INTEGER     NOT NULL DEFAULT 1
                             CHECK (level_required BETWEEN 1 AND 4),
  enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_level ON integrations (level_required);

-- ── workflows ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflows (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  definition  JSONB       NOT NULL,
  level       INTEGER     NOT NULL DEFAULT 1
                          CHECK (level BETWEEN 1 AND 4),
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  owner_id    UUID        REFERENCES users (id) ON DELETE SET NULL,
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_owner   ON workflows (owner_id);
CREATE INDEX IF NOT EXISTS idx_workflows_level   ON workflows (level);
CREATE INDEX IF NOT EXISTS idx_workflows_active  ON workflows (active);
CREATE INDEX IF NOT EXISTS idx_workflows_tags    ON workflows USING GIN (tags);

-- ── workflow_executions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_executions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID        NOT NULL REFERENCES workflows (id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  result      JSONB,
  trigger_data JSONB,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER * 1000
      ELSE NULL
    END
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_executions_workflow ON workflow_executions (workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status   ON workflow_executions (status);
CREATE INDEX IF NOT EXISTS idx_executions_started  ON workflow_executions (started_at DESC);

-- ── audit_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users (id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  resource   TEXT        NOT NULL,
  resource_id TEXT,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  ip_address TEXT,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user      ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource  ON audit_logs (resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp DESC);

-- ── schema_migrations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
