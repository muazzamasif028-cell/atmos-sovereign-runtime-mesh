# Axon Omni Lab — Deployment Guide

---

## Deploying to Zeabur

Zeabur is the recommended platform for Axon Omni Lab. It provides managed PostgreSQL, Redis, and auto-scaling out of the box.

### Step 1: Create a Zeabur Project

1. Sign up at https://zeabur.com
2. Create a new project: "axon-omni-lab"
3. Choose your region (closest to your users)

### Step 2: Add Databases

In your Zeabur project, add:

1. **PostgreSQL** — Click "Add Service" → "Marketplace" → "PostgreSQL"
   - Note the `DATABASE_URL` from the service variables
   
2. **Redis** — Click "Add Service" → "Marketplace" → "Redis"
   - Note the `REDIS_URL` from the service variables

### Step 3: Deploy Services

For each service in `axon-omni-lab/services/`, create a Zeabur service:

1. Click "Add Service" → "Git"
2. Connect your GitHub repository
3. Set the root directory to `axon-omni-lab/services/face-service` (or whichever service)
4. Zeabur will auto-detect Node.js and run `npm start`

**Recommended deployment order:**
1. `dna-service` (needs DATABASE_URL)
2. `nervous-system-service` (needs REDIS_URL)
3. `brain-service`
4. `consciousness-service`
5. `wisdom-service`
6. `hands-service`
7. `reflexes-service`
8. `voice-service`
9. `growth-service`
10. `skeleton-service`
11. `skin-service`
12. `face-service` (last — needs all other service URLs)

### Step 4: Configure Environment Variables

For each service, set the required environment variables in Zeabur's "Variables" tab.

**face-service needs all service URLs:**
```
BRAIN_SERVICE_URL=https://brain-service.zeabur.app
HANDS_SERVICE_URL=https://hands-service.zeabur.app
VOICE_SERVICE_URL=https://voice-service.zeabur.app
CONSCIOUSNESS_SERVICE_URL=https://consciousness-service.zeabur.app
WISDOM_SERVICE_URL=https://wisdom-service.zeabur.app
REFLEXES_SERVICE_URL=https://reflexes-service.zeabur.app
NERVOUS_SYSTEM_URL=https://nervous-system-service.zeabur.app
GROWTH_SERVICE_URL=https://growth-service.zeabur.app
SKELETON_SERVICE_URL=https://skeleton-service.zeabur.app
SKIN_SERVICE_URL=https://skin-service.zeabur.app
DNA_SERVICE_URL=https://dna-service.zeabur.app
```

**All services need:**
```
NODE_ENV=production
DATABASE_URL=<from Zeabur PostgreSQL>
REDIS_URL=<from Zeabur Redis>
```

**brain-service needs:**
```
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
```

**hands-service needs:**
```
STRIPE_SECRET_KEY=sk_live_...
SLACK_BOT_TOKEN=xoxb-...
GITHUB_TOKEN=ghp_...
```

### Step 5: Configure Cloudflare

1. Add your domain to Cloudflare
2. Point DNS to your face-service Zeabur URL
3. Enable "Proxied" (orange cloud) for DDoS protection
4. Import WAF rules from `config/cloudflare-rules.json`
5. Set environment variables in skin-service:
   ```
   CLOUDFLARE_API_TOKEN=...
   CLOUDFLARE_ZONE_ID=...
   ```

### Step 6: Run Database Migrations

```bash
# Connect to your Zeabur PostgreSQL and run:
psql $DATABASE_URL -f axon-omni-lab/db/schema.sql
psql $DATABASE_URL -f axon-omni-lab/db/seed.sql
```

Or set `RUN_MIGRATIONS=true` in dna-service to auto-migrate on startup.

---

## Docker Compose (Local / Self-hosted)

```yaml
# docker-compose.yml (place in axon-omni-lab/)
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: axon_omni_lab
      POSTGRES_USER: axon
      POSTGRES_PASSWORD: axon_secret
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  face-service:
    build: ./services/face-service
    ports: ["3000:3000"]
    environment:
      PORT: 3000
      BRAIN_SERVICE_URL: http://brain-service:3001
      HANDS_SERVICE_URL: http://hands-service:3002
      # ... all other service URLs
    depends_on: [brain-service, dna-service]

  brain-service:
    build: ./services/brain-service
    ports: ["3001:3001"]
    environment:
      PORT: 3001
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}

  dna-service:
    build: ./services/dna-service
    ports: ["3011:3011"]
    environment:
      PORT: 3011
      DATABASE_URL: postgresql://axon:axon_secret@postgres:5432/axon_omni_lab
    depends_on: [postgres]

  # ... repeat for all 12 services

volumes:
  postgres_data:
```

---

## Kubernetes (Advanced)

For large-scale deployments, use Kubernetes with the Horizontal Pod Autoscaler:

```yaml
# k8s/brain-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: brain-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: brain-service
  template:
    metadata:
      labels:
        app: brain-service
    spec:
      containers:
      - name: brain-service
        image: your-registry/brain-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: PORT
          value: "3001"
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: axon-secrets
              key: openai-api-key
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: brain-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: brain-service
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Health Monitoring

All services expose `/health` endpoints. Set up uptime monitoring:

```bash
# Check all services
curl https://your-domain.com/api/health

# Response:
{
  "overall": "healthy",
  "healthy": 12,
  "total": 12,
  "services": [...]
}
```

Recommended monitoring tools:
- **Uptime Robot** — Free uptime monitoring
- **Better Uptime** — Incident management
- **Grafana + Prometheus** — Metrics dashboards

---

## Production Checklist

- [ ] All 12 services deployed and healthy
- [ ] PostgreSQL configured with `DATABASE_URL`
- [ ] Redis configured with `REDIS_URL`
- [ ] `JWT_SECRET` set to a strong random value
- [ ] `NODE_ENV=production` on all services
- [ ] Cloudflare WAF rules imported
- [ ] SSL/TLS enabled (Cloudflare handles this)
- [ ] Database migrations run
- [ ] At least one AI API key configured
- [ ] Monitoring/alerting set up
- [ ] Backup strategy for PostgreSQL
- [ ] Rate limiting configured
- [ ] `REQUIRE_API_KEY=true` if exposing publicly
