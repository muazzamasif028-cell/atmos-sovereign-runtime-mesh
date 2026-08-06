/**
 * AXON OMNI LAB — GraphQL Schema & Resolvers
 * Complex cross-service queries via a unified GraphQL endpoint
 *
 * This is a lightweight GraphQL implementation without a heavy framework.
 * For production, consider using Apollo Server or Yoga.
 */

// ─── Schema Definition ────────────────────────────────────────────────────────
export const typeDefs = `
  type Query {
    # System
    systemHealth: SystemHealth!
    serviceHealth(service: String!): ServiceHealth

    # AI / Brain
    aiStats: AIStats!
    aiModels: [AIModel!]!

    # Conversations / Consciousness
    conversations(userId: String, limit: Int): [Conversation!]!
    session(id: String!): Session

    # Workflows / Reflexes
    workflows(enabled: Boolean, limit: Int): [Workflow!]!
    workflow(id: Int!): Workflow
    executions(workflowId: Int, status: String, limit: Int): [Execution!]!

    # Knowledge / Wisdom
    knowledgeStats: KnowledgeStats!
    documents(namespace: String, limit: Int): [Document!]!

    # Integrations / Hands
    integrationStatus: IntegrationStatus!

    # Scaling / Growth
    scalingOverview: ScalingOverview!
    scalingHistory(service: String, limit: Int): [ScalingEvent!]!

    # Security / Skin
    securityPosture: SecurityPosture!
    recentThreats(limit: Int): [Threat!]!

    # Persistence / DNA
    users(limit: Int): [User!]!
    auditLog(table: String, limit: Int): [AuditEntry!]!
  }

  type Mutation {
    # AI
    chat(message: String!, model: String, sessionId: String): ChatResponse!
    reason(problem: String!, context: String): ReasoningResponse!

    # Workflows
    createWorkflow(input: WorkflowInput!): Workflow!
    triggerWorkflow(id: Int!): Execution!
    updateWorkflow(id: Int!, enabled: Boolean): Workflow!

    # Knowledge
    addKnowledge(content: String!, metadata: JSON, namespace: String): Document!
    searchKnowledge(query: String!, topK: Int, namespace: String): [SearchResult!]!

    # Integrations
    sendSlackMessage(channel: String!, text: String!): SlackResult!
    createStripeCharge(amount: Int!, currency: String, customerId: String): StripeResult!
    sendEmail(to: String!, subject: String!, body: String!): EmailResult!

    # Events
    publishEvent(channel: String!, data: JSON!): Event!
    broadcast(message: String!, severity: String): Event!

    # Users
    createUser(email: String!, name: String, role: String): User!
  }

  type Subscription {
    events(channels: [String!]): Event!
    workflowExecutions: Execution!
    systemAlerts: Alert!
  }

  # ── Types ──────────────────────────────────────────────────────────────────

  type SystemHealth {
    overall: String!
    healthy: Int!
    total: Int!
    services: [ServiceHealth!]!
    timestamp: String!
  }

  type ServiceHealth {
    service: String!
    element: Int
    name: String
    status: String!
    latencyMs: Int
    error: String
  }

  type AIStats {
    totalRequests: Int!
    totalTokensIn: Int!
    totalTokensOut: Int!
    errors: Int!
    modelUsage: JSON
  }

  type AIModel {
    name: String!
    provider: String!
    maxTokens: Int!
    costPer1k: Float!
  }

  type ChatResponse {
    reply: String!
    model: String!
    usage: TokenUsage
    mock: Boolean
  }

  type ReasoningResponse {
    reasoning: String!
    model: String!
    usage: TokenUsage
  }

  type TokenUsage {
    promptTokens: Int
    completionTokens: Int
    totalTokens: Int
  }

  type Conversation {
    id: String!
    userId: String
    title: String
    messages: [Message!]!
    createdAt: String!
    updatedAt: String!
  }

  type Message {
    id: String
    role: String!
    content: String!
    timestamp: String
  }

  type Session {
    id: String!
    userId: String
    messages: [Message!]!
    intent: String
    sentiment: String
    messageCount: Int!
  }

  type Workflow {
    id: Int!
    name: String!
    description: String
    trigger: JSON
    steps: [JSON!]!
    enabled: Boolean!
    executionCount: Int!
    lastExecutedAt: String
    createdAt: String!
  }

  input WorkflowInput {
    name: String!
    description: String
    trigger: JSON
    steps: [JSON!]!
    enabled: Boolean
  }

  type Execution {
    id: String!
    workflowId: Int!
    workflowName: String
    status: String!
    steps: [JSON!]!
    startedAt: String!
    completedAt: String
    error: String
  }

  type KnowledgeStats {
    totalDocuments: Int!
    namespaces: [NamespaceInfo!]!
    embeddingDimensions: Int
  }

  type NamespaceInfo {
    name: String!
    count: Int!
  }

  type Document {
    id: String!
    content: String!
    namespace: String!
    metadata: JSON
    createdAt: String!
  }

  type SearchResult {
    id: String!
    content: String!
    score: Float!
    metadata: JSON
  }

  type IntegrationStatus {
    stripe: IntegrationInfo!
    slack: IntegrationInfo!
    gmail: IntegrationInfo!
    github: IntegrationInfo!
    zapier: IntegrationInfo!
    openai: IntegrationInfo!
    deepseek: IntegrationInfo!
    pinecone: IntegrationInfo!
  }

  type IntegrationInfo {
    name: String!
    configured: Boolean!
  }

  type ScalingOverview {
    totalServices: Int!
    totalReplicas: Int!
    averageCpu: Int!
    averageMemory: Int!
    activeAlerts: Int!
    replicaCounts: JSON
  }

  type ScalingEvent {
    id: String!
    service: String!
    action: String!
    from: Int!
    to: Int!
    reason: String
    timestamp: String!
  }

  type SecurityPosture {
    waf: JSON
    ddosProtection: JSON
    rateLimiting: JSON
    tls: JSON
  }

  type Threat {
    type: String!
    ip: String
    severity: String
    timestamp: String!
  }

  type User {
    id: String!
    email: String!
    name: String
    role: String!
    createdAt: String!
  }

  type AuditEntry {
    id: String!
    action: String!
    tableName: String
    recordId: String
    performedBy: String
    timestamp: String!
  }

  type SlackResult {
    ok: Boolean!
    ts: String
    mock: Boolean
  }

  type StripeResult {
    id: String!
    amount: Int!
    status: String!
    mock: Boolean
  }

  type EmailResult {
    id: String!
    to: String!
    subject: String!
    mock: Boolean
  }

  type Event {
    id: String!
    channel: String!
    data: JSON
    source: String
    timestamp: String!
  }

  type Alert {
    service: String!
    type: String!
    value: Float!
    threshold: Float!
    timestamp: String!
  }

  scalar JSON
`;

