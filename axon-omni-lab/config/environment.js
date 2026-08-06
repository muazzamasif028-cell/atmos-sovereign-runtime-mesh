/**
 * AXON OMNI LAB — Environment Configuration
 * Central config loader with validation and defaults
 */

export const config = {
  // ── Service Ports ───────────────────────────────────────────────────────────
  ports: {
    face:          parseInt(process.env.PORT)                    || 3000,
    brain:         parseInt(process.env.BRAIN_PORT)              || 3001,
    hands:         parseInt(process.env.HANDS_PORT)              || 3002,
    voice:         parseInt(process.env.VOICE_PORT)              || 3003,
    consciousness: parseInt(process.env.CONSCIOUSNESS_PORT)      || 3004,
    wisdom:        parseInt(process.env.WISDOM_PORT)             || 3005,
    reflexes:      parseInt(process.env.REFLEXES_PORT)           || 3006,
    nervous:       parseInt(process.env.NERVOUS_PORT)            || 3007,
    growth:        parseInt(process.env.GROWTH_PORT)             || 3008,
    skeleton:      parseInt(process.env.SKELETON_PORT)           || 3009,
    skin:          parseInt(process.env.SKIN_PORT)               || 3010,
    dna:           parseInt(process.env.DNA_PORT)                || 3011,
    gateway:       parseInt(process.env.GATEWAY_PORT)            || 4000,
  },

  // ── Service URLs ────────────────────────────────────────────────────────────
  services: {
    face:          process.env.FACE_SERVICE_URL          || 'http://localhost:3000',
    brain:         process.env.BRAIN_SERVICE_URL         || 'http://localhost:3001',
    hands:         process.env.HANDS_SERVICE_URL         || 'http://localhost:3002',
    voice:         process.env.VOICE_SERVICE_URL         || 'http://localhost:3003',
    consciousness: process.env.CONSCIOUSNESS_SERVICE_URL || 'http://localhost:3004',
    wisdom:        process.env.WISDOM_SERVICE_URL        || 'http://localhost:3005',
    reflexes:      process.env.REFLEXES_SERVICE_URL      || 'http://localhost:3006',
    nervous:       process.env.NERVOUS_SYSTEM_URL        || 'http://localhost:3007',
    growth:        process.env.GROWTH_SERVICE_URL        || 'http://localhost:3008',
    skeleton:      process.env.SKELETON_SERVICE_URL      || 'http://localhost:3009',
    skin:          process.env.SKIN_SERVICE_URL          || 'http://localhost:3010',
    dna:           process.env.DNA_SERVICE_URL           || 'http://localhost:3011',
  },

  // ── Database ────────────────────────────────────────────────────────────────
  database: {
    url:         process.env.DATABASE_URL,
    poolMin:     parseInt(process.env.DB_POOL_MIN)  || 2,
    poolMax:     parseInt(process.env.DB_POOL_MAX)  || 10,
    ssl:         process.env.DB_SSL !== 'false',
    migrations:  process.env.RUN_MIGRATIONS === 'true',
  },

  // ── Redis ───────────────────────────────────────────────────────────────────
  redis: {
    url:      process.env.REDIS_URL,
    ttl:      parseInt(process.env.REDIS_TTL) || 3600,
    prefix:   process.env.REDIS_PREFIX || 'axon:',
  },

  // ── AI Models ───────────────────────────────────────────────────────────────
  ai: {
    openaiApiKey:    process.env.OPENAI_API_KEY,
    deepseekApiKey:  process.env.DEEPSEEK_API_KEY,
    defaultModel:    process.env.DEFAULT_AI_MODEL || 'deepseek-chat',
    maxTokens:       parseInt(process.env.AI_MAX_TOKENS) || 2048,
    temperature:     parseFloat(process.env.AI_TEMPERATURE) || 0.7,
  },

  // ── Vector DB ───────────────────────────────────────────────────────────────
  vectors: {
    pineconeApiKey:   process.env.PINECONE_API_KEY,
    pineconeIndexUrl: process.env.PINECONE_INDEX_URL,
    pineconeEnv:      process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
    embeddingModel:   process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions:       parseInt(process.env.EMBEDDING_DIMENSIONS) || 1536,
  },

  // ── Integrations ────────────────────────────────────────────────────────────
  integrations: {
    stripe: {
      secretKey:     process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    },
    slack: {
      botToken:      process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      appToken:      process.env.SLACK_APP_TOKEN,
    },
    gmail: {
      clientId:     process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
    github: {
      token:        process.env.GITHUB_TOKEN,
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    },
    zapier: {
      webhookUrl: process.env.ZAPIER_WEBHOOK_URL,
    },
  },

  // ── Cloudflare ──────────────────────────────────────────────────────────────
  cloudflare: {
    apiToken:   process.env.CLOUDFLARE_API_TOKEN,
    zoneId:     process.env.CLOUDFLARE_ZONE_ID,
    accountId:  process.env.CLOUDFLARE_ACCOUNT_ID,
  },

  // ── Security ────────────────────────────────────────────────────────────────
  security: {
    jwtSecret:      process.env.JWT_SECRET || 'change-me-in-production',
    jwtExpiresIn:   process.env.JWT_EXPIRES_IN || '24h',
    apiKeys:        (process.env.API_KEYS || '').split(',').filter(Boolean),
    requireApiKey:  process.env.REQUIRE_API_KEY === 'true',
    allowedOrigin:  process.env.ALLOWED_ORIGIN || '*',
    rateLimitMax:   parseInt(process.env.RATE_LIMIT_MAX) || 100,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  },

  // ── App ─────────────────────────────────────────────────────────────────────
  app: {
    env:         process.env.NODE_ENV || 'development',
    name:        'axon-omni-lab',
    version:     '1.0.0',
    logLevel:    process.env.LOG_LEVEL || 'info',
    deployTime:  process.env.DEPLOY_TIME || new Date().toISOString(),
    zeaburRegion: process.env.ZEABUR_REGION || 'auto',
  },
};

// ─── Validation ───────────────────────────────────────────────────────────────
export function validateConfig() {
  const warnings = [];
  const errors = [];

  if (!config.security.jwtSecret || config.security.jwtSecret === 'change-me-in-production') {
    if (config.app.env === 'production') {
      errors.push('JWT_SECRET must be set in production');
    } else {
      warnings.push('JWT_SECRET not set — using insecure default (OK for development)');
    }
  }

  if (!config.database.url) {
    warnings.push('DATABASE_URL not set — using in-memory storage (data will not persist)');
  }

  if (!config.redis.url) {
    warnings.push('REDIS_URL not set — using in-memory bus (no cross-instance messaging)');
  }

  if (!config.ai.openaiApiKey && !config.ai.deepseekApiKey) {
    warnings.push('No AI API keys configured — AI features will use mock responses');
  }

  if (!config.vectors.pineconeApiKey) {
    warnings.push('PINECONE_API_KEY not set — using in-memory vector store');
  }

  const configuredIntegrations = Object.entries(config.integrations)
    .filter(([, cfg]) => Object.values(cfg).some(v => !!v))
    .map(([name]) => name);

  if (configuredIntegrations.length === 0) {
    warnings.push('No third-party integrations configured — all will use mock mode');
  }

  return { warnings, errors, valid: errors.length === 0 };
}

// ─── Print config summary ─────────────────────────────────────────────────────
export function printConfigSummary() {
  const { warnings, errors, valid } = validateConfig();

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║          AXON OMNI LAB — Configuration               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Environment:  ${config.app.env}`);
  console.log(`  Database:     ${config.database.url ? '✓ PostgreSQL' : '✗ In-memory'}`);
  console.log(`  Redis:        ${config.redis.url ? '✓ Connected' : '✗ In-memory'}`);
  console.log(`  OpenAI:       ${config.ai.openaiApiKey ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  DeepSeek:     ${config.ai.deepseekApiKey ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  Pinecone:     ${config.vectors.pineconeApiKey ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  Cloudflare:   ${config.cloudflare.apiToken ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  Stripe:       ${config.integrations.stripe.secretKey ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  Slack:        ${config.integrations.slack.botToken ? '✓ Configured' : '✗ Not set'}`);
  console.log(`  GitHub:       ${config.integrations.github.token ? '✓ Configured' : '✗ Not set'}`);

  if (warnings.length > 0) {
    console.log('\n  ⚠ Warnings:');
    warnings.forEach(w => console.log(`    - ${w}`));
  }

  if (errors.length > 0) {
    console.log('\n  ✗ Errors:');
    errors.forEach(e => console.log(`    - ${e}`));
  }

  console.log(`\n  Status: ${valid ? '✓ Valid' : '✗ Invalid'}\n`);
  return { warnings, errors, valid };
}

export default config;
