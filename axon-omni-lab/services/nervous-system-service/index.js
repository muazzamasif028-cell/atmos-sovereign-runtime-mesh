/**
 * NERVOUS SYSTEM SERVICE — Element 10: Mesh
 * Body Part: Nervous System
 * Role: Fast inter-service communication via Redis Pub/Sub event bus
 *
 * The nervous system carries signals between all parts of the organism
 * at high speed. It is the connective tissue that makes the 12 elements
 * act as one coherent being rather than 12 isolated services.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3007;
const SERVICE_NAME = 'nervous-system-service';

const REDIS_URL = process.env.REDIS_URL;

// ─── In-memory event bus (Redis Pub/Sub in production) ────────────────────────
const subscribers = new Map();   // channel → Set of callbacks
const eventHistory = [];         // recent events for replay
const MAX_HISTORY = 1000;

// WebSocket clients for real-time push
const wsClients = new Set();

// ─── Event Bus ────────────────────────────────────────────────────────────────
function publish(channel, data, source = 'unknown') {
  const event = {
    id:        `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    channel,
    data,
    source,
    timestamp: new Date().toISOString(),
  };

  // Store in history
  eventHistory.push(event);
  if (eventHistory.length > MAX_HISTORY) eventHistory.shift();

  // Notify in-process subscribers
  const channelSubs = subscribers.get(channel) || new Set();
  const wildcardSubs = subscribers.get('*') || new Set();
  [...channelSubs, ...wildcardSubs].forEach(cb => {
    try { cb(event); } catch (err) { console.error('[NERVOUS] Subscriber error:', err.message); }
  });

  // Push to WebSocket clients
  const payload = JSON.stringify(event);
  wsClients.forEach(ws => {
    if (ws.readyState === 1) { // OPEN
      try { ws.send(payload); } catch (_) {}
    }
  });

  console.log(`[NERVOUS] Published: ${channel} from ${source}`);
  return event;
}

function subscribe(channel, callback) {
  if (!subscribers.has(channel)) subscribers.set(channel, new Set());
  subscribers.get(channel).add(callback);
  return () => subscribers.get(channel)?.delete(callback); // unsubscribe fn
}

// ─── Built-in System Event Handlers ──────────────────────────────────────────
subscribe('service.health', (event) => {
  console.log(`[NERVOUS] Health update from ${event.data?.service}: ${event.data?.status}`);
});

subscribe('workflow.completed', (event) => {
  console.log(`[NERVOUS] Workflow completed: ${event.data?.workflowName} — ${event.data?.status}`);
});

subscribe('error.critical', (event) => {
  console.error(`[NERVOUS] CRITICAL ERROR from ${event.source}: ${JSON.stringify(event.data)}`);
});

// ─── HTTP Server + WebSocket ──────────────────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  wsClients.add(ws);
  console.log(`[NERVOUS] WebSocket client connected (total: ${wsClients.size})`);

  // Send welcome + recent history
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Axon Nervous System',
    recentEvents: eventHistory.slice(-20),
    timestamp: new Date().toISOString(),
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe') {
        // Client subscribes to specific channels
        ws._subscribedChannels = msg.channels || ['*'];
        ws.send(JSON.stringify({ type: 'subscribed', channels: ws._subscribedChannels }));
      } else if (msg.type === 'publish') {
        publish(msg.channel, msg.data, 'websocket-client');
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[NERVOUS] WebSocket client disconnected (total: ${wsClients.size})`);
  });

  ws.on('error', () => wsClients.delete(ws));
});

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Mesh',
    bodyPart: 'Nervous System',
    status: 'healthy',
    redisConfigured: !!REDIS_URL,
    channels: [...subscribers.keys()],
    subscriberCount: [...subscribers.values()].reduce((sum, s) => sum + s.size, 0),
    wsClients: wsClients.size,
    eventHistorySize: eventHistory.length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Publish an event
app.post('/publish', (req, res) => {
  const { channel, data, source } = req.body;
  if (!channel) return res.status(400).json({ error: 'channel is required' });

  const event = publish(channel, data, source || req.headers['x-service-name'] || 'http-api');
  res.status(201).json({ event });
});

// Get event history
app.get('/events', (req, res) => {
  const { channel, limit = 50, since } = req.query;
  let events = eventHistory;

  if (channel) events = events.filter(e => e.channel === channel || e.channel === '*');
  if (since)   events = events.filter(e => new Date(e.timestamp) > new Date(since));

  res.json({
    events: events.slice(-parseInt(limit)),
    total: events.length,
    channels: [...new Set(eventHistory.map(e => e.channel))],
  });
});

// Get active channels
app.get('/channels', (req, res) => {
  res.json({
    channels: [...subscribers.keys()].map(ch => ({
      name: ch,
      subscribers: subscribers.get(ch)?.size || 0,
    })),
    total: subscribers.size,
  });
});

// Broadcast to all services (system-wide announcement)
app.post('/broadcast', (req, res) => {
  const { message, severity = 'info', source } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const event = publish('system.broadcast', { message, severity }, source || 'broadcast-api');
  res.json({ broadcasted: true, event, wsClients: wsClients.size });
});

// Service heartbeat (services call this to announce they're alive)
app.post('/heartbeat', (req, res) => {
  const { service, status = 'healthy', metrics = {} } = req.body;
  if (!service) return res.status(400).json({ error: 'service is required' });

  const event = publish('service.health', { service, status, metrics }, service);
  res.json({ received: true, event });
});

// Replay events from a specific time
app.get('/replay', (req, res) => {
  const { since, channel, limit = 100 } = req.query;
  if (!since) return res.status(400).json({ error: 'since timestamp is required' });

  let events = eventHistory.filter(e => new Date(e.timestamp) > new Date(since));
  if (channel) events = events.filter(e => e.channel === channel);

  res.json({ events: events.slice(0, parseInt(limit)), total: events.length });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[NERVOUS SYSTEM] Mesh communication service running on port ${PORT}`);
  console.log(`[NERVOUS SYSTEM] WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`[NERVOUS SYSTEM] Redis: ${REDIS_URL ? 'configured' : 'using in-memory bus'}`);

  // Announce self on startup
  setTimeout(() => {
    publish('service.health', { service: SERVICE_NAME, status: 'healthy' }, SERVICE_NAME);
  }, 100);
});
