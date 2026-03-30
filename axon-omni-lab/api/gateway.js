/**
 * AXON OMNI LAB — API Gateway
 * Unified entry point for all 12 service APIs
 *
 * This gateway can be run standalone or embedded in face-service.
 * It handles routing, auth, rate limiting, and request logging.
 */

import express from 'express';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.GATEWAY_PORT || 4000;

// ─── Service Registry ─────────────────────────────────────────────────────────
const SERVICES = {
  skeleton:      { url: process.env.SKELETON_SERVICE_URL      || 'http://localhost:3009', element: 1,  name: 'Sovereign' },
  skin:          { url: process.env.SKIN_SERVICE_URL          || 'http://localhost:3010', element: 2,  name: 'Security' },
  dna:           { url: process.env.DNA_SERVICE_URL           || 'http://localhost:3011', element: 3,  name: 'Persistence' },
  brain:         { url: process.env.BRAIN_SERVICE_URL         || 'http://localhost:3001', element: 4,  name: 'Intelligence' },
  consciousness: { url: process.env.CONSCIOUSNESS_SERVICE_URL || 'http://localhost:3004', element: 5,  name: 'Context' },
  voice:         { url: process.env.VOICE_SERVICE_URL         || 'http://localhost:3003', element: 6,  name: 'Natural' },
  wisdom:        { url: process.env.WISDOM_SERVICE_URL        || 'http://localhost:3005', element: 7,  name: 'Knowledge' },
  hands:         { url: process.env.HANDS_SERVICE_URL         || 'http://localhost:3002', element: 8,  name: 'Integration' },
  reflexes:      { url: process.env.REFLEXES_SERVICE_URL      || 'http://localhost:3006', element: 9,  name: 'Automation' },
  nervous:       { url: process.env.NERVOUS_SYSTEM_URL        || 'http://localhost:3007', element: 10, name: 'Mesh' },
  growth:        { url: process.env.GROWTH_SERVICE_URL        || 'http://localhost:3008', element: 11, name: 'Scaling' },
  face:          { url: process.env.FACE_SERVICE_URL          || 'http://localhost:3000', element: 12, name: 'Interface' },
};

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key,X-Service-Name');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Request ID
app.use((req, res, next) => {
  req.requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Request logger
const requestLog = [];
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    requestLog.push({
      id:        req.requestId,
      method:    req.method,
      path:      req.path,
      status:    res.statusCode,
      ms:        Date.now() - start,
      service:   req.targetService,
      timestamp: new Date().toISOString(),
    });
    if (requestLog.length > 1000) requestLog.shift();
  });
  next();
});

// Simple API key auth (optional — set REQUIRE_API_KEY=true)
const VALID_API_KEYS = new Set(
  (process.env.API_KEYS || '').split(',').filter(Boolean)
);

app.use((req, res, next) => {
  if (process.env.REQUIRE_API_KEY !== 'true') return next();
  if (req.path === '/health' || req.path === '/') return next();

  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key || !VALID_API_KEYS.has(key)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
});

