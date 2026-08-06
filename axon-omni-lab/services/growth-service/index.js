/**
 * GROWTH SERVICE — Element 11: Scaling
 * Body Part: Growth
 * Role: Auto-scaling and load balancing based on demand
 *
 * Growth monitors the organism's vital signs and decides when to
 * expand capacity. Like a body that grows stronger under stress,
 * the platform scales up when demand increases and scales down
 * when it subsides — always maintaining optimal performance.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3008;
const SERVICE_NAME = 'growth-service';

// ─── Service Metrics Store ────────────────────────────────────────────────────
const serviceMetrics = new Map();
const scalingHistory = [];
const alerts = [];

// Scaling thresholds
const THRESHOLDS = {
  cpu:    { scaleUp: 70, scaleDown: 20 },  // percentage
  memory: { scaleUp: 80, scaleDown: 30 },  // percentage
  rps:    { scaleUp: 100, scaleDown: 10 }, // requests per second
  errorRate: { alert: 5 },                  // percentage
};

// Current replica counts (simulated)
const replicaCounts = {
  'face-service':           1,
  'brain-service':          1,
  'hands-service':          1,
  'voice-service':          1,
  'consciousness-service':  1,
  'wisdom-service':         1,
  'reflexes-service':       1,
  'nervous-system-service': 1,
  'growth-service':         1,
  'skeleton-service':       1,
  'skin-service':           1,
  'dna-service':            1,
};

const MIN_REPLICAS = 1;
const MAX_REPLICAS = 10;

// ─── Scaling Logic ────────────────────────────────────────────────────────────
function evaluateScaling(serviceName, metrics) {
  const current = replicaCounts[serviceName] || 1;
  let action = null;
  let reason = null;

  if (metrics.cpu > THRESHOLDS.cpu.scaleUp || metrics.rps > THRESHOLDS.rps.scaleUp) {
    if (current < MAX_REPLICAS) {
      action = 'scale_up';
      reason = `CPU: ${metrics.cpu}% or RPS: ${metrics.rps} exceeds threshold`;
    }
  } else if (metrics.cpu < THRESHOLDS.cpu.scaleDown && metrics.rps < THRESHOLDS.rps.scaleDown) {
    if (current > MIN_REPLICAS) {
      action = 'scale_down';
      reason = `CPU: ${metrics.cpu}% and RPS: ${metrics.rps} below threshold`;
    }
  }

  if (metrics.errorRate > THRESHOLDS.errorRate.alert) {
    alerts.push({
      service: serviceName,
      type: 'high_error_rate',
      value: metrics.errorRate,
      threshold: THRESHOLDS.errorRate.alert,
      timestamp: new Date().toISOString(),
    });
  }

  if (action) {
    const newReplicas = action === 'scale_up' ? current + 1 : current - 1;
    replicaCounts[serviceName] = newReplicas;

    const event = {
      id: `scale-${Date.now()}`,
      service: serviceName,
      action,
      from: current,
      to: newReplicas,
      reason,
      metrics,
      timestamp: new Date().toISOString(),
    };

    scalingHistory.push(event);
    if (scalingHistory.length > 200) scalingHistory.shift();

    console.log(`[GROWTH] ${action.toUpperCase()} ${serviceName}: ${current} → ${newReplicas} replicas (${reason})`);
    return event;
  }

  return null;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Scaling',
    bodyPart: 'Growth',
    status: 'healthy',
    monitoredServices: Object.keys(replicaCounts).length,
    totalReplicas: Object.values(replicaCounts).reduce((a, b) => a + b, 0),
    scalingEvents: scalingHistory.length,
    activeAlerts: alerts.filter(a => {
      const age = Date.now() - new Date(a.timestamp).getTime();
      return age < 60 * 60 * 1000; // last hour
    }).length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Report metrics for a service
app.post('/metrics', (req, res) => {
  const { service, cpu = 0, memory = 0, rps = 0, errorRate = 0, latencyMs = 0, customMetrics = {} } = req.body;
  if (!service) return res.status(400).json({ error: 'service is required' });

  const metrics = {
    service,
    cpu,
    memory,
    rps,
    errorRate,
    latencyMs,
    customMetrics,
    reportedAt: new Date().toISOString(),
  };

  serviceMetrics.set(service, metrics);

  const scalingEvent = evaluateScaling(service, metrics);

  res.json({
    received: true,
    metrics,
    scalingEvent,
    currentReplicas: replicaCounts[service] || 1,
  });
});

// Get metrics for all services
app.get('/metrics', (req, res) => {
  res.json({
    services: Object.fromEntries(serviceMetrics),
    replicaCounts,
    timestamp: new Date().toISOString(),
  });
});

// Get metrics for a specific service
app.get('/metrics/:service', (req, res) => {
  const metrics = serviceMetrics.get(req.params.service);
  if (!metrics) return res.status(404).json({ error: 'No metrics found for this service' });
  res.json({
    metrics,
    replicas: replicaCounts[req.params.service] || 1,
  });
});

// Manual scaling override
app.post('/scale', (req, res) => {
  const { service, replicas, reason = 'manual override' } = req.body;
  if (!service || replicas === undefined) return res.status(400).json({ error: 'service and replicas are required' });

  const clamped = Math.max(MIN_REPLICAS, Math.min(MAX_REPLICAS, parseInt(replicas)));
  const current = replicaCounts[service] || 1;
  replicaCounts[service] = clamped;

  const event = {
    id: `scale-${Date.now()}`,
    service,
    action: clamped > current ? 'scale_up' : clamped < current ? 'scale_down' : 'no_change',
    from: current,
    to: clamped,
    reason,
    manual: true,
    timestamp: new Date().toISOString(),
  };

  scalingHistory.push(event);
  res.json({ event, currentReplicas: clamped });
});

// Scaling history
app.get('/history', (req, res) => {
  const { service, limit = 50 } = req.query;
  let history = scalingHistory;
  if (service) history = history.filter(e => e.service === service);
  res.json({ history: history.slice(-parseInt(limit)), total: history.length });
});

// Active alerts
app.get('/alerts', (req, res) => {
  const { resolved = false } = req.query;
  const cutoff = Date.now() - 60 * 60 * 1000; // last hour
  const active = alerts.filter(a => new Date(a.timestamp).getTime() > cutoff);
  res.json({ alerts: active, total: active.length });
});

// Thresholds config
app.get('/thresholds', (req, res) => {
  res.json({ thresholds: THRESHOLDS, minReplicas: MIN_REPLICAS, maxReplicas: MAX_REPLICAS });
});

app.patch('/thresholds', (req, res) => {
  const { cpu, memory, rps, errorRate } = req.body;
  if (cpu)       Object.assign(THRESHOLDS.cpu, cpu);
  if (memory)    Object.assign(THRESHOLDS.memory, memory);
  if (rps)       Object.assign(THRESHOLDS.rps, rps);
  if (errorRate) Object.assign(THRESHOLDS.errorRate, errorRate);
  res.json({ thresholds: THRESHOLDS });
});

// System-wide overview
app.get('/overview', (req, res) => {
  const totalReplicas = Object.values(replicaCounts).reduce((a, b) => a + b, 0);
  const avgCpu = [...serviceMetrics.values()].reduce((sum, m) => sum + m.cpu, 0) / (serviceMetrics.size || 1);
  const avgMemory = [...serviceMetrics.values()].reduce((sum, m) => sum + m.memory, 0) / (serviceMetrics.size || 1);

  res.json({
    totalServices: Object.keys(replicaCounts).length,
    totalReplicas,
    averageCpu: Math.round(avgCpu),
    averageMemory: Math.round(avgMemory),
    replicaCounts,
    recentScalingEvents: scalingHistory.slice(-5),
    activeAlerts: alerts.filter(a => Date.now() - new Date(a.timestamp).getTime() < 3600000).length,
    timestamp: new Date().toISOString(),
  });
});

// ─── Simulated metrics reporter (for demo purposes) ───────────────────────────
setInterval(() => {
  // Simulate random metric fluctuations for demo
  const services = Object.keys(replicaCounts);
  const randomService = services[Math.floor(Math.random() * services.length)];
  const cpu = Math.floor(Math.random() * 60) + 10;
  const rps = Math.floor(Math.random() * 80) + 5;

  serviceMetrics.set(randomService, {
    service: randomService,
    cpu,
    memory: Math.floor(Math.random() * 50) + 20,
    rps,
    errorRate: Math.random() * 2,
    latencyMs: Math.floor(Math.random() * 100) + 10,
    customMetrics: {},
    reportedAt: new Date().toISOString(),
  });
}, 30_000);

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GROWTH] Auto-scaling service running on port ${PORT}`);
  console.log(`[GROWTH] Monitoring ${Object.keys(replicaCounts).length} services`);
});
