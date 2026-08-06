# Axon Omni Lab — Integration Guides

All integrations are handled by the **Hands Service** (Element 8). Each integration requires API credentials set as environment variables.

---

## Stripe (Payments)

### Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard → Developers → API Keys
3. Set environment variables:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Usage

```bash
# Create a customer
curl -X POST http://localhost:3000/api/hands/stripe/customer \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@example.com", "name": "John Doe"}'

# Create a charge
curl -X POST http://localhost:3000/api/hands/stripe/charge \
  -H "Content-Type: application/json" \
  -d '{"amount": 2000, "currency": "usd", "customerId": "cus_xxx"}'
```

### Webhooks

Configure your Stripe webhook to point to:
```
POST https://your-domain.com/api/hands/stripe/webhook
```

---

## Slack (Messaging)

### Setup

1. Create a Slack App at https://api.slack.com/apps
2. Add Bot Token Scopes: `chat:write`, `channels:read`, `users:read`
3. Install the app to your workspace
4. Set environment variables:

```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

### Usage

```bash
# Send a message
curl -X POST http://localhost:3000/api/hands/slack/message \
  -H "Content-Type: application/json" \
  -d '{"channel": "#general", "text": "Hello from Axon!"}'

# Send a rich notification
curl -X POST http://localhost:3000/api/hands/slack/notify \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "#alerts",
    "title": "Workflow Completed",
    "message": "Daily report generated successfully",
    "fields": [
      {"label": "Duration", "value": "2.3s"},
      {"label": "Records", "value": "142"}
    ]
  }'
```

---

## Gmail (Email)

### Setup

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Desktop app)
3. Enable the Gmail API
4. Get a refresh token using the OAuth2 playground or a script
5. Set environment variables:

```env
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
```

### Getting a Refresh Token

```bash
# Use the OAuth2 playground: https://developers.google.com/oauthplayground
# Or use this Node.js snippet:

import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.send'],
});

console.log('Visit:', authUrl);
// After authorization, exchange the code for tokens
```

### Usage

```bash
curl -X POST http://localhost:3000/api/hands/gmail/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from Axon",
    "body": "This email was sent by Axon Omni Lab",
    "html": "<h1>Hello!</h1><p>This email was sent by <strong>Axon Omni Lab</strong></p>"
  }'
```

---

## GitHub (Code)

### Setup

1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
2. Create a token with scopes: `repo`, `issues`, `pull_requests`
3. Set environment variable:

```env
GITHUB_TOKEN=ghp_...
```

### Usage

```bash
# Create an issue
curl -X POST http://localhost:3000/api/hands/github/issue \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "my-org",
    "repo": "my-repo",
    "title": "Bug: Something is broken",
    "body": "Steps to reproduce...",
    "labels": ["bug"]
  }'

# Get repo info
curl http://localhost:3000/api/hands/github/repos/my-org/my-repo
```

---

## Zapier (Automation)

### Setup

1. Create a Zapier account at https://zapier.com
2. Create a new Zap with "Webhooks by Zapier" as the trigger
3. Choose "Catch Hook" and copy the webhook URL
4. Set environment variable:

```env
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
```

### Usage

```bash
# Trigger a Zap
curl -X POST http://localhost:3000/api/hands/zapier/trigger \
  -H "Content-Type: application/json" \
  -d '{"event": "user.signup", "data": {"email": "user@example.com", "plan": "pro"}}'
```

---

## OpenAI (AI)

### Setup

1. Create an account at https://platform.openai.com
2. Generate an API key
3. Set environment variable:

```env
OPENAI_API_KEY=sk-...
```

### Models Available

| Model | Best For | Cost |
|-------|----------|------|
| `gpt-4o` | Complex reasoning, long context | $$$ |
| `gpt-4o-mini` | Fast, cost-effective | $ |

### Usage

```bash
curl -X POST http://localhost:3000/api/brain/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain quantum computing", "model": "gpt-4o"}'
```

---

## DeepSeek (AI)

### Setup

1. Create an account at https://platform.deepseek.com
2. Generate an API key
3. Set environment variable:

```env
DEEPSEEK_API_KEY=sk-...
```

### Models Available

| Model | Best For | Cost |
|-------|----------|------|
| `deepseek-chat` | General chat, fast | $ |
| `deepseek-coder` | Code generation | $ |
| `deepseek-reasoner` | Deep reasoning (R1) | $$ |

### Usage

```bash
curl -X POST http://localhost:3000/api/brain/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Write a Python function to sort a list", "model": "deepseek-coder"}'
```

---

## Pinecone (Vector Database)

### Setup

1. Create an account at https://pinecone.io
2. Create an index (dimension: 1536 for OpenAI embeddings, cosine metric)
3. Get your API key and index URL
4. Set environment variables:

```env
PINECONE_API_KEY=...
PINECONE_INDEX_URL=https://my-index-xxx.svc.pinecone.io
PINECONE_ENVIRONMENT=us-east-1-aws
```

### Usage

```bash
# Add knowledge
curl -X POST http://localhost:3000/api/wisdom/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Axon Omni Lab is a 12-element living platform",
    "metadata": {"source": "docs", "version": "1.0"},
    "namespace": "documentation"
  }'

# Search
curl -X POST http://localhost:3000/api/wisdom/search \
  -H "Content-Type: application/json" \
  -d '{"query": "what is axon", "topK": 5, "namespace": "documentation"}'
```

---

## Cloudflare (Security)

### Setup

1. Add your domain to Cloudflare
2. Create an API token with Zone:Edit permissions
3. Get your Zone ID from the Cloudflare dashboard
4. Set environment variables:

```env
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_ACCOUNT_ID=...
```

### WAF Rules

Import the rules from `config/cloudflare-rules.json` via the Cloudflare dashboard or API.

### Usage

```bash
# Check security posture
curl http://localhost:3000/api/skin/posture

# View WAF rules
curl http://localhost:3000/api/skin/waf/rules

# View recent threats
curl http://localhost:3000/api/skin/threats
```

---

## Mock Mode

All integrations work in **mock mode** when API keys are not configured. Mock responses are clearly marked with `"mock": true` in the response. This allows full development and testing without real API credentials.