// ─── Proxy Helper ─────────────────────────────────────────────────────────────
async function proxyRequest(targetUrl, req, res) {
  const options = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-By': 'axon-gateway',
      'X-Request-ID': req.requestId,
      ...(req.headers.authorization && { Authorization: req.headers.authorization }),
    },
  };

  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    options.body = JSON.stringify(req.body);
  }

  const queryString = Object.keys(req.query).length
    ? '?' + new URLSearchParams(req.query).toString()
    : '';

  try {
    const response = await fetch(`${targetUrl}${queryString}`, options);
    const contentType = response.headers.get('content-type') || '';

    res.status(response.status);
    res.setHeader('X-Served-By', targetUrl);

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.setHeader('Content-Type', contentType);
      res.send(text);
    }
  } catch (err) {
    res.status(503).json({
      error: 'Service unavailable',
      target: targetUrl,
      message: err.message,
      requestId: req.requestId,
    });
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Gateway health
app.get('/health', (req, res) => {
  res.json({
    service: 'axon-gateway',
    status: 'healthy',
    services: Object.keys(SERVICES).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Gateway root
app.get('/', (req, res) => {
  res.json({
    name: 'Axon Omni Lab API Gateway',
    version: '1.0.0',
    elements: 12,
    routes: Object.entries(SERVICES).map(([key, svc]) => ({
      path: `/api/${key}/*`,
      element: svc.element,
      name: svc.name,
      url: svc.url,
    })),
    docs: '/docs',
    health: '/health',
    logs: '/logs',
  });
});

// System-wide health check (all services)
app.get('/api/health', async (req, res) => {
  const checks = await Promise.allSettled(
    Object.entries(SERVICES).map(async ([key, svc]) => {
      const start = Date.now();
      try {
        const r = await fetch(`${svc.url}/health`, { signal: AbortSignal.timeout(3000) });
        const data = await r.json();
        return { service: key, element: svc.element, name: svc.name, status: data.status || 'healthy', latencyMs: Date.now() - start };
      } catch (err) {
        return { service: key, element: svc.element, name: svc.name, status: 'offline', error: err.message, latencyMs: Date.now() - start };
      }
    })
  );

  const results = checks.map(c => c.value || c.reason);
  const healthy = results.filter(r => r.status === 'healthy').length;

  res.json({
    overall: healthy === 12 ? 'healthy' : healthy > 8 ? 'degraded' : 'critical',
    healthy,
    total: 12,
    services: results,
    timestamp: new Date().toISOString(),
  });
});

// ── Service-specific routes ───────────────────────────────────────────────────

// Brain (AI)
app.post('/api/brain/chat',      (req, res) => { req.targetService = 'brain';   proxyRequest(`${SERVICES.brain.url}/chat`, req, res); });
app.post('/api/brain/infer',     (req, res) => { req.targetService = 'brain';   proxyRequest(`${SERVICES.brain.url}/infer`, req, res); });
app.post('/api/brain/reason',    (req, res) => { req.targetService = 'brain';   proxyRequest(`${SERVICES.brain.url}/reason`, req, res); });
app.post('/api/brain/summarize', (req, res) => { req.targetService = 'brain';   proxyRequest(`${SERVICES.brain.url}/summarize`, req, res); });
app.get('/api/brain/models',     (req, res) => { req.targetService = 'brain';   proxyRequest(`${SERVICES.brain.url}/models`, req, res); });
app.get('/api/brain/stats',      (req, res) => { req.targetService = 'brain';   proxyRequest(`${SERVICES.brain.url}/stats`, req, res); });

// Voice (NLP)
app.post('/api/voice/analyze',       (req, res) => { req.targetService = 'voice'; proxyRequest(`${SERVICES.voice.url}/analyze`, req, res); });
app.post('/api/voice/intent',        (req, res) => { req.targetService = 'voice'; proxyRequest(`${SERVICES.voice.url}/intent`, req, res); });
app.post('/api/voice/sentiment',     (req, res) => { req.targetService = 'voice'; proxyRequest(`${SERVICES.voice.url}/sentiment`, req, res); });
app.post('/api/voice/parse-command', (req, res) => { req.targetService = 'voice'; proxyRequest(`${SERVICES.voice.url}/parse-command`, req, res); });
app.post('/api/voice/speak',         (req, res) => { req.targetService = 'voice'; proxyRequest(`${SERVICES.voice.url}/speak`, req, res); });

// Wisdom (Vector DB)
app.post('/api/wisdom/upsert',       (req, res) => { req.targetService = 'wisdom'; proxyRequest(`${SERVICES.wisdom.url}/upsert`, req, res); });
app.post('/api/wisdom/search',       (req, res) => { req.targetService = 'wisdom'; proxyRequest(`${SERVICES.wisdom.url}/search`, req, res); });
app.post('/api/wisdom/rag',          (req, res) => { req.targetService = 'wisdom'; proxyRequest(`${SERVICES.wisdom.url}/rag`, req, res); });
app.get('/api/wisdom/documents',     (req, res) => { req.targetService = 'wisdom'; proxyRequest(`${SERVICES.wisdom.url}/documents`, req, res); });
app.get('/api/wisdom/stats',         (req, res) => { req.targetService = 'wisdom'; proxyRequest(`${SERVICES.wisdom.url}/stats`, req, res); });

// Consciousness (Context)
app.post('/api/consciousness/sessions',                    (req, res) => { req.targetService = 'consciousness'; proxyRequest(`${SERVICES.consciousness.url}/sessions`, req, res); });
app.get('/api/consciousness/sessions/:id',                 (req, res) => { req.targetService = 'consciousness'; proxyRequest(`${SERVICES.consciousness.url}/sessions/${req.params.id}`, req, res); });
app.post('/api/consciousness/sessions/:id/messages',       (req, res) => { req.targetService = 'consciousness'; proxyRequest(`${SERVICES.consciousness.url}/sessions/${req.params.id}/messages`, req, res); });
app.get('/api/consciousness/sessions/:id/context',         (req, res) => { req.targetService = 'consciousness'; proxyRequest(`${SERVICES.consciousness.url}/sessions/${req.params.id}/context`, req, res); });
app.get('/api/consciousness/context/:userId',              (req, res) => { req.targetService = 'consciousness'; proxyRequest(`${SERVICES.consciousness.url}/context/${req.params.userId}`, req, res); });

// Hands (Integrations)
app.post('/api/hands/stripe/charge',   (req, res) => { req.targetService = 'hands'; proxyRequest(`${SERVICES.hands.url}/stripe/charge`, req, res); });
app.post('/api/hands/stripe/customer', (req, res) => { req.targetService = 'hands'; proxyRequest(`${SERVICES.hands.url}/stripe/customer`, req, res); });
app.post('/api/hands/slack/message',   (req, res) => { req.targetService = 'hands'; proxyRequest(`${SERVICES.hands.url}/slack/message`, req, res); });
app.post('/api/hands/slack/notify',    (req, res) => { req.targetService = 'hands'; proxyRequest(`${SERVICES.hands.url}/slack/notify`, req, res); });
app.post('/api/hands/gmail/send',      (req, res) => { req.targetService = 'hands'; proxyRequest(`${SERVICES.hands.url}/gmail/send`, req, res); });
app.post('/api/hands/github/issue',    (req, res) => { req.targetService = 'hands'; proxyRequest(`${SERVICES.hands.url}/github/issue`, req, res); });
app.post('/api/hands/zapier/trigger',  (req, res) => { req.targetService = 'hands'; proxyRequest(`${SERVICES.hands.url}/zapier/trigger`, req, res); });

// Reflexes (Automation)
app.get('/api/reflexes/workflows',              (req, res) => { req.targetService = 'reflexes'; proxyRequest(`${SERVICES.reflexes.url}/workflows`, req, res); });
app.post('/api/reflexes/workflows',             (req, res) => { req.targetService = 'reflexes'; proxyRequest(`${SERVICES.reflexes.url}/workflows`, req, res); });
app.get('/api/reflexes/workflows/:id',          (req, res) => { req.targetService = 'reflexes'; proxyRequest(`${SERVICES.reflexes.url}/workflows/${req.params.id}`, req, res); });
app.patch('/api/reflexes/workflows/:id',        (req, res) => { req.targetService = 'reflexes'; proxyRequest(`${SERVICES.reflexes.url}/workflows/${req.params.id}`, req, res); });
app.delete('/api/reflexes/workflows/:id',       (req, res) => { req.targetService = 'reflexes'; proxyRequest(`${SERVICES.reflexes.url}/workflows/${req.params.id}`, req, res); });
app.post('/api/reflexes/workflows/:id/trigger', (req, res) => { req.targetService = 'reflexes'; proxyRequest(`${SERVICES.reflexes.url}/workflows/${req.params.id}/trigger`, req, res); });
app.get('/api/reflexes/executions',             (req, res) => { req.targetService = 'reflexes'; proxyRequest(`${SERVICES.reflexes.url}/executions`, req, res); });

// DNA (Persistence)
app.get('/api/dna/users',              (req, res) => { req.targetService = 'dna'; proxyRequest(`${SERVICES.dna.url}/users`, req, res); });
app.post('/api/dna/users',             (req, res) => { req.targetService = 'dna'; proxyRequest(`${SERVICES.dna.url}/users`, req, res); });
app.get('/api/dna/conversations',      (req, res) => { req.targetService = 'dna'; proxyRequest(`${SERVICES.dna.url}/conversations`, req, res); });
app.post('/api/dna/conversations',     (req, res) => { req.targetService = 'dna'; proxyRequest(`${SERVICES.dna.url}/conversations`, req, res); });
app.get('/api/dna/workflows',          (req, res) => { req.targetService = 'dna'; proxyRequest(`${SERVICES.dna.url}/workflows`, req, res); });
app.get('/api/dna/audit',              (req, res) => { req.targetService = 'dna'; proxyRequest(`${SERVICES.dna.url}/audit`, req, res); });
app.get('/api/dna/schema',             (req, res) => { req.targetService = 'dna'; proxyRequest(`${SERVICES.dna.url}/schema`, req, res); });

// Nervous System (Events)
app.post('/api/nervous/publish',    (req, res) => { req.targetService = 'nervous'; proxyRequest(`${SERVICES.nervous.url}/publish`, req, res); });
app.get('/api/nervous/events',      (req, res) => { req.targetService = 'nervous'; proxyRequest(`${SERVICES.nervous.url}/events`, req, res); });
app.get('/api/nervous/channels',    (req, res) => { req.targetService = 'nervous'; proxyRequest(`${SERVICES.nervous.url}/channels`, req, res); });
app.post('/api/nervous/broadcast',  (req, res) => { req.targetService = 'nervous'; proxyRequest(`${SERVICES.nervous.url}/broadcast`, req, res); });
app.post('/api/nervous/heartbeat',  (req, res) => { req.targetService = 'nervous'; proxyRequest(`${SERVICES.nervous.url}/heartbeat`, req, res); });

// Growth (Scaling)
app.post('/api/growth/metrics',    (req, res) => { req.targetService = 'growth'; proxyRequest(`${SERVICES.growth.url}/metrics`, req, res); });
app.get('/api/growth/metrics',     (req, res) => { req.targetService = 'growth'; proxyRequest(`${SERVICES.growth.url}/metrics`, req, res); });
app.post('/api/growth/scale',      (req, res) => { req.targetService = 'growth'; proxyRequest(`${SERVICES.growth.url}/scale`, req, res); });
app.get('/api/growth/history',     (req, res) => { req.targetService = 'growth'; proxyRequest(`${SERVICES.growth.url}/history`, req, res); });
app.get('/api/growth/overview',    (req, res) => { req.targetService = 'growth'; proxyRequest(`${SERVICES.growth.url}/overview`, req, res); });
app.get('/api/growth/alerts',      (req, res) => { req.targetService = 'growth'; proxyRequest(`${SERVICES.growth.url}/alerts`, req, res); });

// Skin (Security)
app.get('/api/skin/posture',       (req, res) => { req.targetService = 'skin'; proxyRequest(`${SERVICES.skin.url}/posture`, req, res); });
app.get('/api/skin/threats',       (req, res) => { req.targetService = 'skin'; proxyRequest(`${SERVICES.skin.url}/threats`, req, res); });
app.post('/api/skin/threats/report',(req, res) => { req.targetService = 'skin'; proxyRequest(`${SERVICES.skin.url}/threats/report`, req, res); });
app.get('/api/skin/waf/rules',     (req, res) => { req.targetService = 'skin'; proxyRequest(`${SERVICES.skin.url}/waf/rules`, req, res); });
app.post('/api/skin/validate',     (req, res) => { req.targetService = 'skin'; proxyRequest(`${SERVICES.skin.url}/validate`, req, res); });

// Skeleton (Infrastructure)
app.get('/api/skeleton/registry',  (req, res) => { req.targetService = 'skeleton'; proxyRequest(`${SERVICES.skeleton.url}/registry`, req, res); });
app.get('/api/skeleton/topology',  (req, res) => { req.targetService = 'skeleton'; proxyRequest(`${SERVICES.skeleton.url}/topology`, req, res); });
app.get('/api/skeleton/manifest',  (req, res) => { req.targetService = 'skeleton'; proxyRequest(`${SERVICES.skeleton.url}/manifest`, req, res); });

// ── Catch-all proxy ───────────────────────────────────────────────────────────
app.all('/api/:service/*', async (req, res) => {
  const { service } = req.params;
  const svc = SERVICES[service];

  if (!svc) {
    return res.status(404).json({
      error: `Unknown service: ${service}`,
      available: Object.keys(SERVICES),
    });
  }

  const path = req.path.replace(`/api/${service}`, '') || '/';
  req.targetService = service;
  await proxyRequest(`${svc.url}${path}`, req, res);
});

// ── Logs ──────────────────────────────────────────────────────────────────────
app.get('/logs', (req, res) => {
  const { limit = 50, service } = req.query;
  let logs = requestLog;
  if (service) logs = logs.filter(l => l.service === service);
  res.json({ logs: logs.slice(-parseInt(limit)), total: logs.length });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
if (process.env.RUN_GATEWAY_STANDALONE === 'true') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GATEWAY] API Gateway running on port ${PORT}`);
    console.log(`[GATEWAY] Routing to ${Object.keys(SERVICES).length} services`);
  });
}

export default app;
