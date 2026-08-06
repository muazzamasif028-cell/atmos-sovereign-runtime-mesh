# Axon Cloud

A next-generation workflow automation platform — 100x more advanced than n8n — built on a **4-Level Architecture**.

## Architecture Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | **Foundation** | Core workflow engine, basic integrations, REST API, execution logging |
| 2 | **Advanced** | Parallel execution, sub-workflows, advanced branching, webhooks, scheduling |
| 3 | **Intelligent** | AI-powered node suggestions, anomaly detection, self-healing workflows, ML pipelines |
| 4 | **Sovereign** | Multi-tenant orchestration, federated execution mesh, policy engine, full audit sovereignty |

## Tech Stack

- **Backend**: Node.js / TypeScript, Express
- **Database**: PostgreSQL (via `DATABASE_URL`)
- **Queue**: Redis (via `REDIS_URL`)
- **Storage**: S3 (via `S3_*` env vars)
- **Frontend**: React / TypeScript

## Getting Started

### Backend

```bash
cd backend
npm install
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `PORT` | HTTP server port (default: 4000) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `S3_BUCKET` | S3 bucket name for execution artifacts |
| `S3_REGION` | AWS region |
| `S3_ACCESS_KEY_ID` | AWS access key |
| `S3_SECRET_ACCESS_KEY` | AWS secret key |

## API Reference (Level 1 — Foundation)

```
POST   /api/workflows              Create a workflow
GET    /api/workflows              List all workflows
GET    /api/workflows/:id          Get a workflow by ID
PUT    /api/workflows/:id          Update a workflow
DELETE /api/workflows/:id          Delete a workflow
POST   /api/workflows/:id/execute  Trigger workflow execution
GET    /api/executions/:id         Get execution status & result
GET    /api/integrations           List available integrations
POST   /api/auth/register          Register a new user
POST   /api/auth/login             Authenticate and receive JWT
GET    /api/auth/me                Get current user profile
```

## Project Structure

```
axon-cloud/
├── backend/
│   ├── src/
│   │   ├── api/            # Route handlers
│   │   ├── core/           # Workflow engine, executor, registry
│   │   ├── db/             # Schema definitions & migrations
│   │   ├── queue/          # Redis job queue
│   │   ├── levels/         # 4-level architecture modules
│   │   └── index.ts        # Server entry point
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/     # WorkflowEditor, NodePalette, ExecutionMonitor
    │   ├── pages/          # Route-level page components
    │   └── App.tsx
    └── package.json
```
