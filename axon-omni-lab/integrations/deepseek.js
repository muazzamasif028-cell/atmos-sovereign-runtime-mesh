/**
 * DeepSeek Integration
 * Chat completions and reasoning via DeepSeek's OpenAI-compatible API
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = 'https://api.deepseek.com/v1';

const MODELS = {
  CHAT:     'deepseek-chat',      // General purpose, fast
  CODER:    'deepseek-coder',     // Code generation & analysis
  REASONER: 'deepseek-reasoner',  // Deep reasoning (R1)
};

async function deepseekRequest(path, body) {
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY not configured');

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`DeepSeek error (${response.status}): ${data.error?.message || JSON.stringify(data)}`);
  return data;
}

export const deepseek = {
  MODELS,

  // ── Chat ───────────────────────────────────────────────────────────────────
  async chat({ messages, model = MODELS.CHAT, temperature = 0.7, maxTokens = 2048, systemPrompt }) {
    const allMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const data = await deepseekRequest('/chat/completions', {
      model,
      messages: allMessages,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      finishReason: data.choices[0].finish_reason,
    };
  },

  // ── Code Generation ────────────────────────────────────────────────────────
  async generateCode({ prompt, language, context, model = MODELS.CODER }) {
    const systemPrompt = `You are an expert ${language || 'software'} developer. 
Generate clean, well-commented, production-ready code. 
Follow best practices and include error handling.`;

    const messages = [
      ...(context ? [{ role: 'user', content: `Context: ${context}` }] : []),
      { role: 'user', content: prompt },
    ];

    return deepseek.chat({ messages, model, systemPrompt, temperature: 0.2 });
  },

  // ── Code Review ────────────────────────────────────────────────────────────
  async reviewCode({ code, language, focus = 'all' }) {
    const focusMap = {
      all:       'Review for bugs, security issues, performance, and code quality.',
      security:  'Focus on security vulnerabilities and attack vectors.',
      performance: 'Focus on performance bottlenecks and optimization opportunities.',
      quality:   'Focus on code quality, readability, and maintainability.',
    };

    const systemPrompt = `You are a senior code reviewer. ${focusMap[focus] || focusMap.all}
Provide specific, actionable feedback with line references where possible.`;

    return deepseek.chat({
      messages: [{ role: 'user', content: `Review this ${language || ''} code:\n\n\`\`\`\n${code}\n\`\`\`` }],
      model: MODELS.CODER,
      systemPrompt,
      temperature: 0.3,
    });
  },

  // ── Deep Reasoning ─────────────────────────────────────────────────────────
  async reason({ problem, context, steps = true }) {
    const systemPrompt = `You are a deep reasoning engine. 
${steps ? 'Think step by step, showing your reasoning process.' : ''}
Analyze the problem thoroughly and provide a well-justified conclusion.`;

    const messages = [
      ...(context ? [{ role: 'user', content: `Background context: ${context}` }] : []),
      { role: 'user', content: problem },
    ];

    return deepseek.chat({
      messages,
      model: MODELS.REASONER,
      systemPrompt,
      temperature: 0.1,
      maxTokens: 4096,
    });
  },

  // ── Summarize ─────────────────────────────────────────────────────────────
  async summarize({ content, style = 'concise', maxWords = 150 }) {
    const styleMap = {
      concise:   `Summarize in ${maxWords} words or less.`,
      detailed:  'Provide a comprehensive summary covering all key points.',
      bullets:   'Summarize as a bulleted list of key points.',
      executive: 'Write a brief executive summary for leadership.',
    };

    return deepseek.chat({
      messages: [{ role: 'user', content }],
      systemPrompt: `You are a summarization expert. ${styleMap[style] || styleMap.concise}`,
      temperature: 0.3,
      maxTokens: 512,
    });
  },

  isConfigured: () => !!DEEPSEEK_API_KEY,
};

export default deepseek;
