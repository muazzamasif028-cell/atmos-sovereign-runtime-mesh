# Axon Omni Lab — Dashboard

The dashboard is built directly into the **face-service** as a server-rendered HTML page. No separate build step required.

## Access

Once face-service is running, open:

```
http://localhost:3000
```

## Features

### System Health Panel
- Live status of all 12 elements (green/yellow/red indicators)
- Click any element card to view its raw health JSON
- Auto-refreshes every 30 seconds

### AI Chat (Brain)
- Direct chat interface to the Brain service
- Supports DeepSeek and GPT-4o models
- Conversation history maintained in session
- Shows which model responded and whether it's mock mode

### Live Event Stream (Nervous System)
- Real-time WebSocket connection to the event bus
- Shows all events flowing through the nervous system
- Channel names, timestamps, and event data

### Scaling Metrics (Growth)
- CPU and memory usage bars
- Total replica counts
- Active alerts indicator

### Workflow Manager (Reflexes)
- Lists all automation workflows
- Shows trigger type, step count, and execution count
- One-click "Run" button to trigger any workflow
- "New Workflow" button creates a sample workflow

### Integration Status (Hands)
- Shows which integrations are configured vs. mock mode
- Covers: Stripe, Gmail, Slack, GitHub, Zapier, OpenAI, DeepSeek, Pinecone

## Extending the Dashboard

The dashboard HTML is in `services/face-service/index.js` as the `DASHBOARD_HTML` constant.

To add a new panel:
1. Add a new section in the HTML
2. Add a JavaScript function to fetch data from the relevant API
3. Call it in the `Init` section at the bottom of the script

## API Access

All 12 services are accessible via the API gateway at:

```
GET/POST /api/:service/:endpoint
```

Examples:
```
POST /api/brain/chat          → AI chat
POST /api/wisdom/search       → Semantic search
GET  /api/reflexes/workflows  → List workflows
POST /api/hands/slack/message → Send Slack message
GET  /api/growth/overview     → Scaling metrics
```

## GraphQL

A GraphQL endpoint is available at:

```
POST /graphql
```

Example query:
```graphql
{
  systemHealth {
    overall
    healthy
    total
    services {
      service
      status
      latencyMs
    }
  }
  workflows {
    id
    name
    enabled
    executionCount
  }
}
```
