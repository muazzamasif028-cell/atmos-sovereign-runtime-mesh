/**
 * WISDOM SERVICE — Element 7: Knowledge
 * Body Part: Wisdom
 * Role: Vector database & knowledge retrieval (Pinecone / Weaviate)
 *
 * Wisdom is accumulated knowledge — the ability to find the right
 * information at the right time. It powers RAG (Retrieval-Augmented
 * Generation) so the brain can answer with grounded facts.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3005;
const SERVICE_NAME = 'wisdom-service';

const PINECONE_API_KEY   = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_URL = process.env.PINECONE_INDEX_URL; // e.g. https://my-index-xxx.svc.pinecone.io
const OPENAI_API_KEY     = process.env.OPENAI_API_KEY;

// ─── In-memory vector store (Pinecone in production) ─────────────────────────
const vectorStore = [];

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

// Mock embedding (in production: call OpenAI text-embedding-3-small)
function mockEmbed(text) {
  // Deterministic pseudo-embedding based on character codes
  const seed = text.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Array.from({ length: 128 }, (_, i) => Math.sin(seed * (i + 1) * 0.01));
}

async function getEmbedding(text) {
  if (!OPENAI_API_KEY) return mockEmbed(text);

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });

  if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);
  const data = await response.json();
  return data.data[0].embedding;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Knowledge',
    bodyPart: 'Wisdom',
    status: 'healthy',
    vectorCount: vectorStore.length,
    pineconeConfigured: !!(PINECONE_API_KEY && PINECONE_INDEX_URL),
    embeddingModel: OPENAI_API_KEY ? 'text-embedding-3-small' : 'mock-128d',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Upsert a document into the knowledge base
app.post('/upsert', async (req, res) => {
  const { id, content, metadata = {}, namespace = 'default' } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  try {
    const vector = await getEmbedding(content);
    const docId  = id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Remove existing doc with same id
    const existingIdx = vectorStore.findIndex(d => d.id === docId);
    if (existingIdx !== -1) vectorStore.splice(existingIdx, 1);

    vectorStore.push({ id: docId, content, vector, metadata, namespace, createdAt: new Date().toISOString() });

    res.status(201).json({
      id: docId,
      dimensions: vector.length,
      namespace,
      mock: !OPENAI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch upsert
app.post('/upsert/batch', async (req, res) => {
  const { documents, namespace = 'default' } = req.body;
  if (!Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: 'documents array is required' });
  }

  const results = [];
  for (const doc of documents) {
    try {
      const vector = await getEmbedding(doc.content);
      const docId  = doc.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      vectorStore.push({ id: docId, content: doc.content, vector, metadata: doc.metadata || {}, namespace, createdAt: new Date().toISOString() });
      results.push({ id: docId, success: true });
    } catch (err) {
      results.push({ id: doc.id, success: false, error: err.message });
    }
  }

  res.json({ results, total: results.length, successful: results.filter(r => r.success).length });
});

// Semantic search
app.post('/search', async (req, res) => {
  const { query, topK = 5, namespace = 'default', minScore = 0.5, filter = {} } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  try {
    const queryVector = await getEmbedding(query);

    let candidates = vectorStore.filter(d => d.namespace === namespace);

    // Apply metadata filters
    if (Object.keys(filter).length > 0) {
      candidates = candidates.filter(d =>
        Object.entries(filter).every(([k, v]) => d.metadata[k] === v)
      );
    }

    const scored = candidates
      .map(doc => ({ ...doc, score: cosineSimilarity(queryVector, doc.vector) }))
      .filter(doc => doc.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ vector: _v, ...rest }) => rest); // strip raw vector from response

    res.json({
      query,
      results: scored,
      total: scored.length,
      namespace,
      mock: !OPENAI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RAG — retrieve context then format for AI
app.post('/rag', async (req, res) => {
  const { query, topK = 3, namespace = 'default' } = req.body;
  if (!query) return res.status(400).json({ error: 'query is required' });

  try {
    const queryVector = await getEmbedding(query);
    const results = vectorStore
      .filter(d => d.namespace === namespace)
      .map(doc => ({ ...doc, score: cosineSimilarity(queryVector, doc.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const context = results.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n');
    const systemPrompt = `You have access to the following relevant knowledge:\n\n${context}\n\nUse this information to answer the user's question accurately. If the knowledge doesn't contain the answer, say so.`;

    res.json({
      query,
      retrievedDocuments: results.map(({ vector: _v, ...r }) => r),
      systemPrompt,
      contextLength: context.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a document
app.delete('/documents/:id', (req, res) => {
  const idx = vectorStore.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Document not found' });
  vectorStore.splice(idx, 1);
  res.json({ deleted: true, id: req.params.id });
});

// List documents
app.get('/documents', (req, res) => {
  const { namespace, limit = 20 } = req.query;
  let docs = namespace ? vectorStore.filter(d => d.namespace === namespace) : vectorStore;
  res.json({
    documents: docs.slice(0, parseInt(limit)).map(({ vector: _v, ...d }) => d),
    total: docs.length,
  });
});

// Stats
app.get('/stats', (req, res) => {
  const namespaces = [...new Set(vectorStore.map(d => d.namespace))];
  res.json({
    totalDocuments: vectorStore.length,
    namespaces: namespaces.map(ns => ({
      name: ns,
      count: vectorStore.filter(d => d.namespace === ns).length,
    })),
    embeddingDimensions: vectorStore[0]?.vector?.length || 128,
    timestamp: new Date().toISOString(),
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WISDOM] Vector knowledge service running on port ${PORT}`);
  console.log(`[WISDOM] Pinecone: ${PINECONE_API_KEY ? 'configured' : 'using in-memory store'}`);
});
