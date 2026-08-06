/**
 * HANDS SERVICE — Element 8: Integration
 * Body Part: Hands
 * Role: Third-party app connections — Stripe, Gmail, Slack, GitHub, Zapier
 *
 * The hands reach out and interact with the external world.
 * They execute actions in other systems on behalf of the organism.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;
const SERVICE_NAME = 'hands-service';

// ─── Integration Config ───────────────────────────────────────────────────────
const INTEGRATIONS = {
  stripe: {
    apiKey:    process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    baseUrl:   'https://api.stripe.com/v1',
  },
  gmail: {
    clientId:     process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  },
  slack: {
    botToken:    process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    baseUrl:     'https://slack.com/api',
  },
  github: {
    token:   process.env.GITHUB_TOKEN,
    baseUrl: 'https://api.github.com',
  },
  zapier: {
    webhookUrl: process.env.ZAPIER_WEBHOOK_URL,
  },
};

// ─── Execution Log ────────────────────────────────────────────────────────────
const executionLog = [];

function logExecution(integration, action, payload, result, error = null) {
  executionLog.push({
    id: `exec-${Date.now()}`,
    integration,
    action,
    payload: JSON.stringify(payload).slice(0, 200),
    success: !error,
    error: error?.message,
    timestamp: new Date().toISOString(),
  });
  if (executionLog.length > 500) executionLog.shift();
}

// ─── Helper: make authenticated request ──────────────────────────────────────
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`API error ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Integration',
    bodyPart: 'Hands',
    status: 'healthy',
    integrations: Object.fromEntries(
      Object.entries(INTEGRATIONS).map(([name, cfg]) => [
        name,
        { configured: Object.values(cfg).some(v => !!v) },
      ])
    ),
    executionCount: executionLog.length,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Stripe ────────────────────────────────────────────────────────────────────

app.post('/stripe/charge', async (req, res) => {
  const { amount, currency = 'usd', customerId, description, metadata = {} } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required (in cents)' });

  if (!INTEGRATIONS.stripe.apiKey) {
    const mock = { id: `pi_mock_${Date.now()}`, amount, currency, status: 'succeeded', mock: true };
    logExecution('stripe', 'charge', req.body, mock);
    return res.json(mock);
  }

  try {
    const params = new URLSearchParams({ amount, currency, description: description || 'Axon charge' });
    if (customerId) params.append('customer', customerId);
    Object.entries(metadata).forEach(([k, v]) => params.append(`metadata[${k}]`, v));

    const result = await apiRequest(`${INTEGRATIONS.stripe.baseUrl}/payment_intents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${INTEGRATIONS.stripe.apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    logExecution('stripe', 'charge', req.body, result);
    res.json(result);
  } catch (err) {
    logExecution('stripe', 'charge', req.body, null, err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/stripe/customer', async (req, res) => {
  const { email, name, metadata = {} } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  if (!INTEGRATIONS.stripe.apiKey) {
    const mock = { id: `cus_mock_${Date.now()}`, email, name, mock: true };
    logExecution('stripe', 'create_customer', req.body, mock);
    return res.json(mock);
  }

  try {
    const params = new URLSearchParams({ email });
    if (name) params.append('name', name);
    const result = await apiRequest(`${INTEGRATIONS.stripe.baseUrl}/customers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${INTEGRATIONS.stripe.apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    logExecution('stripe', 'create_customer', req.body, result);
    res.json(result);
  } catch (err) {
    logExecution('stripe', 'create_customer', req.body, null, err);
    res.status(500).json({ error: err.message });
  }
});

// ── Slack ─────────────────────────────────────────────────────────────────────

app.post('/slack/message', async (req, res) => {
  const { channel, text, blocks, username = 'Axon Omni Lab' } = req.body;
  if (!channel || !text) return res.status(400).json({ error: 'channel and text are required' });

  if (!INTEGRATIONS.slack.botToken) {
    const mock = { ok: true, ts: `${Date.now()}`, channel, mock: true };
    logExecution('slack', 'send_message', req.body, mock);
    return res.json(mock);
  }

  try {
    const result = await apiRequest(`${INTEGRATIONS.slack.baseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${INTEGRATIONS.slack.botToken}` },
      body: JSON.stringify({ channel, text, blocks, username }),
    });
    logExecution('slack', 'send_message', req.body, result);
    res.json(result);
  } catch (err) {
    logExecution('slack', 'send_message', req.body, null, err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/slack/notify', async (req, res) => {
  const { channel = '#general', title, message, color = 'good', fields = [] } = req.body;

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${title || 'Axon Notification'}*\n${message}` },
    },
    ...(fields.length ? [{
      type: 'section',
      fields: fields.map(f => ({ type: 'mrkdwn', text: `*${f.label}*\n${f.value}` })),
    }] : []),
  ];

  req.body = { channel, text: message, blocks };
  // Delegate to /slack/message handler logic
  if (!INTEGRATIONS.slack.botToken) {
    return res.json({ ok: true, mock: true, channel, title, message });
  }

  try {
    const result = await apiRequest(`${INTEGRATIONS.slack.baseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${INTEGRATIONS.slack.botToken}` },
      body: JSON.stringify({ channel, text: message, blocks }),
    });
    logExecution('slack', 'notify', { channel, title, message }, result);
    res.json(result);
  } catch (err) {
    logExecution('slack', 'notify', { channel, title, message }, null, err);
    res.status(500).json({ error: err.message });
  }
});

// ── Gmail ─────────────────────────────────────────────────────────────────────

app.post('/gmail/send', async (req, res) => {
  const { to, subject, body, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'to and subject are required' });

  if (!INTEGRATIONS.gmail.refreshToken) {
    const mock = { id: `msg_mock_${Date.now()}`, to, subject, mock: true };
    logExecution('gmail', 'send_email', req.body, mock);
    return res.json(mock);
  }

  // In production: use googleapis library with OAuth2 client
  res.json({
    message: 'Gmail integration requires OAuth2 setup',
    to, subject,
    setup: 'Configure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN',
  });
});

// ── GitHub ────────────────────────────────────────────────────────────────────

app.post('/github/issue', async (req, res) => {
  const { owner, repo, title, body, labels = [] } = req.body;
  if (!owner || !repo || !title) return res.status(400).json({ error: 'owner, repo, and title are required' });

  if (!INTEGRATIONS.github.token) {
    const mock = { id: Date.now(), number: 1, title, html_url: `https://github.com/${owner}/${repo}/issues/1`, mock: true };
    logExecution('github', 'create_issue', req.body, mock);
    return res.json(mock);
  }

  try {
    const result = await apiRequest(`${INTEGRATIONS.github.baseUrl}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${INTEGRATIONS.github.token}`, 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify({ title, body, labels }),
    });
    logExecution('github', 'create_issue', req.body, result);
    res.json(result);
  } catch (err) {
    logExecution('github', 'create_issue', req.body, null, err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/github/repos/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;

  if (!INTEGRATIONS.github.token) {
    return res.json({ name: repo, owner: { login: owner }, mock: true });
  }

  try {
    const result = await apiRequest(`${INTEGRATIONS.github.baseUrl}/repos/${owner}/${repo}`, {
      headers: { 'Authorization': `Bearer ${INTEGRATIONS.github.token}`, 'Accept': 'application/vnd.github.v3+json' },
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Zapier ────────────────────────────────────────────────────────────────────

app.post('/zapier/trigger', async (req, res) => {
  const { event, data } = req.body;
  if (!event) return res.status(400).json({ error: 'event is required' });

  if (!INTEGRATIONS.zapier.webhookUrl) {
    const mock = { triggered: true, event, mock: true, timestamp: new Date().toISOString() };
    logExecution('zapier', 'trigger', req.body, mock);
    return res.json(mock);
  }

  try {
    const result = await apiRequest(INTEGRATIONS.zapier.webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ event, data, source: 'axon-omni-lab', timestamp: new Date().toISOString() }),
    });
    logExecution('zapier', 'trigger', req.body, result);
    res.json({ triggered: true, result });
  } catch (err) {
    logExecution('zapier', 'trigger', req.body, null, err);
    res.status(500).json({ error: err.message });
  }
});

// ── Execution Log ─────────────────────────────────────────────────────────────

app.get('/executions', (req, res) => {
  const { integration, limit = 50 } = req.query;
  let logs = executionLog;
  if (integration) logs = logs.filter(l => l.integration === integration);
  res.json({ executions: logs.slice(-parseInt(limit)), total: logs.length });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[HANDS] Integration service running on port ${PORT}`);
  const configured = Object.entries(INTEGRATIONS)
    .filter(([, cfg]) => Object.values(cfg).some(v => !!v))
    .map(([name]) => name);
  console.log(`[HANDS] Configured integrations: ${configured.length ? configured.join(', ') : 'none (mock mode)'}`);
});
