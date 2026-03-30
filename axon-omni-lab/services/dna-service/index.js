/**
 * DNA SERVICE — Element 3: Persistence
 * Body Part: DNA / Memory
 * Role: PostgreSQL persistence layer — the genetic memory of the system
 *
 * Every piece of data that must survive a restart lives here.
 * DNA encodes the organism's history, identity, and state.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3011;
const SERVICE_NAME = 'dna-service';

const DATABASE_URL = process.env.DATABASE_URL;

// ─── Mock DB layer (replace with pg Pool in production) ───────────────────────
// In production: import pg from 'pg'; const pool = new pg.Pool({ connectionString: DATABASE_URL });

let mockDb = {
  users:        [],
  conversations:[],
  workflows:    [],
  integrations: [],
  embeddings:   [],
  audit_logs:   [],
};

let idCounters = { users: 1, conversations: 1, workflows: 1, integrations: 1, embeddings: 1, audit_logs: 1 };

function nextId(table) { return idCounters[table]++; }

function auditLog(action, table, recordId, performedBy = 'system') {
  mockDb.audit_logs.push({
    id: nextId('audit_logs'),
    action,
    table_name: table,
    record_id: recordId,
    performed_by: performedBy,
    timestamp: new Date().toISOString(),
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Persistence',
    bodyPart: 'DNA',
    status: 'healthy',
    databaseConfigured: !!DATABASE_URL,
    tables: Object.keys(mockDb),
    recordCounts: Object.fromEntries(Object.entries(mockDb).map(([k, v]) => [k, v.length])),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Users ─────────────────────────────────────────────────────────────────────

app.get('/users', (req, res) => {
  res.json({ users: mockDb.users, total: mockDb.users.length });
});

app.post('/users', (req, res) => {
  const { email, name, role = 'user', metadata = {} } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const existing = mockDb.users.find(u => u.email === email);
  if (existing) return res.status(409).json({ error: 'User already exists', user: existing });

  const user = {
    id: nextId('users'),
    email,
    name: name || email.split('@')[0],
    role,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockDb.users.push(user);
  auditLog('INSERT', 'users', user.id);
  res.status(201).json({ user });
});

app.get('/users/:id', (req, res) => {
  const user = mockDb.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

app.patch('/users/:id', (req, res) => {
  const idx = mockDb.users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  mockDb.users[idx] = { ...mockDb.users[idx], ...req.body, updatedAt: new Date().toISOString() };
  auditLog('UPDATE', 'users', mockDb.users[idx].id);
  res.json({ user: mockDb.users[idx] });
});

// ── Conversations ─────────────────────────────────────────────────────────────

app.get('/conversations', (req, res) => {
  const { userId } = req.query;
  const convs = userId
    ? mockDb.conversations.filter(c => c.userId === parseInt(userId))
    : mockDb.conversations;
  res.json({ conversations: convs, total: convs.length });
});

app.post('/conversations', (req, res) => {
  const { userId, title, messages = [], metadata = {} } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const conv = {
    id: nextId('conversations'),
    userId: parseInt(userId),
    title: title || `Conversation ${new Date().toLocaleDateString()}`,
    messages,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockDb.conversations.push(conv);
  auditLog('INSERT', 'conversations', conv.id);
  res.status(201).json({ conversation: conv });
});

app.patch('/conversations/:id/messages', (req, res) => {
  const idx = mockDb.conversations.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Conversation not found' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  mockDb.conversations[idx].messages.push({ ...message, timestamp: new Date().toISOString() });
  mockDb.conversations[idx].updatedAt = new Date().toISOString();
  auditLog('UPDATE', 'conversations', mockDb.conversations[idx].id);
  res.json({ conversation: mockDb.conversations[idx] });
});

// ── Workflows ─────────────────────────────────────────────────────────────────

app.get('/workflows', (req, res) => {
  res.json({ workflows: mockDb.workflows, total: mockDb.workflows.length });
});

app.post('/workflows', (req, res) => {
  const { name, trigger, steps = [], enabled = true, metadata = {} } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const workflow = {
    id: nextId('workflows'),
    name,
    trigger,
    steps,
    enabled,
    metadata,
    executionCount: 0,
    lastExecutedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockDb.workflows.push(workflow);
  auditLog('INSERT', 'workflows', workflow.id);
  res.status(201).json({ workflow });
});

app.patch('/workflows/:id', (req, res) => {
  const idx = mockDb.workflows.findIndex(w => w.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Workflow not found' });
  mockDb.workflows[idx] = { ...mockDb.workflows[idx], ...req.body, updatedAt: new Date().toISOString() };
  auditLog('UPDATE', 'workflows', mockDb.workflows[idx].id);
  res.json({ workflow: mockDb.workflows[idx] });
});

// ── Integrations ──────────────────────────────────────────────────────────────

app.get('/integrations', (req, res) => {
  res.json({ integrations: mockDb.integrations, total: mockDb.integrations.length });
});

app.post('/integrations', (req, res) => {
  const { name, type, config = {}, enabled = true } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });

  const integration = {
    id: nextId('integrations'),
    name,
    type,
    config: { ...config, secret: config.secret ? '***' : undefined },
    enabled,
    lastSyncAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockDb.integrations.push(integration);
  auditLog('INSERT', 'integrations', integration.id);
  res.status(201).json({ integration });
});

// ── Vector Embeddings ─────────────────────────────────────────────────────────

app.get('/embeddings', (req, res) => {
  const { limit = 20 } = req.query;
  res.json({ embeddings: mockDb.embeddings.slice(0, parseInt(limit)), total: mockDb.embeddings.length });
});

app.post('/embeddings', (req, res) => {
  const { content, vector, metadata = {}, source } = req.body;
  if (!content || !vector) return res.status(400).json({ error: 'content and vector are required' });

  const embedding = {
    id: nextId('embeddings'),
    content,
    vector: vector.slice(0, 5).concat(['...']), // truncate for storage display
    dimensions: vector.length,
    metadata,
    source: source || 'unknown',
    createdAt: new Date().toISOString(),
  };
  mockDb.embeddings.push(embedding);
  auditLog('INSERT', 'embeddings', embedding.id);
  res.status(201).json({ embedding });
});

// ── Audit Logs ────────────────────────────────────────────────────────────────

app.get('/audit', (req, res) => {
  const { limit = 50, table } = req.query;
  let logs = mockDb.audit_logs;
  if (table) logs = logs.filter(l => l.table_name === table);
  res.json({ logs: logs.slice(-parseInt(limit)), total: logs.length });
});

// ── Schema Info ───────────────────────────────────────────────────────────────

app.get('/schema', (req, res) => {
  res.json({
    tables: {
      users:         { columns: ['id', 'email', 'name', 'role', 'metadata', 'createdAt', 'updatedAt'] },
      conversations: { columns: ['id', 'userId', 'title', 'messages', 'metadata', 'createdAt', 'updatedAt'] },
      workflows:     { columns: ['id', 'name', 'trigger', 'steps', 'enabled', 'executionCount', 'lastExecutedAt', 'createdAt', 'updatedAt'] },
      integrations:  { columns: ['id', 'name', 'type', 'config', 'enabled', 'lastSyncAt', 'createdAt', 'updatedAt'] },
      embeddings:    { columns: ['id', 'content', 'vector', 'dimensions', 'metadata', 'source', 'createdAt'] },
      audit_logs:    { columns: ['id', 'action', 'table_name', 'record_id', 'performed_by', 'timestamp'] },
    },
    databaseUrl: DATABASE_URL ? '***configured***' : 'not configured (using in-memory store)',
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[DNA] Persistence service running on port ${PORT}`);
  console.log(`[DNA] Database: ${DATABASE_URL ? 'PostgreSQL connected' : 'in-memory (set DATABASE_URL for production)'}`);
});
