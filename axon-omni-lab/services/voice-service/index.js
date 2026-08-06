/**
 * VOICE SERVICE — Element 6: Natural
 * Body Part: Voice / Speech
 * Role: Natural language processing, speech-to-text, text-to-speech
 *
 * The voice is how the organism communicates with the world.
 * It understands spoken and written language, extracts meaning,
 * and can speak back in natural human terms.
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;
const SERVICE_NAME = 'voice-service';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ─── Intent Patterns ──────────────────────────────────────────────────────────
const INTENT_PATTERNS = [
  { intent: 'create_workflow',   patterns: [/create.*workflow/i, /set up.*automation/i, /automate/i] },
  { intent: 'query_data',        patterns: [/show me/i, /what is/i, /how many/i, /list/i, /find/i] },
  { intent: 'send_message',      patterns: [/send.*message/i, /email/i, /slack/i, /notify/i] },
  { intent: 'process_payment',   patterns: [/charge/i, /payment/i, /invoice/i, /stripe/i] },
  { intent: 'search_knowledge',  patterns: [/search/i, /look up/i, /find.*information/i] },
  { intent: 'get_status',        patterns: [/status/i, /health/i, /how is/i, /running/i] },
  { intent: 'schedule_task',     patterns: [/schedule/i, /remind/i, /at \d/i, /every/i] },
  { intent: 'analyze',           patterns: [/analyze/i, /summarize/i, /explain/i, /understand/i] },
  { intent: 'greeting',          patterns: [/^(hi|hello|hey|good morning|good evening)/i] },
  { intent: 'farewell',          patterns: [/^(bye|goodbye|see you|later|thanks)/i] },
];

// ─── Entity Extractors ────────────────────────────────────────────────────────
function extractEntities(text) {
  const entities = {};

  // Email addresses
  const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emails) entities.emails = emails;

  // URLs
  const urls = text.match(/https?:\/\/[^\s]+/g);
  if (urls) entities.urls = urls;

  // Numbers / amounts
  const amounts = text.match(/\$[\d,]+(\.\d{2})?|\d+(\.\d+)?\s*(dollars?|USD|EUR|GBP)/gi);
  if (amounts) entities.amounts = amounts;

  // Dates / times
  const dates = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},? \d{4}|today|tomorrow|yesterday|next \w+)\b/gi);
  if (dates) entities.dates = dates;

  // Named services
  const services = ['stripe', 'slack', 'gmail', 'github', 'zapier', 'pinecone', 'openai', 'deepseek'];
  const mentionedServices = services.filter(s => new RegExp(s, 'i').test(text));
  if (mentionedServices.length) entities.services = mentionedServices;

  return entities;
}

// ─── Intent Classifier ────────────────────────────────────────────────────────
function classifyIntent(text) {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(text))) {
      return intent;
    }
  }
  return 'unknown';
}

// ─── Sentiment Analyzer ───────────────────────────────────────────────────────
function analyzeSentiment(text) {
  const positive = (text.match(/\b(great|good|excellent|love|perfect|amazing|wonderful|fantastic|happy|pleased|thank)\b/gi) || []).length;
  const negative = (text.match(/\b(bad|terrible|hate|awful|wrong|broken|error|fail|problem|issue|bug|crash)\b/gi) || []).length;
  const urgent   = (text.match(/\b(urgent|asap|immediately|now|critical|emergency|important)\b/gi) || []).length;

  if (urgent > 0)          return { label: 'urgent',   score: 0.9 };
  if (positive > negative) return { label: 'positive', score: Math.min(0.5 + positive * 0.1, 1.0) };
  if (negative > positive) return { label: 'negative', score: Math.min(0.5 + negative * 0.1, 1.0) };
  return { label: 'neutral', score: 0.5 };
}

// ─── Language Detector ────────────────────────────────────────────────────────
function detectLanguage(text) {
  // Simple heuristic — production would use a proper library
  const patterns = {
    es: /\b(el|la|los|las|un|una|que|de|en|y|es|por|con|para)\b/gi,
    fr: /\b(le|la|les|un|une|des|que|de|en|et|est|pour|avec)\b/gi,
    de: /\b(der|die|das|ein|eine|und|ist|für|mit|von|zu|im)\b/gi,
    pt: /\b(o|a|os|as|um|uma|que|de|em|e|é|por|com|para)\b/gi,
    ar: /[\u0600-\u06FF]/,
    zh: /[\u4E00-\u9FFF]/,
    ja: /[\u3040-\u309F\u30A0-\u30FF]/,
  };

  for (const [lang, pattern] of Object.entries(patterns)) {
    const matches = (text.match(pattern) || []).length;
    if (matches > 3) return lang;
  }
  return 'en';
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    element: 'Natural',
    bodyPart: 'Voice',
    status: 'healthy',
    capabilities: ['intent-classification', 'entity-extraction', 'sentiment-analysis', 'language-detection', 'speech-to-text', 'text-to-speech'],
    sttConfigured: !!OPENAI_API_KEY,
    ttsConfigured: !!OPENAI_API_KEY,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Full NLP analysis
app.post('/analyze', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const intent    = classifyIntent(text);
  const entities  = extractEntities(text);
  const sentiment = analyzeSentiment(text);
  const language  = detectLanguage(text);
  const wordCount = text.trim().split(/\s+/).length;

  res.json({
    text,
    intent,
    entities,
    sentiment,
    language,
    wordCount,
    timestamp: new Date().toISOString(),
  });
});

// Intent classification only
app.post('/intent', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  res.json({ intent: classifyIntent(text), text, timestamp: new Date().toISOString() });
});

// Entity extraction only
app.post('/entities', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  res.json({ entities: extractEntities(text), text, timestamp: new Date().toISOString() });
});

// Sentiment analysis only
app.post('/sentiment', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  res.json({ sentiment: analyzeSentiment(text), text, timestamp: new Date().toISOString() });
});

// Speech-to-text (Whisper via OpenAI)
app.post('/transcribe', async (req, res) => {
  // In production: accept multipart/form-data with audio file
  // and forward to OpenAI Whisper API
  if (!OPENAI_API_KEY) {
    return res.json({
      transcript: '[Mock transcript — configure OPENAI_API_KEY for real speech-to-text]',
      language: 'en',
      duration: 0,
      mock: true,
    });
  }
  res.json({
    message: 'Send audio as multipart/form-data with field "audio" (mp3, wav, m4a)',
    endpoint: 'POST /transcribe',
    model: 'whisper-1',
  });
});

// Text-to-speech
app.post('/speak', async (req, res) => {
  const { text, voice = 'alloy', speed = 1.0 } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  if (!OPENAI_API_KEY) {
    return res.json({
      message: 'TTS mock — configure OPENAI_API_KEY for real text-to-speech',
      text,
      voice,
      speed,
      mock: true,
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'tts-1', input: text, voice, speed }),
    });

    if (!response.ok) throw new Error(`TTS API error: ${response.status}`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="speech.mp3"');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Parse a natural language command into structured action
app.post('/parse-command', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const intent   = classifyIntent(text);
  const entities = extractEntities(text);

  const actionMap = {
    create_workflow:  { service: 'reflexes-service', action: 'create_workflow' },
    query_data:       { service: 'dna-service',      action: 'query' },
    send_message:     { service: 'hands-service',    action: 'send_message' },
    process_payment:  { service: 'hands-service',    action: 'charge' },
    search_knowledge: { service: 'wisdom-service',   action: 'search' },
    get_status:       { service: 'skeleton-service', action: 'health_check' },
    schedule_task:    { service: 'reflexes-service', action: 'schedule' },
    analyze:          { service: 'brain-service',    action: 'analyze' },
  };

  res.json({
    originalText: text,
    intent,
    entities,
    suggestedAction: actionMap[intent] || { service: 'brain-service', action: 'chat' },
    confidence: intent !== 'unknown' ? 0.85 : 0.3,
    timestamp: new Date().toISOString(),
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[VOICE] Natural language service running on port ${PORT}`);
});
