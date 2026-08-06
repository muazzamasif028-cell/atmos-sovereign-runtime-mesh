# Getting Started with Axon Omni Lab

> The Living Platform — 12 elements, one organism.

---

## What is Axon Omni Lab?

Axon Omni Lab is a fully integrated workflow automation platform modelled on the human body. It combines AI inference, vector knowledge retrieval, third-party integrations, automated workflows, real-time messaging, and auto-scaling into a single cohesive system.

Each of the 12 architectural elements maps to a biological function:

| Element | Body Part | What it does |
|---------|-----------|--------------|
| Sovereign | Skeleton | Infrastructure orchestration |
| Security | Skin | Cloudflare protection |
| Persistence | DNA | PostgreSQL database |
| Intelligence | Brain | AI (DeepSeek/GPT-4o) |
| Context | Consciousness | Conversation memory |
| Natural | Voice | NLP & speech |
| Knowledge | Wisdom | Vector search & RAG |
| Integration | Hands | Stripe, Slack, Gmail, GitHub |
| Automation | Reflexes | Workflow execution |
| Mesh | Nervous System | Event bus |
| Scaling | Growth | Auto-scaling |
| Interface | Face | Dashboard & API gateway |

---

## Quick Start (5 minutes)

### Option 1: Run the Face Service Only

The fastest way to see Axon Omni Lab in action is to run just the face-service, which includes the dashboard and API gateway.

```bash
cd axon-omni-lab/services/face-service
npm install
npm start
```

Open http://localhost:3000 — you'll see the dashboard. All services will show as "Checking..." since only the face is running, but the UI is fully functional.

### Option 2: Run All Services Locally

```bash
# Install dependencies for all services
for dir in axon-omni-lab/services/*/; do
  echo "Installing $dir..."
  (cd "$dir" && npm install)
done

# Start all services (in separate terminals or use a process manager)
cd axon-omni-lab/services/skeleton-service      && npm start &
cd axon-omni-lab/services/skin-service          && npm start &
cd axon-omni-lab/services/dna-service           && npm start &
cd axon-omni-lab/services/brain-service         && npm start &
cd axon-omni-lab/services/consciousness-service && npm start &
cd axon-omni-lab/services/voice-service         && npm start &
cd axon-omni-lab/services/wisdom-service        && npm start &
cd axon-omni-lab/services/hands-service         && npm start &
cd axon-omni-lab/services/reflexes-service      && npm start &
cd axon-omni-lab/services/nervous-system-service && npm start &
cd axon-omni-lab/services/growth-service        && npm start &
cd axon-omni-lab/services/face-service          && npm start
```

### Option 3: Docker Compose

```bash
cd axon-omni-lab
docker-compose up
```

See `config/docker-compose.yml` for the full compose file.

---

## Configuration

Copy the example environment file and fill in your values:

```bash
cp axon-omni-lab/config/.env.example axon-omni-lab/.env
```

### Minimum Required (for full functionality)

```env
# AI (at least one)
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...

# Database (optional — uses in-memory if not set)
DATABASE_URL=postgresql://user:pass@host:5432/axon

# Redis (optional — uses in-memory if not set)
REDIS_URL=redis://localhost:6379
```

### All services work without any API keys in mock mode.

---

## Your First API Call

Once the face-service is running:

### Chat with the AI Brain

```bash
curl -X POST http://localhost:3000/api/brain/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What can you do?"}'
```

### Create a Workflow

```bash
curl -X POST http://localhost:3000/api/reflexes/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Workflow",
    "trigger": {"type": "manual"},
    "steps": [
      {"name": "greet", "type": "transform", "params": {"input": {"name": "World"}, "template": "Hello, {{name}}!"}}
    ]
  }'
```

### Run the Workflow

```bash
curl -X POST http://localhost:3000/api/reflexes/workflows/1/trigger \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Search Knowledge Base

```bash
# First, add some knowledge
curl -X POST http://localhost:3000/api/wisdom/upsert \
  -H "Content-Type: application/json" \
  -d '{"content": "Axon Omni Lab is a 12-element living platform", "namespace": "docs"}'

# Then search it
curl -X POST http://localhost:3000/api/wisdom/search \
  -H "Content-Type: application/json" \
  -d '{"query": "what is axon", "namespace": "docs"}'
```

---

## Dashboard

Open http://localhost:3000 to access the live dashboard showing:

- **System Health** — All 12 elements with live status
- **AI Chat** — Direct conversation with the Brain
- **Event Stream** — Real-time nervous system events
- **Scaling Metrics** — CPU, memory, replica counts
- **Workflows** — Active automations with run buttons
- **Integrations** — Connection status for all third-party services

---

## Next Steps

- Read the [Architecture Deep-Dive](./architecture.md)
- Explore the [API Documentation](./api.md)
- Set up [Integrations](./integrations.md)
- Deploy to [Zeabur](./deployment.md)
