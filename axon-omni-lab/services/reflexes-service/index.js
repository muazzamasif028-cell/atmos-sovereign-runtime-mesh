/**
 * REFLEXES SERVICE — Element 9: Automation
 * Body Part: Reflexes
 * Role: Auto-execution of workflows without user intervention
 *
 * Reflexes fire automatically in response to triggers — time-based,
 * event-based, or condition-based. They are the autonomous nervous
 * responses that keep the organism running without conscious thought.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3006;
const SERVICE_NAME = 'reflexes-service';

// ─── Workflow Store ───────────────────────────────────────────────────────────
const workflows = new Map();
const executions = [];
const scheduledJobs = new Map();

let workflowIdCounter = 1;
let executionIdCounter = 1;

// ─── Trigger Types ────────────────────────────────────────────────────────────
const TRIGGER_TYPES = {
  CRON:      'cron',       // Time-based: "0 9 * * 1" (every Monday 9am)
  WEBHOOK:   'webhook',    // HTTP POST to /workflows/:id/trigger
  EVENT:     'event',      // Nervous system event
  CONDITION: 'condition',  // When a condition becomes true
  MANUAL:    'manual',     // User-initiated
};

// ─── Step Executors ───────────────────────────────────────────────────────────
const STEP_EXECUTORS = {
  async http_request({ url, method = 'GET', headers = {}, body }) {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, ok: response.ok, data: await response.json().catch(() => ({})) };
  },

  async send_slack({ channel, message }) {
    const NERVOUS_URL = process.env.NERVOUS_SYSTEM_URL || 'http://localhost:3007';
    await fetch(`${NERVOUS_URL}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'slack.send', data: { channel, message } }),
    }).catch(() => {});
    return { published: true, channel, message };
  },

  async ai_inference({ prompt, model }) {
    const BRAIN_URL = process.env.BRAIN_SERVICE_URL || 'http://localhost:3001';
    const response = await fetch(`${BRAIN_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, model }),
    });
    return response.json().catch(() => ({ error: 'Brain service unavailable' }));
  },

  async wait({ seconds }) {
    await new Promise(resolve => setTimeout(resolve, Math.min(seconds * 1000, 30000)));
    return { waited: seconds };
  },

  async condition_check({ condition, value, operator, threshold }) {
    const ops = { gt: (a, b) => a > b, lt: (a, b) => a < b, eq: (a, b) => a === b, gte: (a, b) => a >= b, lte: (a, b) => a <= b };
    const result = ops[operator]?.(value, threshold) ?? false;
    return { condition, result, value, operator, threshold };
  },

  async transform({ input, template }) {
    // Simple template substitution: {{key}} → value
    let output = template;
    if (typeof input === 'object') {
      Object.entries(input).forEach(([k, v]) => {
        output = output.replace(new RegExp(`{{${k}}}`, 'g'), v);
      });
    }
    return { output };
  },
};

// ─── Workflow Executor ────────────────────────────────────────────────────────
async function executeWorkflow(workflowId, triggerData = {}) {
  const workflow = workflows.get(workflowId);
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`);
  if (!workflow.enabled) throw new Error(`Workflow ${workflowId} is disabled`);

  const executionId = `exec-${executionIdCounter++}`;
  const execution = {
    id: executionId,
    workflowId,
    workflowName: workflow.name,
    status: 'running',
    triggerData,
    steps: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
  };

  executions.push(execution);
  workflow.executionCount = (workflow.executionCount || 0) + 1;
  workflow.lastExecutedAt = new Date().toISOString();

  console.log(`[REFLEXES] Executing workflow "${workflow.name}" (${executionId})`);

  let context = { ...triggerData };

  for (const step of workflow.steps) {
    const stepResult = {
      name: step.name || step.type,
      type: step.type,
      status: 'running',
      startedAt: new Date().toISOString(),
      output: null,
      error: null,
    };

    try {
      const executor = STEP_EXECUTORS[step.type];
      if (!executor) throw new Error(`Unknown step type: ${step.type}`);

      // Merge context into step params
      const params = { ...step.params, _context: context };
      stepResult.output = await executor(params);
      stepResult.status = 'success';
      context = { ...context, [`${step.name || step.type}_output`]: stepResult.output };
    } catch (err) {
      stepResult.status = 'failed';
      stepResult.error = err.message;
      execution.status = 'failed';
      execution.error = `Step "${stepResult.name}" failed: ${err.message}`;
      console.error(`[REFLEXES] Step failed in ${executionId}:`, err.message);

      if (step.continueOnError !== true) break;
    }

    stepResult.completedAt = new Date().toISOString();
    execution.steps.push(stepResult);
  }

  if (execution.status === 'running') execution.status = 'success';
  execution.completedAt = new Date().toISOString();

  console.log(`[REFLEXES] Workflow "${workflow.name}" ${execution.status} in ${
    new Date(execution.completedAt) - new Date(execution.startedAt)
  }ms`);

  return execution;
}

// ─── Cron Scheduler ───────────────────────────────────────────────────────────
function parseCronToMs(cronExpr) {
  // Simplified: only support "*/N minutes" and "0 H * * *" patterns
  const everyN = cronExpr.match(/^\*\/(\d+)$/);
  if (everyN) return parseInt(everyN[1]) * 60 * 1000;
  return null; // Complex cron requires a library like node-cron
}

