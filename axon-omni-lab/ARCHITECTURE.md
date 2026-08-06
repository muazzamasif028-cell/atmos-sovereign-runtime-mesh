# Axon Omni Lab — Architecture

> The ultimate living system. 12 elements. One organism.

---

## Overview

Axon Omni Lab is a fully integrated workflow automation platform modelled on the human body. Each of the 12 architectural elements maps to a biological function, and together they form a self-aware, self-scaling, self-healing system.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AXON OMNI LAB                                      │
│                    "The Living Platform"                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   FACE (12)  │  ← Dashboard UI / API Gateway
                              │  Interface   │
                              └──────┬───────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
     ┌────────▼───────┐    ┌─────────▼──────┐    ┌─────────▼──────┐
     │  SKIN (2)      │    │  BRAIN (4)     │    │  HANDS (8)     │
     │  Security      │    │  AI Inference  │    │  Integrations  │
     │  Cloudflare    │    │  DeepSeek/GPT  │    │  Stripe/Slack  │
     └────────┬───────┘    └─────────┬──────┘    └─────────┬──────┘
              │                      │                      │
     ┌────────▼───────┐    ┌─────────▼──────┐    ┌─────────▼──────┐
     │  SKELETON (1)  │    │ CONSCIOUS (5)  │    │  REFLEXES (9)  │
     │  Sovereign     │    │  Context &     │    │  Automation    │
     │  Zeabur Infra  │    │  Memory        │    │  Workflows     │
     └────────┬───────┘    └─────────┬──────┘    └─────────┬──────┘
              │                      │                      │
     ┌────────▼───────┐    ┌─────────▼──────┐    ┌─────────▼──────┐
     │  DNA (3)       │    │  VOICE (6)     │    │  NERVOUS (10)  │
     │  PostgreSQL    │    │  NLP / Speech  │    │  Message Queue │
     │  Persistence   │    │  Processing    │    │  Inter-service │
     └────────┬───────┘    └─────────┬──────┘    └─────────┬──────┘
              │                      │                      │
     ┌────────▼───────┐    ┌─────────▼──────┐    ┌─────────▼──────┐
     │  WISDOM (7)    │    │  GROWTH (11)   │    │  (all above)   │
     │  Vector DB     │    │  Auto-scaling  │    │  converge on   │
     │  Pinecone      │    │  Load Balance  │    │  NERVOUS SYS   │
     └────────────────┘    └────────────────┘    └────────────────┘
```

---

## The 12 Elements

| # | Element | Body Part | Technology | Responsibility |
|---|---------|-----------|------------|----------------|
| 1 | **Sovereign** | Skeleton | Zeabur | Infrastructure orchestration, isolated runtime |
| 2 | **Security** | Skin | Cloudflare | DDoS protection, WAF, rate limiting, TLS |
| 3 | **Persistence** | DNA/Memory | PostgreSQL | Durable data storage, migrations, audit logs |
| 4 | **Intelligence** | Brain | DeepSeek / GPT-4o | AI inference, reasoning, decision making |
| 5 | **Context** | Consciousness | Redis + PG | Conversation history, session state, memory |
| 6 | **Natural** | Voice/Speech | Whisper / TTS | NLP, speech-to-text, text-to-speech |
| 7 | **Knowledge** | Wisdom | Pinecone / Weaviate | Vector embeddings, semantic search, RAG |
| 8 | **Integration** | Hands | REST / OAuth | Stripe, Gmail, Slack, GitHub, Zapier |
| 9 | **Automation** | Reflexes | BullMQ / Cron | Workflow execution, triggers, scheduling |
| 10 | **Mesh** | Nervous System | Redis Pub/Sub | Fast inter-service messaging, event bus |
| 11 | **Scaling** | Growth | K8s HPA / Zeabur | Auto-scaling, load balancing, health checks |
| 12 | **Interface** | Face | React + Express | Dashboard UI, REST API, WebSocket, GraphQL |

---

## Data Flow

### Request Lifecycle

```
User Request
     │
     ▼
[FACE] API Gateway (Express / GraphQL)
     │
     ├──► [SKIN] Cloudflare WAF validates & proxies
     │
     ├──► [BRAIN] AI processes intent
     │         │
     │         ├──► [CONTEXT] Load conversation history
     │         ├──► [WISDOM] Semantic search for relevant knowledge
     │         └──► [VOICE] Parse natural language input
     │
     ├──► [HANDS] Execute integration actions (Stripe charge, Slack msg, etc.)
     │
     ├──► [REFLEXES] Trigger automated workflows
     │         │
     │         └──► [NERVOUS SYSTEM] Publish events to message bus
     │
     ├──► [DNA] Persist results to PostgreSQL
     │
     └──► [FACE] Return response to user
```

### Event-Driven Flow

```
Any Service
     │
     ▼
[NERVOUS SYSTEM] Redis Pub/Sub Event Bus
     │
     ├──► [REFLEXES] Automation triggers fire
     ├──► [GROWTH] Scaling decisions made
     ├──► [CONTEXT] State updated
     └──► [FACE] Real-time WebSocket push to dashboard
```

---

## Deployment Topology

```
┌─────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE                       │
│  WAF · DDoS Protection · CDN · TLS Termination          │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    ZEABUR PLATFORM                       │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ face-svc    │  │ brain-svc   │  │ hands-svc   │     │
│  │ :3000       │  │ :3001       │  │ :3002       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ voice-svc   │  │ conscious   │  │ wisdom-svc  │     │
│  │ :3003       │  │ -svc :3004  │  │ :3005       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ reflexes    │  │ nervous-sys │  │ growth-svc  │     │
│  │ -svc :3006  │  │ -svc :3007  │  │ :3008       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ skeleton    │  │ skin-svc    │  │ dna-svc     │     │
│  │ -svc :3009  │  │ :3010       │  │ :3011       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │   PostgreSQL         │  │   Redis               │    │
│  │   (DNA / Context)    │  │   (Nervous System)    │    │
│  └──────────────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     [Pinecone]      [OpenAI/DS]    [Stripe/Slack]
     Vector DB        AI APIs       External APIs
```

---

## Inter-Service Communication

- **Synchronous**: REST HTTP between services (internal network)
- **Asynchronous**: Redis Pub/Sub via nervous-system-service
- **Real-time**: WebSocket from face-service to browser clients
- **Batch**: BullMQ job queues in reflexes-service

---

## Security Model

```
External Traffic → Cloudflare (skin) → TLS → API Gateway (face)
                                                    │
                              JWT Auth ─────────────┤
                              Rate Limiting ─────────┤
                              CORS Policy ───────────┘
                                                    │
                              Internal mTLS ────────► All services
```

---

## Scaling Strategy

- **Horizontal**: Each service scales independently via Zeabur replicas
- **Vertical**: Resource limits defined per service based on load profile
- **Auto**: growth-service monitors CPU/memory and triggers scale events
- **Database**: Read replicas for PostgreSQL under high query load
- **Cache**: Redis caching layer reduces DB pressure

---

*"As above, so below. As in the body, so in the system."*
