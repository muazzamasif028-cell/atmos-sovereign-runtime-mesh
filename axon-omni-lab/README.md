# ⚡ Axon Omni Lab

> **The Living Platform** — 12 elements, one organism.

Axon Omni Lab is a fully integrated workflow automation platform modelled on the human body. Each of the 12 architectural elements maps to a biological function, and together they form a self-aware, self-scaling, self-healing system.

---

## The 12 Elements

```
🦴 Sovereign    (Skeleton)       — Infrastructure orchestration on Zeabur
🛡️ Security     (Skin)           — Cloudflare protection against attackers
🧬 Persistence  (DNA)            — PostgreSQL database
🧠 Intelligence (Brain)          — AI Models (DeepSeek / GPT-4o)
💭 Context      (Consciousness)  — User conversation history & state
🗣️ Natural      (Voice)          — Natural language AI interactions
📚 Knowledge    (Wisdom)         — Vector databases (Pinecone)
🤝 Integration  (Hands)          — Stripe, Gmail, Slack, GitHub, Zapier
⚙️ Automation   (Reflexes)       — Auto-execution without user intervention
🕸️ Mesh         (Nervous System) — Fast inter-service communication
📈 Scaling      (Growth)         — Auto-scaling based on demand
🎭 Interface    (Face)           — Dashboard UI where users control everything
```

---

## Quick Start

```bash
# Run the dashboard (face-service)
cd axon-omni-lab/services/face-service
npm install && npm start

# Open the dashboard
open http://localhost:3000
```

All services work in **mock mode** without any API keys. Configure keys in `.env` to enable real AI, payments, messaging, and more.

---

## Structure

```
axon-omni-lab/
├── ARCHITECTURE.md              # System diagram & data flows
├── README.md                    # This file
├── package.json                 # Root package (workspaces)
│
├── services/                    # The 12 microservices
│   ├── face-service/            # Element 12: Dashboard + API Gateway
│   ├── brain-service/           # Element 4:  AI Inference
│   ├── hands-service/           # Element 8:  Integrations
│   ├── voice-service/           # Element 6:  NLP
│   ├── consciousness-service/   # Element 5:  Context & Memory
│   ├── wisdom-service/          # Element 7:  Vector Search
│   ├── reflexes-service/        # Element 9:  Automation
│   ├── nervous-system-service/  # Element 10: Event Bus
│   ├── growth-service/          # Element 11: Auto-scaling
│   ├── skeleton-service/        # Element 1:  Infrastructure
│   ├── skin-service/            # Element 2:  Security
│   └── dna-service/             # Element 3:  Persistence
│
├── integrations/                # Integration clients
│   ├── stripe.js
│   ├── gmail.js
│   ├── slack.js
│   ├── github.js
│   ├── zapier.js
│   ├── openai.js
│   ├── deepseek.js
│   ├── pinecone.js
│   └── cloudflare.js
│
├── api/                         # API layer
│   ├── gateway.js               # Standalone API gateway
│   ├── websocket.js             # WebSocket manager
│   └── graphql.js               # GraphQL schema & resolvers
│
├── db/                          # Database
│   ├── schema.sql               # Full PostgreSQL schema
│   ├── seed.sql                 # Sample data
│   └── migrations/              # Migration files
│
├── config/                      # Configuration
│   ├── environment.js           # Config loader & validation
│   ├── .env.example             # Environment variable template
│   ├── zeabur.json              # Zeabur deployment config
│   └── cloudflare-rules.json   # WAF rules
│
├── dashboard/                   # Dashboard docs
│   └── README.md
│
└── docs/                        # Documentation
    ├── getting-started.md
    ├── architecture.md
    ├── api.md
    ├── integrations.md
    └── deployment.md
```

---

## API Gateway

All 12 services are accessible through the face-service at:

```
http://localhost:3000/api/:service/:endpoint
```

| Service | Endpoint | Example |
|---------|----------|---------|
| brain | `/api/brain/chat` | AI chat |
| voice | `/api/voice/analyze` | NLP analysis |
| wisdom | `/api/wisdom/search` | Semantic search |
| hands | `/api/hands/slack/message` | Send Slack message |
| reflexes | `/api/reflexes/workflows` | List workflows |
| nervous | `/api/nervous/publish` | Publish event |
| growth | `/api/growth/overview` | Scaling metrics |
| dna | `/api/dna/users` | User management |
| skin | `/api/skin/posture` | Security status |
| skeleton | `/api/skeleton/registry` | Service registry |

---

## Configuration

```bash
cp axon-omni-lab/config/.env.example .env
# Edit .env with your API keys
```

**Minimum for full AI functionality:**
```env
OPENAI_API_KEY=sk-...      # or
DEEPSEEK_API_KEY=sk-...
```

**For persistence:**
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

**For integrations:**
```env
STRIPE_SECRET_KEY=sk_...
SLACK_BOT_TOKEN=xoxb-...
GITHUB_TOKEN=ghp_...
```

---

## Deployment

Deploy to **Zeabur** for managed PostgreSQL, Redis, and auto-scaling:

See [docs/deployment.md](docs/deployment.md) for the full guide.

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System diagrams and topology |
| [docs/getting-started.md](docs/getting-started.md) | 5-minute quickstart |
| [docs/architecture.md](docs/architecture.md) | Deep-dive into all 12 elements |
| [docs/api.md](docs/api.md) | Complete API reference |
| [docs/integrations.md](docs/integrations.md) | Integration setup guides |
| [docs/deployment.md](docs/deployment.md) | Zeabur, Docker, Kubernetes |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ (ESM) |
| Framework | Express.js |
| AI | DeepSeek API, OpenAI API |
| Database | PostgreSQL 15 |
| Cache/Bus | Redis 7 |
| Vectors | Pinecone |
| Security | Cloudflare |
| Payments | Stripe |
| Messaging | Slack |
| Email | Gmail API |
| Code | GitHub API |
| Automation | Zapier |
| Deployment | Zeabur |
| Real-time | WebSocket (ws) |

---

*"As above, so below. As in the body, so in the system."*

**Axon Omni Lab** — The King version. Complete control. Complete automation. Complete intelligence.
