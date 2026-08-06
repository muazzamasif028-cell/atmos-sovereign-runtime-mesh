/**
 * Pinecone Integration
 * Vector database for semantic search and RAG
 */

const PINECONE_API_KEY   = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_URL = process.env.PINECONE_INDEX_URL; // e.g. https://my-index-xxx.svc.pinecone.io
const PINECONE_ENV       = process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws';

async function pineconeRequest(path, method = 'GET', body = null, baseUrl = null) {
  if (!PINECONE_API_KEY) throw new Error('PINECONE_API_KEY not configured');

  const url = (baseUrl || PINECONE_INDEX_URL) + path;
  if (!url) throw new Error('PINECONE_INDEX_URL not configured');

  const response = await fetch(url, {
    method,
    headers: {
      'Api-Key': PINECONE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Pinecone error (${response.status}): ${JSON.stringify(data)}`);
  return data;
}

export const pinecone = {
  // ── Vectors ────────────────────────────────────────────────────────────────
  async upsert({ vectors, namespace = '' }) {
    // vectors: [{ id, values, metadata }]
    return pineconeRequest('/vectors/upsert', 'POST', { vectors, namespace });
  },

  async query({ vector, topK = 10, namespace = '', filter, includeMetadata = true, includeValues = false }) {
    return pineconeRequest('/query', 'POST', {
      vector,
      topK,
      namespace,
      filter,
      includeMetadata,
      includeValues,
    });
  },

  async fetch({ ids, namespace = '' }) {
    const params = new URLSearchParams({ namespace });
    ids.forEach(id => params.append('ids', id));
    return pineconeRequest(`/vectors/fetch?${params}`);
  },

  async delete({ ids, namespace = '', deleteAll = false, filter }) {
    return pineconeRequest('/vectors/delete', 'POST', {
      ids,
      namespace,
      deleteAll,
      filter,
    });
  },

  // ── Index Stats ────────────────────────────────────────────────────────────
  async describeIndexStats() {
    return pineconeRequest('/describe_index_stats', 'POST', {});
  },

  // ── Index Management (Control Plane) ──────────────────────────────────────
  async listIndexes() {
    return pineconeRequest('/indexes', 'GET', null, `https://api.pinecone.io`);
  },

  async createIndex({ name, dimension, metric = 'cosine', pods = 1, podType = 'p1.x1' }) {
    return pineconeRequest('/indexes', 'POST', { name, dimension, metric, pods, pod_type: podType }, 'https://api.pinecone.io');
  },

  async describeIndex(indexName) {
    return pineconeRequest(`/indexes/${indexName}`, 'GET', null, 'https://api.pinecone.io');
  },

  async deleteIndex(indexName) {
    return pineconeRequest(`/indexes/${indexName}`, 'DELETE', null, 'https://api.pinecone.io');
  },

  // ── Convenience: Semantic Search ──────────────────────────────────────────
  async semanticSearch({ queryVector, topK = 5, namespace = '', minScore = 0.7 }) {
    const result = await pinecone.query({ vector: queryVector, topK, namespace, includeMetadata: true });
    return (result.matches || []).filter(m => m.score >= minScore);
  },

  isConfigured: () => !!(PINECONE_API_KEY && PINECONE_INDEX_URL),
};

export default pinecone;