// ─── Resolver Factory ─────────────────────────────────────────────────────────
export function createResolvers(services) {
  async function fetchService(service, path, method = 'GET', body = null) {
    const url = services[service];
    if (!url) throw new Error(`Service ${service} not configured`);

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${url}${path}`, options);
    return response.json();
  }

  return {
    Query: {
      systemHealth: async () => {
        const checks = await Promise.allSettled(
          Object.entries(services).map(async ([key, url]) => {
            const start = Date.now();
            try {
              const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
              const d = await r.json();
              return { service: key, status: d.status || 'healthy', latencyMs: Date.now() - start };
            } catch (err) {
              return { service: key, status: 'offline', error: err.message, latencyMs: Date.now() - start };
            }
          })
        );
        const results = checks.map(c => c.value || c.reason);
        const healthy = results.filter(r => r.status === 'healthy').length;
        return { overall: healthy === 12 ? 'healthy' : 'degraded', healthy, total: 12, services: results, timestamp: new Date().toISOString() };
      },

      aiStats:   () => fetchService('brain', '/stats').then(d => d.stats || d),
      aiModels:  () => fetchService('brain', '/models').then(d => Object.entries(d.models || {}).map(([name, m]) => ({ name, ...m }))),

      conversations: (_, { userId, limit = 20 }) =>
        fetchService('dna', `/conversations${userId ? `?userId=${userId}` : ''}`).then(d => (d.conversations || []).slice(0, limit)),

      session: (_, { id }) => fetchService('consciousness', `/sessions/${id}`).then(d => d.session),

      workflows: (_, { enabled, limit = 50 }) =>
        fetchService('reflexes', '/workflows').then(d => {
          let wfs = d.workflows || [];
          if (enabled !== undefined) wfs = wfs.filter(w => w.enabled === enabled);
          return wfs.slice(0, limit);
        }),

      workflow: (_, { id }) => fetchService('reflexes', `/workflows/${id}`).then(d => d.workflow),

      executions: (_, { workflowId, status, limit = 50 }) => {
        const params = new URLSearchParams({ limit });
        if (workflowId) params.append('workflowId', workflowId);
        if (status)     params.append('status', status);
        return fetchService('reflexes', `/executions?${params}`).then(d => d.executions || []);
      },

      knowledgeStats: () => fetchService('wisdom', '/stats'),
      documents: (_, { namespace, limit = 20 }) => {
        const params = new URLSearchParams({ limit });
        if (namespace) params.append('namespace', namespace);
        return fetchService('wisdom', `/documents?${params}`).then(d => d.documents || []);
      },

      integrationStatus: () => fetchService('hands', '/health').then(d => {
        const ints = d.integrations || {};
        return Object.fromEntries(
          ['stripe', 'slack', 'gmail', 'github', 'zapier', 'openai', 'deepseek', 'pinecone'].map(name => [
            name, { name, configured: ints[name]?.configured || false }
          ])
        );
      }),

      scalingOverview: () => fetchService('growth', '/overview'),
      scalingHistory: (_, { service, limit = 50 }) => {
        const params = new URLSearchParams({ limit });
        if (service) params.append('service', service);
        return fetchService('growth', `/history?${params}`).then(d => d.history || []);
      },

      securityPosture: () => fetchService('skin', '/posture').then(d => d.posture),
      recentThreats: (_, { limit = 20 }) =>
        fetchService('skin', `/threats?limit=${limit}`).then(d => d.threats || []),

      users: (_, { limit = 50 }) =>
        fetchService('dna', '/users').then(d => (d.users || []).slice(0, limit)),

      auditLog: (_, { table, limit = 50 }) => {
        const params = new URLSearchParams({ limit });
        if (table) params.append('table', table);
        return fetchService('dna', `/audit?${params}`).then(d => (d.logs || []).map(l => ({
          ...l, tableName: l.table_name, performedBy: l.performed_by
        })));
      },
    },

    Mutation: {
      chat: (_, { message, model, sessionId }) =>
        fetchService('brain', '/chat', 'POST', { message, model }).then(d => ({
          reply: d.reply || d.error,
          model: d.model || 'unknown',
          usage: d.usage,
          mock: d.mock,
        })),

      reason: (_, { problem, context }) =>
        fetchService('brain', '/reason', 'POST', { problem, context }),

      createWorkflow: (_, { input }) =>
        fetchService('reflexes', '/workflows', 'POST', input).then(d => d.workflow),

      triggerWorkflow: (_, { id }) =>
        fetchService('reflexes', `/workflows/${id}/trigger`, 'POST', {}).then(d => d.execution),

      updateWorkflow: (_, { id, ...updates }) =>
        fetchService('reflexes', `/workflows/${id}`, 'PATCH', updates).then(d => d.workflow),

      addKnowledge: (_, { content, metadata, namespace }) =>
        fetchService('wisdom', '/upsert', 'POST', { content, metadata, namespace }).then(d => ({
          id: d.id, content, namespace: d.namespace || namespace || 'default', metadata, createdAt: d.timestamp,
        })),

      searchKnowledge: (_, { query, topK, namespace }) =>
        fetchService('wisdom', '/search', 'POST', { query, topK, namespace }).then(d => d.results || []),

      sendSlackMessage: (_, { channel, text }) =>
        fetchService('hands', '/slack/message', 'POST', { channel, text }),

      createStripeCharge: (_, { amount, currency, customerId }) =>
        fetchService('hands', '/stripe/charge', 'POST', { amount, currency, customerId }),

      sendEmail: (_, { to, subject, body }) =>
        fetchService('hands', '/gmail/send', 'POST', { to, subject, body }),

      publishEvent: (_, { channel, data }) =>
        fetchService('nervous', '/publish', 'POST', { channel, data }).then(d => d.event),

      broadcast: (_, { message, severity }) =>
        fetchService('nervous', '/broadcast', 'POST', { message, severity }).then(d => d.event),

      createUser: (_, { email, name, role }) =>
        fetchService('dna', '/users', 'POST', { email, name, role }).then(d => d.user),
    },
  };
}

export default { typeDefs, createResolvers };
