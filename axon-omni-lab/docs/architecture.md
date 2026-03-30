# Axon Omni Lab — Architecture Deep-Dive

---

## Philosophy

Axon Omni Lab is designed around a single metaphor: **the human body**. Each architectural element maps to a biological function. This isn't just aesthetic — it's a design principle that guides how elements interact, what their responsibilities are, and how they scale.

> "The body is the most sophisticated distributed system ever built. We're just implementing it in software."

---

## The 12 Elements in Detail

### Element 1: Sovereign (Skeleton)
**Service:** `skeleton-service` | **Port:** 3009

The skeleton gives the organism its structure. It maintains the service registry — a live map of all 12 services, their ports, URLs, and health status. Every service registers itself with the skeleton on startup.

**Key responsibilities:**
- Service discovery and registration
- Deployment topology management
- Infrastructure manifest (version, environment, deploy time)
- Health aggregation

**Why it matters:** Without a skeleton, services don't know where each other are. The skeleton is the directory of the organism.

---

### Element 2: Security (Skin)
**Service:** `skin-service` | **Port:** 3010

The skin is the first line of defence. It sits at the boundary between the outside world and the organism's internals. All external traffic passes through Cloudflare (the skin's external layer) before reaching the API gateway.

**Key responsibilities:**
- Cloudflare WAF rule management
- Rate limiting (100 req/min per IP by default)
- Threat detection and logging
- Security headers (HSTS, CSP, X-Frame-Options)
- Request validation (SQL injection, XSS, path traversal detection)

**Integration:** Cloudflare API for zone management, firewall rules, and analytics.

---

### Element 3: Persistence (DNA)
**Service:** `dna-service` | **Port:** 3011

DNA is the organism's memory — everything that must survive a restart. The DNA service is the persistence layer, wrapping PostgreSQL with a clean REST API.

**Key responsibilities:**
- User management (CRUD)
- Conversation history storage
- Workflow definitions
- Integration configurations
- Vector embedding metadata
- Audit logging (every write is logged)

**Schema:** See `db/schema.sql` for the full PostgreSQL schema with 10 tables, indexes, views, and triggers.

**In-memory fallback:** When `DATABASE_URL` is not set, the service uses an in-memory store. Data is lost on restart — suitable for development only.

---

### Element 4: Intelligence (Brain)
**Service:** `brain-service` | **Port:** 3001

The brain is the cognitive core. It processes information, reasons about it, and produces intelligent responses. It supports multiple AI providers through a unified interface.

**Key responsibilities:**
- Chat completions (DeepSeek, GPT-4o)
- Deep reasoning (DeepSeek R1)
- Content summarization
- Inference statistics tracking

**Models:**
| Model | Provider | Best For |
|-------|----------|----------|
| `deepseek-chat` | DeepSeek | General chat (default) |
| `deepseek-coder` | DeepSeek | Code generation |
| `deepseek-reasoner` | DeepSeek | Complex reasoning |
| `gpt-4o` | OpenAI | Long context, multimodal |
| `gpt-4o-mini` | OpenAI | Fast, cost-effective |

**Mock mode:** When no API keys are configured, the brain returns clearly-marked mock responses. All other functionality works normally.

---

### Element 5: Context (Consciousness)
**Service:** `consciousness-service` | **Port:** 3004

Consciousness is what makes the system aware of who it's talking to and what was said before. Without it, every interaction starts from zero — the system has no memory of previous conversations.

**Key responsibilities:**
- Session management (30-minute TTL)
- Conversation history (formatted for AI context windows)
- Intent and entity tracking within sessions
- Sentiment analysis per message
- Long-term user context (preferences, facts, history)
- Working memory (short-lived key-value store)

**Redis integration:** In production, sessions are stored in Redis for cross-instance sharing. In development, in-memory storage is used.

---

### Element 6: Natural (Voice)
**Service:** `voice-service` | **Port:** 3003

The voice is how the organism communicates. It understands natural language, extracts meaning, and can speak back.

**Key responsibilities:**
- Intent classification (10 built-in intents)
- Entity extraction (emails, URLs, amounts, dates, service names)
- Sentiment analysis (positive, negative, neutral, urgent)
- Language detection (8 languages)
- Natural language command parsing → structured actions
- Speech-to-text (Whisper via OpenAI)
- Text-to-speech (TTS-1 via OpenAI)

**Command parsing example:**
```
Input:  "Send an urgent Slack message to #alerts about the deployment"
Output: {
  intent: "send_message",
  entities: { services: ["slack"] },
  sentiment: { label: "urgent" },
  suggestedAction: { service: "hands-service", action: "send_message" }
}
```

---

### Element 7: Knowledge (Wisdom)
**Service:** `wisdom-service` | **Port:** 3005

Wisdom is accumulated knowledge — the ability to find the right information at the right time. It powers RAG (Retrieval-Augmented Generation) so the brain can answer with grounded facts rather than hallucinations.

**Key responsibilities:**
- Document ingestion with vector embeddings
- Semantic similarity search (cosine similarity)
- Namespace-based knowledge organization
- RAG context preparation (retrieves relevant docs + formats system prompt)
- Batch document upsert

**Embedding models:**
- Production: `text-embedding-3-small` (OpenAI, 1536 dimensions)
- Development: Deterministic mock embeddings (128 dimensions)

**Vector store:**
- Production: Pinecone (managed, scalable)
- Development: In-memory with cosine similarity

---

### Element 8: Integration (Hands)
**Service:** `hands-service` | **Port:** 3002

