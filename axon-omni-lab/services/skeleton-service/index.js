/**
 * SKELETON SERVICE — Element 1: Sovereign
 * Body Part: Skeleton
 * Role: Infrastructure orchestration on Zeabur
 *
 * Manages service registry, health checks, and deployment topology.
 * The skeleton gives the entire organism its structure.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3009;
const SERVICE_NAME = 'skeleton-service';

// ─── Service Registry ────────────────────────────────────────────────────────
const serviceRegistry = {
  'face-service':          { port: 3000, status: 'unknown', lastSeen: null },
  'brain-service':         { port: 3001, status: 'unknown', lastSeen: null },
  'hands-service':         { port: 3002, status: 'unknown', lastSeen: null },
  'voice-service':         { port: 3003, status: 'unknown', lastSeen: null },
  'consciousness-service': { port: 3004, status: 'unknown', lastSeen: null },
  'wisdom-service':        { port: 3005, status: 'unknown', lastSeen: null },
  'reflexes-service':      { port: 3006, status: 'unknown', lastSeen: null },
  'nervous-system-service':{ port: 3007, status: 'unknown', lastSeen: null },
  'growth-service':        { port: 3008, status: 'unknown', lastSeen: null },
  'skeleton-service':      { port: 3009, status: 'healthy',  lastSeen: new Date().toISOString() },
  'skin-service':          { port: 3010, status: 'unknown', lastSeen: null },
  'dna-service':           { port: 3011, status: 'unknown', lastSeen: null },
};

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Sovereign',
    bodyPart: 'Skeleton',
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Full service registry
app.get('/registry', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    registry: serviceRegistry,
    totalServices: Object.keys(serviceRegistry).length,
    healthyCount: Object.values(serviceRegistry).filter(s => s.status === 'healthy').length,
    timestamp: new Date().toISOString(),
  });
});

// Register / heartbeat from a service
app.post('/registry/heartbeat', (req, res) => {
  const { serviceName, port, status } = req.body;
  if (!serviceName) {
    return res.status(400).json({ error: 'serviceName is required' });
  }
  serviceRegistry[serviceName] = {
    port: port || serviceRegistry[serviceName]?.port,
    status: status || 'healthy',
    lastSeen: new Date().toISOString(),
  };
  res.json({ registered: true, serviceName, timestamp: new Date().toISOString() });
});

// Infrastructure topology
app.get('/topology', (req, res) => {
  res.json({
    platform: 'Zeabur',
    region: process.env.ZEABUR_REGION || 'auto',
    services: Object.entries(serviceRegistry).map(([name, info]) => ({
      name,
      ...info,
      url: process.env[`${name.toUpperCase().replace(/-/g, '_')}_URL`] || `http://localhost:${info.port}`,
    })),
    databases: [
      { name: 'PostgreSQL', role: 'persistence', managed: true },
      { name: 'Redis',      role: 'cache & messaging', managed: true },
    ],
    externalServices: [
      'Cloudflare', 'Pinecone', 'OpenAI', 'DeepSeek',
      'Stripe', 'Gmail', 'Slack', 'GitHub',
    ],
  });
});

// Deployment manifest
app.get('/manifest', (req, res) => {
  res.json({
    name: 'axon-omni-lab',
    version: '1.0.0',
    description: 'The Living Platform — 12 elements, one organism',
    elements: 12,
    deployedAt: process.env.DEPLOY_TIME || new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SKELETON] Sovereign infrastructure service running on port ${PORT}`);
  console.log(`[SKELETON] Service registry initialized with ${Object.keys(serviceRegistry).length} services`);
});
