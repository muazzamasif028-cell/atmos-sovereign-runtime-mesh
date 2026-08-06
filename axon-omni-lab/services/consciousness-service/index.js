/**
 * CONSCIOUSNESS SERVICE — Element 5: Context
 * Body Part: Consciousness
 * Role: User conversation history, session state, and working memory
 *
 * Consciousness is what makes the system aware of who it is talking to,
 * what was said before, and what the current intent is.
 * Without consciousness, every interaction starts from zero.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;
const SERVICE_NAME = 'consciousness-service';

// ─── In-memory session store (Redis in production) ────────────────────────────
// In production: import { createClient } from 'redis'; const redis = createClient({ url: process.env.REDIS_URL });

const sessions = new Map();       // sessionId → session object
const userContexts = new Map();   // userId → context object
const workingMemory = new Map();  // key → { value, expiresAt }

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isExpired(session) {
  return Date.now() - new Date(session.lastActivityAt).getTime() > SESSION_TTL_MS;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Context',
    bodyPart: 'Consciousness',
    status: 'healthy',
    activeSessions: sessions.size,
    trackedUsers: userContexts.size,
    workingMemoryKeys: workingMemory.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Sessions ──────────────────────────────────────────────────────────────────

app.post('/sessions', (req, res) => {
  const { userId, metadata = {} } = req.body;
  const sessionId = generateId();

  const session = {
    id: sessionId,
    userId: userId || null,
    messages: [],
    metadata,
    intent: null,
    entities: {},
    sentiment: 'neutral',
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };

  sessions.set(sessionId, session);
  res.status(201).json({ session });
});

app.get('/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (isExpired(session)) {
    sessions.delete(req.params.id);
    return res.status(410).json({ error: 'Session expired' });
  }
  res.json({ session });
});

app.delete('/sessions/:id', (req, res) => {
  const existed = sessions.has(req.params.id);
  sessions.delete(req.params.id);
  res.json({ deleted: existed, sessionId: req.params.id });
});

// Add a message to a session
app.post('/sessions/:id/messages', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { role, content, metadata = {} } = req.body;
  if (!role || !content) return res.status(400).json({ error: 'role and content are required' });

  const message = {
    id: generateId(),
    role,
    content,
    metadata,
    timestamp: new Date().toISOString(),
  };

  session.messages.push(message);
  session.lastActivityAt = new Date().toISOString();

  // Simple sentiment detection
  const lowerContent = content.toLowerCase();
  if (/\b(great|excellent|love|perfect|amazing|thank)\b/.test(lowerContent)) session.sentiment = 'positive';
  else if (/\b(bad|terrible|hate|awful|wrong|broken|error)\b/.test(lowerContent)) session.sentiment = 'negative';
  else session.sentiment = 'neutral';

  sessions.set(req.params.id, session);
  res.status(201).json({ message, session: { id: session.id, messageCount: session.messages.length, sentiment: session.sentiment } });
});

// Get conversation history for a session (formatted for AI context)
app.get('/sessions/:id/context', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { limit = 20 } = req.query;
  const recentMessages = session.messages.slice(-parseInt(limit));

  res.json({
    sessionId: session.id,
    userId: session.userId,
    messages: recentMessages,
    intent: session.intent,
    entities: session.entities,
    sentiment: session.sentiment,
    messageCount: session.messages.length,
    contextWindow: recentMessages.length,
  });
});

// Update session intent / entities
app.patch('/sessions/:id/state', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { intent, entities, metadata } = req.body;
  if (intent)   session.intent   = intent;
  if (entities) session.entities = { ...session.entities, ...entities };
  if (metadata) session.metadata = { ...session.metadata, ...metadata };
  session.lastActivityAt = new Date().toISOString();

  sessions.set(req.params.id, session);
  res.json({ session });
});

// ── User Context (long-term memory) ───────────────────────────────────────────

app.get('/context/:userId', (req, res) => {
  const ctx = userContexts.get(req.params.userId) || {
    userId: req.params.userId,
    preferences: {},
    history: [],
    facts: {},
    lastSeenAt: null,
  };
  res.json({ context: ctx });
});

app.patch('/context/:userId', (req, res) => {
  const existing = userContexts.get(req.params.userId) || {
    userId: req.params.userId,
    preferences: {},
    history: [],
    facts: {},
    lastSeenAt: null,
  };

  const { preferences, facts, historyEntry } = req.body;
  if (preferences) existing.preferences = { ...existing.preferences, ...preferences };
  if (facts)       existing.facts       = { ...existing.facts, ...facts };
  if (historyEntry) {
    existing.history.push({ ...historyEntry, timestamp: new Date().toISOString() });
    if (existing.history.length > 100) existing.history = existing.history.slice(-100);
  }
  existing.lastSeenAt = new Date().toISOString();

  userContexts.set(req.params.userId, existing);
  res.json({ context: existing });
});

// ── Working Memory (short-lived key-value store) ───────────────────────────────

app.post('/memory', (req, res) => {
  const { key, value, ttlSeconds = 300 } = req.body;
  if (!key) return res.status(400).json({ error: 'key is required' });

  workingMemory.set(key, {
    value,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ key, stored: true, expiresIn: `${ttlSeconds}s` });
});

app.get('/memory/:key', (req, res) => {
  const entry = workingMemory.get(req.params.key);
  if (!entry) return res.status(404).json({ error: 'Key not found' });
  if (new Date(entry.expiresAt) < new Date()) {
    workingMemory.delete(req.params.key);
    return res.status(410).json({ error: 'Key expired' });
  }
  res.json({ key: req.params.key, ...entry });
});

app.delete('/memory/:key', (req, res) => {
  const existed = workingMemory.has(req.params.key);
  workingMemory.delete(req.params.key);
  res.json({ deleted: existed, key: req.params.key });
});

// ── Session cleanup (runs every 5 minutes) ────────────────────────────────────
setInterval(() => {
  let cleaned = 0;
  for (const [id, session] of sessions.entries()) {
    if (isExpired(session)) { sessions.delete(id); cleaned++; }
  }
  for (const [key, entry] of workingMemory.entries()) {
    if (new Date(entry.expiresAt) < new Date()) { workingMemory.delete(key); cleaned++; }
  }
  if (cleaned > 0) console.log(`[CONSCIOUSNESS] Cleaned up ${cleaned} expired entries`);
}, 5 * 60 * 1000);

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CONSCIOUSNESS] Context & memory service running on port ${PORT}`);
});
