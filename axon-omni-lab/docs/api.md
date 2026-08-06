# Axon Omni Lab — API Documentation

All APIs are accessible through the face-service API gateway at `http://localhost:3000/api/:service/`.

---

## Authentication

By default, no authentication is required (development mode).

To enable API key authentication:
```env
REQUIRE_API_KEY=true
API_KEYS=your-key-1,your-key-2
```

Then include the key in requests:
```
X-API-Key: your-key-1
```

---

## Element 4: Brain — AI Inference

Base URL: `/api/brain`

### POST /api/brain/chat
Simple chat with the AI.

**Request:**
```json
{
  "message": "What is the capital of France?",
  "model": "deepseek-chat",
  "systemPrompt": "You are a helpful assistant.",
  "context": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous reply"}
  ]
}
```

**Response:**
```json
{
  "reply": "The capital of France is Paris.",
  "model": "deepseek-chat",
  "usage": {"promptTokens": 20, "completionTokens": 10, "totalTokens": 30},
  "mock": false
}
```

### POST /api/brain/infer
Full inference with all options.

**Request:**
```json
{
  "messages": [{"role": "user", "content": "Hello"}],
  "model": "gpt-4o",
  "temperature": 0.7,
  "maxTokens": 1024,
  "systemPrompt": "You are an expert."
}
```

### POST /api/brain/reason
Deep reasoning for complex problems.

**Request:**
```json
{
  "problem": "Should we scale up the brain-service?",
  "context": "Current CPU is at 85%, 50 requests/second",
  "model": "deepseek-reasoner"
}
```

### POST /api/brain/summarize
Summarize content.

**Request:**
```json
{
  "content": "Long text to summarize...",
  "style": "bullets"
}
```
Styles: `concise`, `detailed`, `bullets`, `executive`

### GET /api/brain/models
List available AI models.

### GET /api/brain/stats
Get inference statistics.

---

## Element 6: Voice — Natural Language

Base URL: `/api/voice`

### POST /api/voice/analyze
Full NLP analysis.

**Request:** `{"text": "Send an urgent email to alice@example.com"}`

**Response:**
```json
{
  "intent": "send_message",
  "entities": {"emails": ["alice@example.com"]},
  "sentiment": {"label": "urgent", "score": 0.9},
  "language": "en",
  "wordCount": 7
}
```

### POST /api/voice/intent
Classify intent only.

### POST /api/voice/sentiment
Analyze sentiment only.

### POST /api/voice/parse-command
Parse a natural language command into a structured action.

**Response:**
```json
{
  "intent": "send_message",
  "suggestedAction": {"service": "hands-service", "action": "send_message"},
  "confidence": 0.85
}
```

### POST /api/voice/speak
Text-to-speech (requires OPENAI_API_KEY).

**Request:** `{"text": "Hello world", "voice": "alloy", "speed": 1.0}`

---

## Element 7: Wisdom — Knowledge & Vector Search

Base URL: `/api/wisdom`

### POST /api/wisdom/upsert
Add a document to the knowledge base.

**Request:**
```json
{
  "id": "doc-001",
  "content": "Axon Omni Lab is a 12-element platform",
  "metadata": {"category": "docs", "author": "admin"},
  "namespace": "default"
}
```

### POST /api/wisdom/upsert/batch
Add multiple documents at once.

**Request:**
```json
{
  "documents": [
    {"content": "Document 1", "metadata": {}},
    {"content": "Document 2", "metadata": {}}
  ],
  "namespace": "default"
}
```

### POST /api/wisdom/search
Semantic search.

**Request:**
```json
{
  "query": "how does the brain work",
  "topK": 5,
  "namespace": "default",
  "minScore": 0.5,
  "filter": {"category": "docs"}
}
```

**Response:**
```json
{
  "results": [
    {"id": "doc-001", "content": "...", "score": 0.92, "metadata": {}}
  ],
  "total": 1
}
```

### POST /api/wisdom/rag
Retrieve context for RAG (Retrieval-Augmented Generation).

**Request:** `{"query": "what is axon", "topK": 3}`

**Response:**
```json
{
  "retrievedDocuments": [...],
  "systemPrompt": "You have access to the following relevant knowledge:\n\n[1] ...\n\nUse this information..."
}
```

---

## Element 5: Consciousness — Context & Memory

Base URL: `/api/consciousness`

### POST /api/consciousness/sessions
Create a new conversation session.

**Request:** `{"userId": "user-123", "metadata": {}}`

**Response:** `{"session": {"id": "1234-abcd", "messages": [], ...}}`

### POST /api/consciousness/sessions/:id/messages
Add a message to a session.

**Request:** `{"role": "user", "content": "Hello!"}`

### GET /api/consciousness/sessions/:id/context
Get formatted context for AI (last N messages).

**Query params:** `?limit=20`

### PATCH /api/consciousness/sessions/:id/state
Update session intent/entities.

**Request:** `{"intent": "create_workflow", "entities": {"name": "My Workflow"}}`

### GET /api/consciousness/context/:userId
Get long-term user context.

### PATCH /api/consciousness/context/:userId
Update user context.

**Request:**
```json
{
  "preferences": {"language": "en", "timezone": "UTC"},
  "facts": {"company": "Acme Corp"},
  "historyEntry": {"event": "first_login"}
}
```

---

## Element 8: Hands — Integrations

Base URL: `/api/hands`

### POST /api/hands/stripe/charge
Create a Stripe payment intent.

