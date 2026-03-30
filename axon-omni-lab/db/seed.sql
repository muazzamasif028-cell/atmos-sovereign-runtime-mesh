-- ============================================================================
-- AXON OMNI LAB — Seed Data
-- Populates the database with sample data for development/demo
-- ============================================================================

\echo 'Seeding Axon Omni Lab database...'

-- ── Sample Users ──────────────────────────────────────────────────────────────
INSERT INTO users (id, email, name, role, metadata) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@axon.local',   'Axon Admin',   'admin', '{"avatar": "🧠", "timezone": "UTC"}'),
  ('00000000-0000-0000-0000-000000000002', 'alice@example.com',  'Alice Chen',   'user',  '{"avatar": "👩‍💻", "timezone": "America/New_York"}'),
  ('00000000-0000-0000-0000-000000000003', 'bob@example.com',    'Bob Martinez', 'user',  '{"avatar": "👨‍💼", "timezone": "Europe/London"}')
ON CONFLICT (email) DO NOTHING;

-- ── Sample Conversations ──────────────────────────────────────────────────────
INSERT INTO conversations (id, user_id, title, model, metadata) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Getting started with Axon', 'deepseek-chat', '{"tags": ["onboarding"]}'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Workflow automation setup', 'gpt-4o', '{"tags": ["automation"]}'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Stripe integration help', 'deepseek-chat', '{"tags": ["integration", "stripe"]}')
ON CONFLICT DO NOTHING;

-- ── Sample Messages ───────────────────────────────────────────────────────────
INSERT INTO messages (conversation_id, role, content, model) VALUES
  ('10000000-0000-0000-0000-000000000001', 'user', 'How do I create my first workflow?', NULL),
  ('10000000-0000-0000-0000-000000000001', 'assistant', 'To create a workflow, navigate to the Reflexes section and click "New Workflow". Define a trigger (manual, cron, or webhook), then add steps like HTTP requests, AI inference, or Slack notifications.', 'deepseek-chat'),
  ('10000000-0000-0000-0000-000000000002', 'user', 'Can you automate my daily standup report?', NULL),
  ('10000000-0000-0000-0000-000000000002', 'assistant', 'Absolutely! I can create a cron workflow that runs every morning at 9am, queries your GitHub for recent commits, summarizes them with AI, and posts to your Slack channel.', 'gpt-4o')
ON CONFLICT DO NOTHING;

-- ── Sample Workflows ──────────────────────────────────────────────────────────
INSERT INTO workflows (id, name, description, trigger_type, trigger_config, steps, enabled, metadata) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'Daily Standup Report',
    'Generates and posts a daily standup report to Slack every morning',
    'cron',
    '{"cron": "0 9 * * 1-5", "timezone": "UTC"}',
    '[
      {"name": "fetch_github", "type": "http_request", "params": {"url": "https://api.github.com/repos/org/repo/commits", "method": "GET"}},
      {"name": "summarize", "type": "ai_inference", "params": {"prompt": "Summarize these commits for a standup report"}},
      {"name": "post_slack", "type": "send_slack", "params": {"channel": "#standup", "message": "{{summarize_output}}"}}
    ]',
    true,
    '{"category": "reporting", "owner": "alice@example.com"}'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'New User Welcome',
    'Sends a welcome email and Slack notification when a new user signs up',
    'event',
    '{"event": "user.created"}',
    '[
      {"name": "send_welcome_email", "type": "http_request", "params": {"url": "http://localhost:3002/gmail/send", "method": "POST"}},
      {"name": "notify_team", "type": "send_slack", "params": {"channel": "#new-users", "message": "New user signed up!"}}
    ]',
    true,
    '{"category": "onboarding"}'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'Weekly AI Summary',
    'Generates a weekly summary of all AI interactions and usage',
    'cron',
    '{"cron": "0 18 * * 5", "timezone": "UTC"}',
    '[
      {"name": "fetch_stats", "type": "http_request", "params": {"url": "http://localhost:3001/stats", "method": "GET"}},
      {"name": "generate_report", "type": "ai_inference", "params": {"prompt": "Create a weekly AI usage report from these stats"}},
      {"name": "save_report", "type": "http_request", "params": {"url": "http://localhost:3011/conversations", "method": "POST"}}
    ]',
    false,
    '{"category": "reporting"}'
  )
ON CONFLICT DO NOTHING;

-- ── Sample Integrations ───────────────────────────────────────────────────────
INSERT INTO integrations (name, type, config, enabled, metadata) VALUES
  ('Stripe Production', 'stripe', '{"mode": "live", "currency": "usd"}', false, '{"note": "Configure STRIPE_SECRET_KEY to enable"}'),
  ('Slack Workspace',   'slack',  '{"workspace": "axon-team"}',          false, '{"note": "Configure SLACK_BOT_TOKEN to enable"}'),
  ('GitHub Org',        'github', '{"org": "axon-omni-lab"}',            false, '{"note": "Configure GITHUB_TOKEN to enable"}'),
  ('Gmail Notifications', 'gmail', '{"from": "noreply@axon.local"}',     false, '{"note": "Configure Gmail OAuth to enable"}')
ON CONFLICT DO NOTHING;

-- ── Sample Knowledge Base ─────────────────────────────────────────────────────
INSERT INTO knowledge_base (title, content, category, tags, is_public) VALUES
  (
    'Getting Started with Axon Omni Lab',
    'Axon Omni Lab is a 12-element living platform. Each element maps to a human body part. The Face (element 12) is your dashboard. The Brain (element 4) handles AI. The Hands (element 8) connect to external services.',
    'documentation',
    ARRAY['getting-started', 'overview'],
    true
  ),
  (
    'Creating Workflows',
    'Workflows are automated sequences of steps triggered by events, schedules, or webhooks. Each step can be an HTTP request, AI inference, Slack message, or data transformation. Steps can pass data to each other via context variables.',
    'documentation',
    ARRAY['workflows', 'automation', 'reflexes'],
    true
  ),
  (
    'Stripe Integration Guide',
    'To integrate Stripe: 1) Set STRIPE_SECRET_KEY environment variable. 2) Use POST /api/hands/stripe/charge to create charges. 3) Use POST /api/hands/stripe/customer to create customers. 4) Configure STRIPE_WEBHOOK_SECRET for webhook verification.',
    'integration',
    ARRAY['stripe', 'payments', 'hands'],
    true
  )
ON CONFLICT DO NOTHING;

\echo 'Seed data inserted successfully.'
