/**
 * Axon Cloud — Integration Registry
 *
 * Central catalogue of all available integrations, organised by the minimum
 * architecture level required to use them.
 */

export type IntegrationLevel = 1 | 2 | 3 | 4;
export type IntegrationCategory =
  | 'communication'
  | 'database'
  | 'storage'
  | 'crm'
  | 'analytics'
  | 'ai'
  | 'devops'
  | 'finance'
  | 'productivity'
  | 'security';

export interface IntegrationParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'secret' | 'json';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  levelRequired: IntegrationLevel;
  version: string;
  iconUrl?: string;
  parameters: IntegrationParameter[];
  actions: string[];
  triggers: string[];
}

// ── Registry ──────────────────────────────────────────────────────────────────

const INTEGRATIONS: Integration[] = [
  // ── Level 1 — Foundation ──────────────────────────────────────────────────
  {
    id: 'http',
    name: 'HTTP / REST',
    description: 'Make HTTP requests to any REST API.',
    category: 'productivity',
    levelRequired: 1,
    version: '1.0.0',
    parameters: [
      { name: 'url', type: 'string', required: true, description: 'Target URL' },
      { name: 'method', type: 'string', required: false, description: 'HTTP method', default: 'GET' },
      { name: 'headers', type: 'json', required: false, description: 'Request headers' },
      { name: 'body', type: 'json', required: false, description: 'Request body' },
    ],
    actions: ['request'],
    triggers: ['webhook'],
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Query and mutate PostgreSQL databases.',
    category: 'database',
    levelRequired: 1,
    version: '1.0.0',
    parameters: [
      { name: 'connectionString', type: 'secret', required: true, description: 'PostgreSQL connection string' },
      { name: 'sql', type: 'string', required: true, description: 'SQL query' },
      { name: 'values', type: 'json', required: false, description: 'Parameterised values' },
    ],
    actions: ['query', 'insert', 'update', 'delete'],
    triggers: ['row_inserted', 'row_updated'],
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'Read and write Redis keys, publish to channels.',
    category: 'database',
    levelRequired: 1,
    version: '1.0.0',
    parameters: [
      { name: 'url', type: 'secret', required: true, description: 'Redis connection URL' },
      { name: 'command', type: 'string', required: true, description: 'Redis command (GET, SET, PUBLISH…)' },
      { name: 'args', type: 'json', required: false, description: 'Command arguments' },
    ],
    actions: ['get', 'set', 'del', 'publish', 'subscribe'],
    triggers: ['message'],
  },
  {
    id: 'email_smtp',
    name: 'Email (SMTP)',
    description: 'Send transactional emails via SMTP.',
    category: 'communication',
    levelRequired: 1,
    version: '1.0.0',
    parameters: [
      { name: 'host', type: 'string', required: true, description: 'SMTP host' },
      { name: 'port', type: 'number', required: false, description: 'SMTP port', default: 587 },
      { name: 'user', type: 'string', required: true, description: 'SMTP username' },
      { name: 'password', type: 'secret', required: true, description: 'SMTP password' },
      { name: 'from', type: 'string', required: true, description: 'Sender address' },
    ],
    actions: ['send'],
    triggers: [],
  },
  {
    id: 's3',
    name: 'Amazon S3',
    description: 'Upload, download, and manage S3 objects.',
    category: 'storage',
    levelRequired: 1,
    version: '1.0.0',
    parameters: [
      { name: 'bucket', type: 'string', required: true, description: 'S3 bucket name' },
      { name: 'region', type: 'string', required: true, description: 'AWS region' },
      { name: 'accessKeyId', type: 'secret', required: true, description: 'AWS access key ID' },
      { name: 'secretAccessKey', type: 'secret', required: true, description: 'AWS secret access key' },
    ],
    actions: ['get_object', 'put_object', 'delete_object', 'list_objects'],
    triggers: ['object_created', 'object_deleted'],
  },

  // ── Level 2 — Advanced ────────────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages, manage channels, and react to Slack events.',
    category: 'communication',
    levelRequired: 2,
    version: '1.0.0',
    parameters: [
      { name: 'botToken', type: 'secret', required: true, description: 'Slack bot OAuth token' },
      { name: 'channel', type: 'string', required: true, description: 'Channel ID or name' },
    ],
    actions: ['post_message', 'update_message', 'upload_file'],
    triggers: ['message_received', 'reaction_added'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Automate GitHub repositories, issues, and pull requests.',
    category: 'devops',
    levelRequired: 2,
    version: '1.0.0',
    parameters: [
      { name: 'token', type: 'secret', required: true, description: 'GitHub personal access token' },
      { name: 'owner', type: 'string', required: true, description: 'Repository owner' },
      { name: 'repo', type: 'string', required: true, description: 'Repository name' },
    ],
    actions: ['create_issue', 'create_pr', 'merge_pr', 'add_comment'],
    triggers: ['push', 'pull_request', 'issue_opened'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments and manage subscriptions.',
    category: 'finance',
    levelRequired: 2,
    version: '1.0.0',
    parameters: [
      { name: 'secretKey', type: 'secret', required: true, description: 'Stripe secret key' },
    ],
    actions: ['create_charge', 'create_customer', 'create_subscription', 'refund'],
    triggers: ['payment_succeeded', 'payment_failed', 'subscription_updated'],
  },

  // ── Level 3 — Intelligent ─────────────────────────────────────────────────
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Integrate GPT models, embeddings, and DALL-E into workflows.',
    category: 'ai',
    levelRequired: 3,
    version: '1.0.0',
    parameters: [
      { name: 'apiKey', type: 'secret', required: true, description: 'OpenAI API key' },
      { name: 'model', type: 'string', required: false, description: 'Model ID', default: 'gpt-4o' },
    ],
    actions: ['chat_completion', 'embedding', 'image_generation', 'transcription'],
    triggers: [],
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    description: 'Vector database for semantic search and RAG pipelines.',
    category: 'ai',
    levelRequired: 3,
    version: '1.0.0',
    parameters: [
      { name: 'apiKey', type: 'secret', required: true, description: 'Pinecone API key' },
      { name: 'environment', type: 'string', required: true, description: 'Pinecone environment' },
      { name: 'indexName', type: 'string', required: true, description: 'Index name' },
    ],
    actions: ['upsert', 'query', 'delete', 'fetch'],
    triggers: [],
  },

  // ── Level 4 — Sovereign ───────────────────────────────────────────────────
  {
    id: 'axon_mesh',
    name: 'Axon Execution Mesh',
    description: 'Federated cross-tenant workflow orchestration across the Axon mesh.',
    category: 'devops',
    levelRequired: 4,
    version: '0.1.0',
    parameters: [
      { name: 'meshEndpoint', type: 'string', required: true, description: 'Mesh coordinator endpoint' },
      { name: 'tenantId', type: 'string', required: true, description: 'Tenant identifier' },
      { name: 'meshToken', type: 'secret', required: true, description: 'Mesh authentication token' },
    ],
    actions: ['dispatch_workflow', 'query_mesh_status', 'broadcast_event'],
    triggers: ['mesh_event', 'policy_violation'],
  },
];

// ── IntegrationRegistry ───────────────────────────────────────────────────────

export class IntegrationRegistry {
  private integrations: Map<string, Integration>;

  constructor() {
    this.integrations = new Map(INTEGRATIONS.map((i) => [i.id, i]));
  }

  getAll(): Integration[] {
    return Array.from(this.integrations.values());
  }

  getById(id: string): Integration | undefined {
    return this.integrations.get(id);
  }

  getByLevel(maxLevel: IntegrationLevel): Integration[] {
    return this.getAll().filter((i) => i.levelRequired <= maxLevel);
  }

  getByCategory(category: IntegrationCategory): Integration[] {
    return this.getAll().filter((i) => i.category === category);
  }

  register(integration: Integration): void {
    if (this.integrations.has(integration.id)) {
      throw new Error(`Integration "${integration.id}" is already registered.`);
    }
    this.integrations.set(integration.id, integration);
  }
}

export const integrationRegistry = new IntegrationRegistry();
