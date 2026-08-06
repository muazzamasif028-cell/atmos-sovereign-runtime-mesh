/**
 * Cloudflare Integration
 * Zone management, WAF rules, DNS, Workers, and analytics
 */

const CF_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;
const CF_ZONE_ID    = process.env.CLOUDFLARE_ZONE_ID;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const BASE_URL = 'https://api.cloudflare.com/client/v4';

async function cfRequest(path, method = 'GET', body = null) {
  if (!CF_API_TOKEN) throw new Error('CLOUDFLARE_API_TOKEN not configured');

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!data.success) throw new Error(`Cloudflare error: ${JSON.stringify(data.errors)}`);
  return data.result;
}

export const cloudflare = {
  // ── Zone ───────────────────────────────────────────────────────────────────
  async getZone(zoneId = CF_ZONE_ID) {
    return cfRequest(`/zones/${zoneId}`);
  },

  async listZones() {
    return cfRequest('/zones');
  },

  async purgeCache({ zoneId = CF_ZONE_ID, files, tags, hosts, prefixes } = {}) {
    const body = {};
    if (files)    body.files    = files;
    if (tags)     body.tags     = tags;
    if (hosts)    body.hosts    = hosts;
    if (prefixes) body.prefixes = prefixes;
    if (!Object.keys(body).length) body.purge_everything = true;
    return cfRequest(`/zones/${zoneId}/purge_cache`, 'POST', body);
  },

  // ── DNS ────────────────────────────────────────────────────────────────────
  async listDnsRecords(zoneId = CF_ZONE_ID) {
    return cfRequest(`/zones/${zoneId}/dns_records`);
  },

  async createDnsRecord(zoneId = CF_ZONE_ID, { type, name, content, ttl = 1, proxied = true }) {
    return cfRequest(`/zones/${zoneId}/dns_records`, 'POST', { type, name, content, ttl, proxied });
  },

  async updateDnsRecord(zoneId = CF_ZONE_ID, recordId, updates) {
    return cfRequest(`/zones/${zoneId}/dns_records/${recordId}`, 'PATCH', updates);
  },

  async deleteDnsRecord(zoneId = CF_ZONE_ID, recordId) {
    return cfRequest(`/zones/${zoneId}/dns_records/${recordId}`, 'DELETE');
  },

  // ── Firewall Rules ─────────────────────────────────────────────────────────
  async listFirewallRules(zoneId = CF_ZONE_ID) {
    return cfRequest(`/zones/${zoneId}/firewall/rules`);
  },

  async createFirewallRule(zoneId = CF_ZONE_ID, { expression, action, description, priority }) {
    // First create a filter
    const filter = await cfRequest(`/zones/${zoneId}/filters`, 'POST', [{ expression }]);
    // Then create the rule
    return cfRequest(`/zones/${zoneId}/firewall/rules`, 'POST', [{
      filter: { id: filter[0].id },
      action,
      description,
      priority,
    }]);
  },

  // ── WAF ────────────────────────────────────────────────────────────────────
  async listWafRulesets(zoneId = CF_ZONE_ID) {
    return cfRequest(`/zones/${zoneId}/rulesets`);
  },

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  async listRateLimits(zoneId = CF_ZONE_ID) {
    return cfRequest(`/zones/${zoneId}/rate_limits`);
  },

  async createRateLimit(zoneId = CF_ZONE_ID, { url, requestsPerPeriod, period, action = 'simulate' }) {
    return cfRequest(`/zones/${zoneId}/rate_limits`, 'POST', {
      match: { request: { url_pattern: url } },
      threshold: requestsPerPeriod,
      period,
      action: { mode: action },
    });
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  async getAnalytics(zoneId = CF_ZONE_ID, { since, until } = {}) {
    const params = new URLSearchParams({
      since: since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      until: until || new Date().toISOString(),
    });
    return cfRequest(`/zones/${zoneId}/analytics/dashboard?${params}`);
  },

  // ── Workers ────────────────────────────────────────────────────────────────
  async listWorkers(accountId = CF_ACCOUNT_ID) {
    return cfRequest(`/accounts/${accountId}/workers/scripts`);
  },

  async deployWorker(accountId = CF_ACCOUNT_ID, scriptName, scriptContent) {
    const response = await fetch(`${BASE_URL}/accounts/${accountId}/workers/scripts/${scriptName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/javascript',
      },
      body: scriptContent,
    });
    const data = await response.json();
    if (!data.success) throw new Error(`Worker deploy error: ${JSON.stringify(data.errors)}`);
    return data.result;
  },

  // ── KV Storage ────────────────────────────────────────────────────────────
  async listKvNamespaces(accountId = CF_ACCOUNT_ID) {
    return cfRequest(`/accounts/${accountId}/storage/kv/namespaces`);
  },

  async kvGet(accountId = CF_ACCOUNT_ID, namespaceId, key) {
    const response = await fetch(`${BASE_URL}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`, {
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
    });
    if (!response.ok) throw new Error(`KV get error: ${response.status}`);
    return response.text();
  },

  async kvPut(accountId = CF_ACCOUNT_ID, namespaceId, key, value, { expirationTtl } = {}) {
    const params = expirationTtl ? `?expiration_ttl=${expirationTtl}` : '';
    const response = await fetch(`${BASE_URL}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}${params}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'text/plain' },
      body: typeof value === 'string' ? value : JSON.stringify(value),
    });
    const data = await response.json();
    if (!data.success) throw new Error(`KV put error: ${JSON.stringify(data.errors)}`);
    return data.result;
  },

  isConfigured: () => !!(CF_API_TOKEN && CF_ZONE_ID),
};

export default cloudflare;