**Request:**
```json
{
  "amount": 2000,
  "currency": "usd",
  "customerId": "cus_xxx",
  "description": "Axon subscription"
}
```

### POST /api/hands/stripe/customer
Create a Stripe customer.

**Request:** `{"email": "user@example.com", "name": "John Doe"}`

### POST /api/hands/slack/message
Send a Slack message.

**Request:** `{"channel": "#general", "text": "Hello from Axon!"}`

### POST /api/hands/slack/notify
Send a rich Slack notification.

**Request:**
```json
{
  "channel": "#alerts",
  "title": "Workflow Completed",
  "message": "Daily standup report generated",
  "color": "good",
  "fields": [
    {"label": "Duration", "value": "2.3s"},
    {"label": "Status", "value": "Success"}
  ]
}
```

### POST /api/hands/gmail/send
Send an email via Gmail.

**Request:**
```json
{
  "to": "user@example.com",
  "subject": "Hello from Axon",
  "body": "Plain text body",
  "html": "<h1>Or HTML body</h1>"
}
```

### POST /api/hands/github/issue
Create a GitHub issue.

**Request:**
```json
{
  "owner": "my-org",
  "repo": "my-repo",
  "title": "Bug: Something broke",
  "body": "Description...",
  "labels": ["bug", "priority-high"]
}
```

### POST /api/hands/zapier/trigger
Trigger a Zapier webhook.

**Request:** `{"event": "user.signup", "data": {"email": "user@example.com"}}`

### GET /api/hands/executions
Get integration execution log.

---

## Element 9: Reflexes — Automation

Base URL: `/api/reflexes`

### POST /api/reflexes/workflows
Create a workflow.

**Request:**
```json
{
  "name": "Daily Report",
  "description": "Generates daily report",
  "trigger": {
    "type": "cron",
    "cron": "*/5"
  },
  "steps": [
    {
      "name": "fetch_data",
      "type": "http_request",
      "params": {"url": "http://localhost:3001/stats", "method": "GET"}
    },
    {
      "name": "summarize",
      "type": "ai_inference",
      "params": {"prompt": "Summarize these stats"}
    },
    {
      "name": "notify",
      "type": "send_slack",
      "params": {"channel": "#reports", "message": "{{summarize_output}}"}
    }
  ],
  "enabled": true
}
```

**Trigger types:** `manual`, `cron`, `webhook`, `event`, `condition`

**Step types:** `http_request`, `ai_inference`, `send_slack`, `wait`, `condition_check`, `transform`

### GET /api/reflexes/workflows
List all workflows.

### POST /api/reflexes/workflows/:id/trigger
Manually trigger a workflow.

### GET /api/reflexes/executions
List workflow executions.

**Query params:** `?workflowId=1&status=success&limit=50`

### POST /api/reflexes/webhook/:workflowId
External webhook trigger (for workflows with `trigger.type = "webhook"`).

---

## Element 10: Nervous System — Events

Base URL: `/api/nervous`

### POST /api/nervous/publish
Publish an event to the bus.

**Request:**
```json
{
  "channel": "user.created",
  "data": {"userId": "123", "email": "user@example.com"},
  "source": "dna-service"
}
```

### GET /api/nervous/events
Get event history.

**Query params:** `?channel=user.created&limit=50&since=2024-01-01T00:00:00Z`

### POST /api/nervous/broadcast
Broadcast to all services.

**Request:** `{"message": "System maintenance in 5 minutes", "severity": "warning"}`

### POST /api/nervous/heartbeat
Service heartbeat.

**Request:** `{"service": "brain-service", "status": "healthy", "metrics": {"cpu": 45}}`

### WebSocket: ws://localhost:3007
Connect for real-time events.

```javascript
const ws = new WebSocket('ws://localhost:3007');
ws.onopen = () => ws.send(JSON.stringify({type: 'subscribe', channels: ['*']}));
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## Element 11: Growth — Scaling

Base URL: `/api/growth`

### POST /api/growth/metrics
Report service metrics.

**Request:**
```json
{
  "service": "brain-service",
  "cpu": 75,
  "memory": 60,
  "rps": 120,
  "errorRate": 0.5,
  "latencyMs": 45
}
```

### GET /api/growth/overview
System-wide scaling overview.

### POST /api/growth/scale
Manual scaling override.

**Request:** `{"service": "brain-service", "replicas": 3, "reason": "high load"}`

### GET /api/growth/history
Scaling event history.

### GET /api/growth/alerts
Active scaling alerts.

---

## Element 3: DNA — Persistence

Base URL: `/api/dna`

### POST /api/dna/users
Create a user.

### GET /api/dna/conversations
List conversations.

### POST /api/dna/conversations
Create a conversation.

### GET /api/dna/audit
Get audit log.

### GET /api/dna/schema
Get database schema info.

---

## GraphQL

**Endpoint:** `POST /graphql`

```graphql
query {
  systemHealth {
    overall
    healthy
    total
    services { service status latencyMs }
  }
  
  workflows(enabled: true) {
    id name executionCount
  }
}

mutation {
  chat(message: "Hello!") {
    reply model
  }
  
  triggerWorkflow(id: 1) {
    id status
  }
}
```

---

## Health Checks

Every service exposes `GET /health`:

```json
{
  "service": "brain-service",
  "element": "Intelligence",
  "bodyPart": "Brain",
  "status": "healthy",
  "uptime": 3600,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

System-wide health: `GET /api/health`