The hands reach out and interact with the external world. They execute actions in other systems on behalf of the organism.

**Integrations:**
| Service | Capabilities |
|---------|-------------|
| Stripe | Charges, customers, subscriptions, invoices |
| Slack | Messages, notifications, channels, users |
| Gmail | Send emails, read inbox, manage labels |
| GitHub | Issues, PRs, commits, repos, webhooks |
| Zapier | Webhook triggers for any Zap |

**Mock mode:** All integrations work without API keys, returning mock responses marked with `"mock": true`.

**Execution log:** Every integration call is logged with timestamp, success/failure, and truncated payload.

---

### Element 9: Automation (Reflexes)
**Service:** `reflexes-service` | **Port:** 3006

Reflexes fire automatically in response to triggers. They are the autonomous responses that keep the organism running without conscious thought.

**Trigger types:**
- `manual` — User-initiated via API or dashboard
- `cron` — Time-based (e.g., `*/5` = every 5 minutes)
- `webhook` — External HTTP POST
- `event` — Nervous system event
- `condition` — When a condition becomes true

**Step types:**
- `http_request` — Call any HTTP endpoint
- `ai_inference` — Call the brain service
- `send_slack` — Send a Slack message via nervous system
- `wait` — Pause execution (max 30 seconds)
- `condition_check` — Evaluate a condition
- `transform` — Template-based data transformation

**Context passing:** Each step's output is available to subsequent steps via `{{step_name_output}}` template variables.

---

### Element 10: Mesh (Nervous System)
**Service:** `nervous-system-service` | **Port:** 3007

The nervous system carries signals between all parts of the organism at high speed. It is the connective tissue that makes 12 isolated services act as one coherent being.

**Key responsibilities:**
- Event publishing and subscription (Pub/Sub)
- WebSocket server for real-time browser clients
- Event history (last 1000 events)
- Service heartbeat collection
- System-wide broadcasts
- Event replay (for catching up after downtime)

**Built-in channels:**
- `service.health` — Service health updates
- `workflow.completed` — Workflow execution results
- `error.critical` — Critical errors
- `system.broadcast` — System-wide announcements
- `*` — Wildcard (all channels)

**Redis integration:** In production, Redis Pub/Sub enables cross-instance messaging. In development, in-memory event bus is used.

---

### Element 11: Scaling (Growth)
**Service:** `growth-service` | **Port:** 3008

Growth monitors the organism's vital signs and decides when to expand capacity. Like a body that grows stronger under stress, the platform scales up when demand increases.

**Scaling thresholds (configurable):**
- Scale up: CPU > 70% OR RPS > 100
- Scale down: CPU < 20% AND RPS < 10
- Alert: Error rate > 5%

**Replica limits:** Min 1, Max 10 per service

**Metrics tracked:** CPU %, Memory %, Requests/second, Error rate, Latency (ms)

**Integration:** In production, scaling decisions are executed via Zeabur API or Kubernetes HPA.

---

### Element 12: Interface (Face)
**Service:** `face-service` | **Port:** 3000

The face is how the world sees the organism. It presents a unified interface to users and routes all API requests to the correct service.

**Key responsibilities:**
- Dashboard UI (server-rendered React-like HTML)
- API gateway (proxy to all 12 services)
- WebSocket server (real-time dashboard updates)
- GraphQL endpoint (complex cross-service queries)
- Request logging
- CORS handling

---

## Data Flow Patterns

### Pattern 1: AI-Powered Chat with Memory

```
User → Face (API gateway)
     → Consciousness (load session history)
     → Voice (parse intent)
     → Wisdom (RAG: find relevant knowledge)
     → Brain (inference with context + knowledge)
     → Consciousness (save new messages)
     → DNA (persist conversation)
     → Face (return response)
     → Nervous System (publish "message.processed" event)
```

### Pattern 2: Automated Workflow Execution

```
Trigger (cron/webhook/event)
     → Reflexes (load workflow, execute steps)
     → [Step 1] HTTP request to external API
     → [Step 2] Brain (AI inference on result)
     → [Step 3] Hands (send Slack notification)
     → DNA (persist execution record)
     → Nervous System (publish "workflow.completed" event)
     → Face (WebSocket push to dashboard)
     → Growth (report execution metrics)
```

### Pattern 3: Knowledge Ingestion

```
Document → Wisdom (generate embedding via OpenAI)
         → Wisdom (store in Pinecone + in-memory)
         → DNA (persist metadata)
         → Nervous System (publish "knowledge.added" event)
```

---

## Security Architecture

```
Internet
   │
   ▼
Cloudflare Edge (skin-service manages rules)
   │ DDoS protection, WAF, rate limiting, TLS termination
   ▼
face-service (API gateway)
   │ CORS, request logging, JWT validation
   ▼
skin-service (request validation)
   │ SQL injection, XSS, path traversal detection
   ▼
Target service
   │ Business logic
   ▼
dna-service (audit log)
```

---

## Failure Modes & Resilience

| Failure | Impact | Recovery |
|---------|--------|----------|
| brain-service down | AI features unavailable | Mock responses, other services unaffected |
| dna-service down | Data not persisted | In-memory fallback, data loss risk |
| nervous-system down | No real-time events | Services still function, dashboard not live |
| hands-service down | No external integrations | Workflows fail at integration steps |
| growth-service down | No auto-scaling | Manual scaling still possible |
| face-service down | Dashboard/API unavailable | Direct service access still works |

**Design principle:** Each service is independently deployable and independently fallible. The organism degrades gracefully rather than failing catastrophically.
