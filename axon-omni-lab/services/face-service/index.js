/**
 * FACE SERVICE — Element 12: Interface
 * Body Part: Face
 * Role: Dashboard UI, REST API gateway, WebSocket, GraphQL
 *
 * The face is how the world sees the organism. It presents a unified
 * interface to users — a beautiful dashboard showing all 12 elements
 * working in harmony, and a powerful API gateway routing requests
 * to the right service.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const SERVICE_NAME = 'face-service';

// ─── Service URLs ─────────────────────────────────────────────────────────────
const SERVICES = {
  brain:        process.env.BRAIN_SERVICE_URL        || 'http://localhost:3001',
  hands:        process.env.HANDS_SERVICE_URL        || 'http://localhost:3002',
  voice:        process.env.VOICE_SERVICE_URL        || 'http://localhost:3003',
  consciousness:process.env.CONSCIOUSNESS_SERVICE_URL|| 'http://localhost:3004',
  wisdom:       process.env.WISDOM_SERVICE_URL       || 'http://localhost:3005',
  reflexes:     process.env.REFLEXES_SERVICE_URL     || 'http://localhost:3006',
  nervous:      process.env.NERVOUS_SYSTEM_URL       || 'http://localhost:3007',
  growth:       process.env.GROWTH_SERVICE_URL       || 'http://localhost:3008',
  skeleton:     process.env.SKELETON_SERVICE_URL     || 'http://localhost:3009',
  skin:         process.env.SKIN_SERVICE_URL         || 'http://localhost:3010',
  dna:          process.env.DNA_SERVICE_URL          || 'http://localhost:3011',
};

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Service-Name');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Request Logger ───────────────────────────────────────────────────────────
const requestLog = [];
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const entry = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      ip: req.headers['cf-connecting-ip'] || req.ip,
      timestamp: new Date().toISOString(),
    };
    requestLog.push(entry);
    if (requestLog.length > 500) requestLog.shift();
  });
  next();
});

// ─── Proxy Helper ─────────────────────────────────────────────────────────────
async function proxyTo(serviceUrl, path, req, res) {
  try {
    const url = `${serviceUrl}${path}`;
    const options = {
      method: req.method,
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-By': SERVICE_NAME },
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
    }
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (err) {
    res.status(503).json({ error: `Service unavailable: ${err.message}`, service: serviceUrl });
  }
}

// ─── Dashboard HTML ───────────────────────────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Axon Omni Lab — Control Center</title>
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #1e1e2e;
      --accent: #7c3aed;
      --accent2: #06b6d4;
      --green: #10b981;
      --red: #ef4444;
      --yellow: #f59e0b;
      --text: #e2e8f0;
      --muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; min-height: 100vh; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%);
      border-bottom: 1px solid var(--border);
      padding: 20px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .logo-text h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .logo-text p { font-size: 12px; color: var(--muted); }
    .status-badge {
      display: flex; align-items: center; gap: 8px;
      background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
      padding: 6px 14px; border-radius: 20px; font-size: 13px; color: var(--green);
    }
    .pulse { width: 8px; height: 8px; background: var(--green); border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.2)} }

    /* Layout */
    .container { max-width: 1400px; margin: 0 auto; padding: 32px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }
    @media(max-width:1024px){ .grid-3,.grid-4{grid-template-columns:repeat(2,1fr)} }
    @media(max-width:640px){ .grid-3,.grid-4,.grid-2{grid-template-columns:1fr} }

    /* Cards */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
    }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .card-title { font-size: 14px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .card-value { font-size: 32px; font-weight: 700; }
    .card-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }

    /* Element Cards */
    .element-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      transition: border-color 0.2s, transform 0.2s;
      cursor: pointer;
    }
    .element-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .element-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .element-icon { font-size: 24px; }
    .element-name { font-size: 14px; font-weight: 600; }
    .element-body { font-size: 11px; color: var(--muted); }
    .element-status { display: flex; align-items: center; gap: 6px; margin-top: 10px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; }
    .dot-green { background: var(--green); }
    .dot-red { background: var(--red); }
    .dot-yellow { background: var(--yellow); }
    .status-text { font-size: 12px; }

    /* Chat */
    .chat-container { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .chat-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
    .chat-messages { height: 320px; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .message { max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; }
    .message.user { background: var(--accent); align-self: flex-end; border-bottom-right-radius: 4px; }
    .message.assistant { background: var(--border); align-self: flex-start; border-bottom-left-radius: 4px; }
    .message.system { background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.3); color: var(--accent2); align-self: center; font-size: 12px; }
    .chat-input { display: flex; gap: 10px; padding: 16px; border-top: 1px solid var(--border); }
    .chat-input input {
      flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
      padding: 10px 14px; color: var(--text); font-size: 14px; outline: none;
    }
    .chat-input input:focus { border-color: var(--accent); }
    .btn {
      background: var(--accent); color: white; border: none; border-radius: 8px;
      padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.85; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
    .btn-outline:hover { border-color: var(--accent); color: var(--accent); }

    /* Metrics */
    .metric-bar { margin-top: 8px; }
    .metric-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 4px; }
    .bar-track { background: var(--border); border-radius: 4px; height: 6px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
    .bar-green { background: var(--green); }
    .bar-yellow { background: var(--yellow); }
    .bar-red { background: var(--red); }
    .bar-blue { background: var(--accent2); }

    /* Events feed */
    .events-feed { height: 200px; overflow-y: auto; }
    .event-item { padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12px; display: flex; gap: 10px; }
    .event-time { color: var(--muted); white-space: nowrap; }
    .event-channel { color: var(--accent2); font-weight: 600; }
    .event-data { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Section titles */
    .section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .section-title span { color: var(--accent); }

    /* Workflow builder */
    .workflow-list { display: flex; flex-direction: column; gap: 10px; }
    .workflow-item {
      background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
      padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
    }
    .workflow-name { font-size: 14px; font-weight: 600; }
    .workflow-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    .badge-green { background: rgba(16,185,129,0.15); color: var(--green); }
    .badge-yellow { background: rgba(245,158,11,0.15); color: var(--yellow); }
    .badge-red { background: rgba(239,68,68,0.15); color: var(--red); }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    /* Loading */
    .loading { color: var(--muted); font-size: 13px; text-align: center; padding: 20px; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>

<div class="header">
  <div class="logo">
    <div class="logo-icon">⚡</div>
    <div class="logo-text">
      <h1>Axon Omni Lab</h1>
      <p>The Living Platform — 12 Elements, One Organism</p>
    </div>
  </div>
  <div class="status-badge">
    <div class="pulse"></div>
    <span id="system-status">SYSTEM ONLINE</span>
  </div>
</div>

<div class="container">

  <!-- KPI Row -->
  <div class="grid-4">
    <div class="card">
      <div class="card-title">Active Services</div>
      <div class="card-value" id="kpi-services">12</div>
      <div class="card-sub">All elements operational</div>
    </div>
    <div class="card">
      <div class="card-title">AI Requests</div>
      <div class="card-value" id="kpi-ai">—</div>
      <div class="card-sub">Total inferences</div>
    </div>
    <div class="card">
      <div class="card-title">Workflows</div>
      <div class="card-value" id="kpi-workflows">—</div>
      <div class="card-sub">Active automations</div>
    </div>
    <div class="card">
      <div class="card-title">Events/min</div>
      <div class="card-value" id="kpi-events">—</div>
      <div class="card-sub">Nervous system activity</div>
    </div>
  </div>

  <!-- 12 Elements Grid -->
  <div class="section-title">⚡ The <span>12 Elements</span></div>
  <div class="grid-4" id="elements-grid">
    <!-- Populated by JS -->
  </div>

  <!-- Chat + Events -->
  <div class="grid-2">
    <div>
      <div class="section-title">🧠 <span>Brain</span> — AI Chat</div>
      <div class="chat-container">
        <div class="chat-header">
          <span style="font-size:18px">🤖</span>
          <div>
            <div style="font-size:14px;font-weight:600">Axon Intelligence</div>
            <div style="font-size:12px;color:var(--muted)" id="chat-model">DeepSeek / GPT-4o</div>
          </div>
        </div>
        <div class="chat-messages" id="chat-messages">
          <div class="message system">Connected to Brain Service. Ask me anything.</div>
        </div>
        <div class="chat-input">
          <input type="text" id="chat-input" placeholder="Ask the brain anything..." />
          <button class="btn" onclick="sendChat()">Send</button>
        </div>
      </div>
    </div>

    <div>
      <div class="section-title">⚡ <span>Nervous System</span> — Live Events</div>
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:14px;font-weight:600">Event Stream</span>
          <span class="badge badge-green" id="ws-status">CONNECTING</span>
        </div>
        <div class="events-feed" id="events-feed" style="padding:0 16px">
          <div class="loading">Connecting to event bus...</div>
        </div>
      </div>

      <div style="margin-top:20px">
        <div class="section-title">📊 <span>Growth</span> — Scaling</div>
        <div class="card">
          <div id="scaling-metrics">
            <div class="loading"><div class="spinner"></div> Loading metrics...</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Workflows -->
  <div class="section-title">⚙️ <span>Reflexes</span> — Automation Workflows</div>
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-size:14px;color:var(--muted)">Active workflow automations</span>
      <button class="btn btn-sm" onclick="createSampleWorkflow()">+ New Workflow</button>
    </div>
    <div class="workflow-list" id="workflow-list">
      <div class="loading">Loading workflows...</div>
    </div>
  </div>

  <!-- Integrations -->
  <div class="section-title">🤝 <span>Hands</span> — Integration Status</div>
  <div class="grid-4" id="integrations-grid">
    <!-- Populated by JS -->
  </div>

</div>

<script>
const API = '';
const ELEMENTS = [
  { id: 1, name: 'Sovereign',    icon: '🦴', body: 'Skeleton',       service: 'skeleton', color: '#94a3b8' },
  { id: 2, name: 'Security',     icon: '🛡️', body: 'Skin',           service: 'skin',     color: '#f59e0b' },
  { id: 3, name: 'Persistence',  icon: '🧬', body: 'DNA',            service: 'dna',      color: '#10b981' },
  { id: 4, name: 'Intelligence', icon: '🧠', body: 'Brain',          service: 'brain',    color: '#7c3aed' },
  { id: 5, name: 'Context',      icon: '💭', body: 'Consciousness',  service: 'consciousness', color: '#06b6d4' },
  { id: 6, name: 'Natural',      icon: '🗣️', body: 'Voice',          service: 'voice',    color: '#ec4899' },
  { id: 7, name: 'Knowledge',    icon: '📚', body: 'Wisdom',         service: 'wisdom',   color: '#8b5cf6' },
  { id: 8, name: 'Integration',  icon: '🤝', body: 'Hands',          service: 'hands',    color: '#f97316' },
  { id: 9, name: 'Automation',   icon: '⚙️', body: 'Reflexes',       service: 'reflexes', color: '#14b8a6' },
  { id: 10, name: 'Mesh',        icon: '🕸️', body: 'Nervous System', service: 'nervous',  color: '#a855f7' },
  { id: 11, name: 'Scaling',     icon: '📈', body: 'Growth',         service: 'growth',   color: '#22c55e' },
  { id: 12, name: 'Interface',   icon: '🎭', body: 'Face',           service: 'face',     color: '#3b82f6' },
];

const INTEGRATIONS_LIST = [
  { name: 'Stripe',    icon: '💳', env: 'STRIPE_SECRET_KEY' },
  { name: 'Gmail',     icon: '📧', env: 'GMAIL_REFRESH_TOKEN' },
  { name: 'Slack',     icon: '💬', env: 'SLACK_BOT_TOKEN' },
  { name: 'GitHub',    icon: '🐙', env: 'GITHUB_TOKEN' },
  { name: 'Zapier',    icon: '⚡', env: 'ZAPIER_WEBHOOK_URL' },
  { name: 'OpenAI',    icon: '🤖', env: 'OPENAI_API_KEY' },
  { name: 'DeepSeek',  icon: '🔮', env: 'DEEPSEEK_API_KEY' },
  { name: 'Pinecone',  icon: '🌲', env: 'PINECONE_API_KEY' },
];

// ── Render Elements Grid ──────────────────────────────────────────────────────
function renderElements(statuses = {}) {
  const grid = document.getElementById('elements-grid');
  grid.innerHTML = ELEMENTS.map(el => {
    const status = statuses[el.service] || 'unknown';
    const dotClass = status === 'healthy' ? 'dot-green' : status === 'unknown' ? 'dot-yellow' : 'dot-red';
    const statusText = status === 'healthy' ? 'Healthy' : status === 'unknown' ? 'Checking...' : 'Offline';
    return \`
      <div class="element-card" onclick="showElementDetail('\${el.service}')">
        <div class="element-header">
          <span class="element-icon">\${el.icon}</span>
          <div>
            <div class="element-name">\${el.name}</div>
            <div class="element-body">\${el.body}</div>
          </div>
        </div>
        <div class="element-status">
          <div class="dot \${dotClass}"></div>
          <span class="status-text" style="color:\${status === 'healthy' ? 'var(--green)' : status === 'unknown' ? 'var(--yellow)' : 'var(--red)'}">\${statusText}</span>
        </div>
      </div>
    \`;
  }).join('');
}

// ── Render Integrations ───────────────────────────────────────────────────────
function renderIntegrations(handsHealth = {}) {
  const grid = document.getElementById('integrations-grid');
  const configured = handsHealth.integrations || {};
  grid.innerHTML = INTEGRATIONS_LIST.map(int => {
    const isConfigured = configured[int.name.toLowerCase()]?.configured;
    return \`
      <div class="card" style="text-align:center">
        <div style="font-size:28px;margin-bottom:8px">\${int.icon}</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:4px">\${int.name}</div>
        <span class="badge \${isConfigured ? 'badge-green' : 'badge-yellow'}">\${isConfigured ? 'Connected' : 'Not configured'}</span>
      </div>
    \`;
  }).join('');
}

// ── Health Checks ─────────────────────────────────────────────────────────────
async function checkHealth() {
  const statuses = {};
  const checks = ELEMENTS.map(async el => {
    try {
      const r = await fetch(\`/api/\${el.service}/health\`, { signal: AbortSignal.timeout(3000) });
      const data = await r.json();
      statuses[el.service] = data.status || (r.ok ? 'healthy' : 'error');
      return { service: el.service, data };
    } catch {
      statuses[el.service] = 'offline';
      return { service: el.service, data: null };
    }
  });

  const results = await Promise.allSettled(checks);
  renderElements(statuses);

  const healthy = Object.values(statuses).filter(s => s === 'healthy').length;
  document.getElementById('kpi-services').textContent = \`\${healthy}/12\`;

  // Update integrations from hands health
  const handsResult = results.find(r => r.value?.service === 'hands');
  if (handsResult?.value?.data) renderIntegrations(handsResult.value.data);

  // Update brain stats
  const brainResult = results.find(r => r.value?.service === 'brain');
  if (brainResult?.value?.data?.stats) {
    document.getElementById('kpi-ai').textContent = brainResult.value.data.stats.totalRequests || 0;
  }
}

// ── Load Workflows ────────────────────────────────────────────────────────────
async function loadWorkflows() {
  try {
    const r = await fetch('/api/reflexes/workflows');
    const data = await r.json();
    const list = document.getElementById('workflow-list');
    document.getElementById('kpi-workflows').textContent = data.total || 0;

    if (!data.workflows || data.workflows.length === 0) {
      list.innerHTML = '<div class="loading">No workflows yet. Create one to get started.</div>';
      return;
    }

    list.innerHTML = data.workflows.map(wf => \`
      <div class="workflow-item">
        <div>
          <div class="workflow-name">\${wf.name}</div>
          <div class="workflow-meta">Trigger: \${wf.trigger?.type || 'manual'} · Steps: \${wf.steps?.length || 0} · Runs: \${wf.executionCount || 0}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge \${wf.enabled ? 'badge-green' : 'badge-yellow'}">\${wf.enabled ? 'Active' : 'Paused'}</span>
          <button class="btn btn-sm btn-outline" onclick="triggerWorkflow(\${wf.id})">▶ Run</button>
        </div>
      </div>
    \`).join('');
  } catch (err) {
    document.getElementById('workflow-list').innerHTML = '<div class="loading">Could not load workflows</div>';
  }
}

// ── Load Scaling Metrics ──────────────────────────────────────────────────────
async function loadScalingMetrics() {
  try {
    const r = await fetch('/api/growth/overview');
    const data = await r.json();
    const el = document.getElementById('scaling-metrics');

    const cpuPct = data.averageCpu || 0;
    const memPct = data.averageMemory || 0;
    const cpuColor = cpuPct > 70 ? 'bar-red' : cpuPct > 40 ? 'bar-yellow' : 'bar-green';
    const memColor = memPct > 80 ? 'bar-red' : memPct > 50 ? 'bar-yellow' : 'bar-green';

    el.innerHTML = \`
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="font-size:13px;color:var(--muted)">Total Replicas: <strong style="color:var(--text)">\${data.totalReplicas || 12}</strong></span>
        <span style="font-size:13px;color:var(--muted)">Services: <strong style="color:var(--text)">\${data.totalServices || 12}</strong></span>
      </div>
      <div class="metric-bar">
        <div class="metric-label"><span>CPU Usage</span><span>\${cpuPct}%</span></div>
        <div class="bar-track"><div class="bar-fill \${cpuColor}" style="width:\${cpuPct}%"></div></div>
      </div>
      <div class="metric-bar" style="margin-top:10px">
        <div class="metric-label"><span>Memory Usage</span><span>\${memPct}%</span></div>
        <div class="bar-track"><div class="bar-fill \${memColor}" style="width:\${memPct}%"></div></div>
      </div>
      \${data.activeAlerts > 0 ? \`<div style="margin-top:12px;padding:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;font-size:12px;color:var(--red)">⚠️ \${data.activeAlerts} active alert(s)</div>\` : ''}
    \`;
  } catch {
    document.getElementById('scaling-metrics').innerHTML = '<div class="loading">Metrics unavailable</div>';
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────
let chatHistory = [];

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  addMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  const thinkingId = addMessage('assistant', '⏳ Thinking...');

  try {
    const r = await fetch('/api/brain/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, context: chatHistory.slice(-10) }),
    });
    const data = await r.json();
    const reply = data.reply || data.error || 'No response';
    updateMessage(thinkingId, reply);
    chatHistory.push({ role: 'assistant', content: reply });
    if (data.model) document.getElementById('chat-model').textContent = data.model + (data.mock ? ' (mock)' : '');
  } catch (err) {
    updateMessage(thinkingId, 'Error: ' + err.message);
  }
}

let msgId = 0;
function addMessage(role, content) {
  const id = 'msg-' + (++msgId);
  const feed = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'message ' + role;
  div.id = id;
  div.textContent = content;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
  return id;
}

function updateMessage(id, content) {
  const el = document.getElementById(id);
  if (el) el.textContent = content;
}

document.getElementById('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChat();
});

// ── WebSocket Events ──────────────────────────────────────────────────────────
function connectWebSocket() {
  const wsUrl = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws';
  let ws;
  try {
    ws = new WebSocket(wsUrl);
  } catch { return; }

  ws.onopen = () => {
    document.getElementById('ws-status').textContent = 'LIVE';
    document.getElementById('ws-status').className = 'badge badge-green';
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'connected') {
        addEventToFeed({ channel: 'system', data: { message: 'Connected to nervous system' }, timestamp: new Date().toISOString() });
        (data.recentEvents || []).slice(-5).forEach(addEventToFeed);
        return;
      }
      addEventToFeed(data);
      document.getElementById('kpi-events').textContent = (parseInt(document.getElementById('kpi-events').textContent) || 0) + 1;
    } catch {}
  };

  ws.onclose = () => {
    document.getElementById('ws-status').textContent = 'RECONNECTING';
    document.getElementById('ws-status').className = 'badge badge-yellow';
    setTimeout(connectWebSocket, 3000);
  };
}

function addEventToFeed(event) {
  const feed = document.getElementById('events-feed');
  if (feed.querySelector('.loading')) feed.innerHTML = '';

  const div = document.createElement('div');
  div.className = 'event-item';
  const time = new Date(event.timestamp).toLocaleTimeString();
  const dataStr = typeof event.data === 'object' ? JSON.stringify(event.data) : String(event.data);
  div.innerHTML = \`
    <span class="event-time">\${time}</span>
    <span class="event-channel">\${event.channel}</span>
    <span class="event-data">\${dataStr}</span>
  \`;
  feed.insertBefore(div, feed.firstChild);

  // Keep max 50 events
  while (feed.children.length > 50) feed.removeChild(feed.lastChild);
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function triggerWorkflow(id) {
  try {
    const r = await fetch(\`/api/reflexes/workflows/\${id}/trigger\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await r.json();
    alert(\`Workflow executed: \${data.execution?.status || 'triggered'}\`);
    loadWorkflows();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function createSampleWorkflow() {
  try {
    await fetch('/api/reflexes/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sample Automation ' + Date.now(),
        description: 'Auto-created sample workflow',
        trigger: { type: 'manual' },
        steps: [
          { name: 'wait', type: 'wait', params: { seconds: 1 } },
          { name: 'transform', type: 'transform', params: { input: { status: 'done' }, template: 'Workflow completed: {{status}}' } },
        ],
        enabled: true,
      }),
    });
    loadWorkflows();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function showElementDetail(service) {
  window.open(\`/api/\${service}/health\`, '_blank');
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderElements();
renderIntegrations();
checkHealth();
loadWorkflows();
loadScalingMetrics();
connectWebSocket();

// Refresh every 30 seconds
setInterval(() => { checkHealth(); loadWorkflows(); loadScalingMetrics(); }, 30000);
</script>
</body>
</html>`;

// ─── HTTP Server + WebSocket ──────────────────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

// Forward events from nervous-system WebSocket to dashboard clients
function broadcastToClients(data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  wsClients.forEach(ws => {
    if (ws.readyState === 1) {
      try { ws.send(payload); } catch (_) {}
    }
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Dashboard
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(DASHBOARD_HTML);
});

// Health
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Interface',
    bodyPart: 'Face',
    status: 'healthy',
    services: Object.keys(SERVICES),
    wsClients: wsClients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── API Gateway — proxy all /api/:service/* to the right service ──────────────
app.all('/api/:service/*', async (req, res) => {
  const { service } = req.params;
  const serviceUrl = SERVICES[service];

  if (!serviceUrl) {
    return res.status(404).json({
      error: `Unknown service: ${service}`,
      availableServices: Object.keys(SERVICES),
    });
  }

  const path = req.path.replace(`/api/${service}`, '') || '/';
  await proxyTo(serviceUrl, path, req, res);
});

// ── GraphQL endpoint (simplified) ────────────────────────────────────────────
app.post('/graphql', async (req, res) => {
  const { query, variables } = req.body;

  // Minimal GraphQL-like resolver
  if (!query) return res.status(400).json({ errors: [{ message: 'query is required' }] });

  const data = {};

  try {
    if (query.includes('systemHealth')) {
      const healthChecks = await Promise.allSettled(
        Object.entries(SERVICES).map(async ([name, url]) => {
          const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
          return { name, ...(await r.json()) };
        })
      );
      data.systemHealth = healthChecks
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
    }

    if (query.includes('workflows')) {
      const r = await fetch(`${SERVICES.reflexes}/workflows`);
      const d = await r.json();
      data.workflows = d.workflows || [];
    }

    if (query.includes('conversations')) {
      const r = await fetch(`${SERVICES.dna}/conversations`);
      const d = await r.json();
      data.conversations = d.conversations || [];
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ errors: [{ message: err.message }] });
  }
});

// ── WebSocket event relay (from nervous system) ───────────────────────────────
app.post('/relay', (req, res) => {
  broadcastToClients(req.body);
  res.json({ relayed: true, clients: wsClients.size });
});

// ── Request log ───────────────────────────────────────────────────────────────
app.get('/logs', (req, res) => {
  const { limit = 50 } = req.query;
  res.json({ logs: requestLog.slice(-parseInt(limit)), total: requestLog.length });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[FACE] Dashboard & API gateway running on port ${PORT}`);
  console.log(`[FACE] Dashboard: http://localhost:${PORT}`);
  console.log(`[FACE] API Gateway: http://localhost:${PORT}/api/:service/*`);
  console.log(`[FACE] GraphQL: http://localhost:${PORT}/graphql`);
  console.log(`[FACE] WebSocket: ws://localhost:${PORT}/ws`);
});
