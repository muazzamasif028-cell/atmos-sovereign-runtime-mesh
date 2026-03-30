/**
 * BRAIN SERVICE — Element 4: Intelligence
 * Body Part: Brain
 * Role: AI inference engine — DeepSeek / GPT-4o
 *
 * The brain processes information, reasons about it, and produces
 * intelligent responses. It is the cognitive core of the organism.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SERVICE_NAME = 'brain-service';

const OPENAI_API_KEY  = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// ─── Model Registry ───────────────────────────────────────────────────────────
const MODELS = {
  'gpt-4o':           { provider: 'openai',   maxTokens: 128000, costPer1k: 0.005 },
  'gpt-4o-mini':      { provider: 'openai',   maxTokens: 128000, costPer1k: 0.00015 },
  'deepseek-chat':    { provider: 'deepseek', maxTokens: 32768,  costPer1k: 0.00014 },
  'deepseek-coder':   { provider: 'deepseek', maxTokens: 16384,  costPer1k: 0.00014 },
  'deepseek-reasoner':{ provider: 'deepseek', maxTokens: 65536,  costPer1k: 0.00055 },
};

const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'deepseek-chat';

// ─── Inference Stats ──────────────────────────────────────────────────────────
const stats = {
  totalRequests: 0,
  totalTokensIn: 0,
  totalTokensOut: 0,
  modelUsage: {},
  errors: 0,
};

// ─── Core Inference Function ──────────────────────────────────────────────────
async function callAI({ model, messages, temperature = 0.7, maxTokens = 1024, systemPrompt }) {
  const modelConfig = MODELS[model] || MODELS[DEFAULT_MODEL];
  const resolvedModel = MODELS[model] ? model : DEFAULT_MODEL;

  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  // OpenAI-compatible API call
  const baseUrl = modelConfig.provider === 'deepseek'
    ? 'https://api.deepseek.com/v1'
    : 'https://api.openai.com/v1';

  const apiKey = modelConfig.provider === 'deepseek' ? DEEPSEEK_API_KEY : OPENAI_API_KEY;

  if (!apiKey) {
    // Return a mock response when no API key is configured
    return {
      model: resolvedModel,
      provider: modelConfig.provider,
      message: {
        role: 'assistant',
        content: `[BRAIN — Mock Response] I received your message. In production, configure ${
          modelConfig.provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'OPENAI_API_KEY'
        } to enable real AI inference. Your input: "${messages[messages.length - 1]?.content}"`,
      },
      usage: { promptTokens: 50, completionTokens: 80, totalTokens: 130 },
      mock: true,
    };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages: allMessages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return {
    model: resolvedModel,
    provider: modelConfig.provider,
    message: data.choices[0].message,
    usage: {
      promptTokens:     data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens:      data.usage.total_tokens,
    },
    mock: false,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Intelligence',
    bodyPart: 'Brain',
    status: 'healthy',
    models: Object.keys(MODELS),
    defaultModel: DEFAULT_MODEL,
    openaiConfigured:   !!OPENAI_API_KEY,
    deepseekConfigured: !!DEEPSEEK_API_KEY,
    stats,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Main inference endpoint
app.post('/infer', async (req, res) => {
  const {
    messages,
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 1024,
    systemPrompt,
  } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  stats.totalRequests++;
  stats.modelUsage[model] = (stats.modelUsage[model] || 0) + 1;

  try {
    const result = await callAI({ model, messages, temperature, maxTokens, systemPrompt });
    stats.totalTokensIn  += result.usage.promptTokens;
    stats.totalTokensOut += result.usage.completionTokens;
    res.json({ ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    stats.errors++;
    console.error(`[BRAIN] Inference error:`, err.message);
    res.status(500).json({ error: err.message, timestamp: new Date().toISOString() });
  }
});

// Simple chat (single message shorthand)
app.post('/chat', async (req, res) => {
  const { message, model, systemPrompt, context = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const messages = [...context, { role: 'user', content: message }];
  stats.totalRequests++;

  try {
    const result = await callAI({ model: model || DEFAULT_MODEL, messages, systemPrompt });
    res.json({
      reply: result.message.content,
      model: result.model,
      usage: result.usage,
      mock: result.mock,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

// Reasoning / analysis endpoint
app.post('/reason', async (req, res) => {
  const { problem, context, model = 'deepseek-reasoner' } = req.body;
  if (!problem) return res.status(400).json({ error: 'problem is required' });

  const systemPrompt = `You are an expert reasoning engine. Analyze the given problem step by step, 
consider all angles, and provide a well-structured, logical conclusion. 
Be precise, thorough, and actionable.`;

  const messages = [
    ...(context ? [{ role: 'user', content: `Context: ${context}` }] : []),
    { role: 'user', content: `Problem to reason about: ${problem}` },
  ];

  try {
    const result = await callAI({ model, messages, systemPrompt, temperature: 0.3, maxTokens: 2048 });
    res.json({
      reasoning: result.message.content,
      model: result.model,
      usage: result.usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Summarize content
app.post('/summarize', async (req, res) => {
  const { content, style = 'concise', model } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  const stylePrompts = {
    concise:    'Summarize in 2-3 sentences.',
    detailed:   'Provide a detailed summary with key points.',
    bullets:    'Summarize as bullet points.',
    executive:  'Write an executive summary suitable for leadership.',
  };

  const systemPrompt = `You are a summarization expert. ${stylePrompts[style] || stylePrompts.concise}`;

  try {
    const result = await callAI({
      model: model || DEFAULT_MODEL,
      messages: [{ role: 'user', content }],
      systemPrompt,
      temperature: 0.3,
      maxTokens: 512,
    });
    res.json({ summary: result.message.content, style, model: result.model, usage: result.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Available models
app.get('/models', (req, res) => {
  res.json({ models: MODELS, default: DEFAULT_MODEL });
});

// Inference stats
app.get('/stats', (req, res) => {
  res.json({ stats, timestamp: new Date().toISOString() });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BRAIN] AI inference service running on port ${PORT}`);
  console.log(`[BRAIN] Default model: ${DEFAULT_MODEL}`);
  console.log(`[BRAIN] OpenAI: ${OPENAI_API_KEY ? 'configured' : 'not configured'}`);
  console.log(`[BRAIN] DeepSeek: ${DEEPSEEK_API_KEY ? 'configured' : 'not configured'}`);
});