function scheduleWorkflow(workflow) {
  if (workflow.trigger?.type !== TRIGGER_TYPES.CRON) return;

  const intervalMs = parseCronToMs(workflow.trigger.cron);
  if (!intervalMs) return;

  const timer = setInterval(async () => {
    try {
      await executeWorkflow(workflow.id, { trigger: 'cron', scheduledAt: new Date().toISOString() });
    } catch (err) {
      console.error(`[REFLEXES] Scheduled execution failed for ${workflow.id}:`, err.message);
    }
  }, intervalMs);

  scheduledJobs.set(workflow.id, timer);
  console.log(`[REFLEXES] Scheduled workflow "${workflow.name}" every ${intervalMs / 1000}s`);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Automation',
    bodyPart: 'Reflexes',
    status: 'healthy',
    workflows: workflows.size,
    scheduledJobs: scheduledJobs.size,
    totalExecutions: executions.length,
    triggerTypes: Object.values(TRIGGER_TYPES),
    stepTypes: Object.keys(STEP_EXECUTORS),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Create workflow
app.post('/workflows', (req, res) => {
  const { name, description, trigger, steps = [], enabled = true, metadata = {} } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const workflow = {
    id: workflowIdCounter++,
    name,
    description,
    trigger: trigger || { type: TRIGGER_TYPES.MANUAL },
    steps,
    enabled,
    metadata,
    executionCount: 0,
    lastExecutedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  workflows.set(workflow.id, workflow);
  scheduleWorkflow(workflow);

  res.status(201).json({ workflow });
});

// List workflows
app.get('/workflows', (req, res) => {
  res.json({
    workflows: Array.from(workflows.values()),
    total: workflows.size,
  });
});

// Get workflow
app.get('/workflows/:id', (req, res) => {
  const workflow = workflows.get(parseInt(req.params.id));
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json({ workflow });
});

// Update workflow
app.patch('/workflows/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const workflow = workflows.get(id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const updated = { ...workflow, ...req.body, id, updatedAt: new Date().toISOString() };
  workflows.set(id, updated);

  // Reschedule if trigger changed
  if (scheduledJobs.has(id)) {
    clearInterval(scheduledJobs.get(id));
    scheduledJobs.delete(id);
  }
  scheduleWorkflow(updated);

  res.json({ workflow: updated });
});

// Delete workflow
app.delete('/workflows/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!workflows.has(id)) return res.status(404).json({ error: 'Workflow not found' });

  if (scheduledJobs.has(id)) {
    clearInterval(scheduledJobs.get(id));
    scheduledJobs.delete(id);
  }
  workflows.delete(id);
  res.json({ deleted: true, id });
});

// Trigger workflow manually
app.post('/workflows/:id/trigger', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const execution = await executeWorkflow(id, { ...req.body, trigger: 'manual' });
    res.json({ execution });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List executions
app.get('/executions', (req, res) => {
  const { workflowId, status, limit = 50 } = req.query;
  let filtered = executions;
  if (workflowId) filtered = filtered.filter(e => e.workflowId === parseInt(workflowId));
  if (status)     filtered = filtered.filter(e => e.status === status);
  res.json({ executions: filtered.slice(-parseInt(limit)), total: filtered.length });
});

// Get execution
app.get('/executions/:id', (req, res) => {
  const execution = executions.find(e => e.id === req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json({ execution });
});

// Webhook trigger endpoint (for external services to trigger workflows)
app.post('/webhook/:workflowId', async (req, res) => {
  const id = parseInt(req.params.workflowId);
  const workflow = workflows.get(id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  if (workflow.trigger?.type !== TRIGGER_TYPES.WEBHOOK) {
    return res.status(400).json({ error: 'Workflow is not configured for webhook triggers' });
  }

  try {
    const execution = await executeWorkflow(id, { ...req.body, trigger: 'webhook' });
    res.json({ received: true, executionId: execution.id, status: execution.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[REFLEXES] Automation service running on port ${PORT}`);
});
