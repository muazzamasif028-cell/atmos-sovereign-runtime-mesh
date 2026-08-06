-- ============================================================================
-- AXON OMNI LAB — PostgreSQL Schema
-- Element 3: Persistence (DNA)
-- ============================================================================
-- Run this against your PostgreSQL database to initialize the schema.
-- Compatible with PostgreSQL 14+
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for embeddings

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'service', 'readonly')),
  password_hash TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active   ON users(is_active);

-- ── Sessions ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT UNIQUE NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ── Conversations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  title       TEXT,
  model       TEXT,
  system_prompt TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id    ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_archived   ON conversations(is_archived);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content         TEXT NOT NULL,
  tokens_used     INTEGER,
  model           TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_role            ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON messages(created_at);

-- ── Workflows ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflows (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  description      TEXT,
  trigger_type     TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'cron', 'webhook', 'event', 'condition')),
  trigger_config   JSONB NOT NULL DEFAULT '{}',
  steps            JSONB NOT NULL DEFAULT '[]',
  enabled          BOOLEAN NOT NULL DEFAULT true,
  execution_count  INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_enabled      ON workflows(enabled);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by   ON workflows(created_by);

-- ── Workflow Executions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_executions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id  UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  trigger_data JSONB NOT NULL DEFAULT '{}',
  steps_result JSONB NOT NULL DEFAULT '[]',
  error        TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms  INTEGER GENERATED ALWAYS AS (
    CASE WHEN completed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
    ELSE NULL END
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status      ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at  ON workflow_executions(started_at DESC);

-- ── Integrations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,  -- stripe, slack, gmail, github, zapier, etc.
  config       JSONB NOT NULL DEFAULT '{}',  -- encrypted in production
  enabled      BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status  TEXT DEFAULT 'pending',
  error_count  INTEGER NOT NULL DEFAULT 0,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_type    ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON integrations(enabled);

-- ── Vector Embeddings ─────────────────────────────────────────────────────────
-- Requires pgvector extension: CREATE EXTENSION vector;
CREATE TABLE IF NOT EXISTS embeddings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content     TEXT NOT NULL,
  vector      vector(1536),  -- OpenAI text-embedding-3-small dimensions
  namespace   TEXT NOT NULL DEFAULT 'default',
  source      TEXT,
  source_id   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_namespace ON embeddings(namespace);
CREATE INDEX IF NOT EXISTS idx_embeddings_source    ON embeddings(source);
-- Vector similarity index (IVFFlat for approximate nearest neighbor)
-- CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

-- ── Knowledge Base ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_base (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT,
  tags        TEXT[] DEFAULT '{}',
  embedding_id UUID REFERENCES embeddings(id) ON DELETE SET NULL,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags     ON knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_public   ON knowledge_base(is_public);

-- ── Audit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action       TEXT NOT NULL,  -- INSERT, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  table_name   TEXT,
  record_id    TEXT,
  old_values   JSONB,
  new_values   JSONB,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address   INET,
  user_agent   TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_action      ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_table       ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON audit_logs(created_at DESC);

-- ── Service Metrics ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_metrics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service     TEXT NOT NULL,
  cpu_pct     NUMERIC(5,2),
  memory_pct  NUMERIC(5,2),
  rps         NUMERIC(10,2),
  error_rate  NUMERIC(5,2),
  latency_ms  NUMERIC(10,2),
  replicas    INTEGER,
  custom      JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_service     ON service_metrics(service);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON service_metrics(recorded_at DESC);

-- Partition by month for large deployments (optional)
-- CREATE TABLE service_metrics_2024_01 PARTITION OF service_metrics
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ── Scaling Events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scaling_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service     TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('scale_up', 'scale_down', 'no_change')),
  from_count  INTEGER NOT NULL,
  to_count    INTEGER NOT NULL,
  reason      TEXT,
  is_manual   BOOLEAN NOT NULL DEFAULT false,
  metrics     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scaling_service    ON scaling_events(service);
CREATE INDEX IF NOT EXISTS idx_scaling_created_at ON scaling_events(created_at DESC);

-- ── Threat Log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threat_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        TEXT NOT NULL,  -- rate_limit, suspicious_request, blocked_ip, etc.
  ip_address  INET,
  severity    TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details     JSONB NOT NULL DEFAULT '{}',
  blocked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threats_type       ON threat_log(type);
CREATE INDEX IF NOT EXISTS idx_threats_ip         ON threat_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_threats_severity   ON threat_log(severity);
CREATE INDEX IF NOT EXISTS idx_threats_created_at ON threat_log(created_at DESC);

-- ── Auto-update updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'conversations', 'workflows', 'integrations', 'knowledge_base'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at ON %I;
      CREATE TRIGGER trg_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t);
  END LOOP;
END;
$$;

-- ── Seed: Default admin user ──────────────────────────────────────────────────
INSERT INTO users (email, name, role, metadata)
VALUES ('admin@axon-omni-lab.local', 'Axon Admin', 'admin', '{"source": "seed"}')
ON CONFLICT (email) DO NOTHING;

-- ── Views ─────────────────────────────────────────────────────────────────────

-- System health summary
CREATE OR REPLACE VIEW v_system_health AS
SELECT
  service,
  AVG(cpu_pct)    AS avg_cpu,
  AVG(memory_pct) AS avg_memory,
  AVG(rps)        AS avg_rps,
  AVG(error_rate) AS avg_error_rate,
  MAX(recorded_at) AS last_seen
FROM service_metrics
WHERE recorded_at > NOW() - INTERVAL '1 hour'
GROUP BY service;

-- Workflow execution summary
CREATE OR REPLACE VIEW v_workflow_summary AS
SELECT
  w.id,
  w.name,
  w.trigger_type,
  w.enabled,
  w.execution_count,
  w.last_executed_at,
  COUNT(e.id) FILTER (WHERE e.status = 'success') AS successful_runs,
  COUNT(e.id) FILTER (WHERE e.status = 'failed')  AS failed_runs,
  AVG(e.duration_ms) AS avg_duration_ms
FROM workflows w
LEFT JOIN workflow_executions e ON e.workflow_id = w.id
GROUP BY w.id, w.name, w.trigger_type, w.enabled, w.execution_count, w.last_executed_at;

-- Recent activity feed
CREATE OR REPLACE VIEW v_activity_feed AS
SELECT 'audit'     AS type, action AS event, table_name AS context, created_at FROM audit_logs
UNION ALL
SELECT 'execution' AS type, status AS event, workflow_id::TEXT AS context, started_at AS created_at FROM workflow_executions
UNION ALL
SELECT 'threat'    AS type, type AS event, severity AS context, created_at FROM threat_log
ORDER BY created_at DESC
LIMIT 100;
