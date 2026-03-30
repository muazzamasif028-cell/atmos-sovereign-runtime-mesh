/**
 * OpenAI Integration
 * Chat completions, embeddings, speech, and image generation
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = 'https://api.openai.com/v1';

async function openaiRequest(path, method = 'POST', body = null, isStream = false) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (isStream) return response; // Return raw response for streaming

  const data = await response.json();
  if (!response.ok) throw new Error(`OpenAI error (${response.status}): ${data.error?.message}`);
  return data;
}

export const openai = {
  // ── Chat Completions ───────────────────────────────────────────────────────
  async chat({ messages, model = 'gpt-4o', temperature = 0.7, maxTokens = 1024, systemPrompt, tools, toolChoice }) {
    const allMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    return openaiRequest('/chat/completions', 'POST', {
      model,
      messages: allMessages,
      temperature,
      max_tokens: maxTokens,
      ...(tools && { tools }),
      ...(toolChoice && { tool_choice: toolChoice }),
    });
  },

  // ── Streaming Chat ─────────────────────────────────────────────────────────
  async streamChat({ messages, model = 'gpt-4o', temperature = 0.7, onChunk }) {
    const response = await openaiRequest('/chat/completions', 'POST', {
      model,
      messages,
      temperature,
      stream: true,
    }, true);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content || '';
          fullContent += content;
          if (onChunk) onChunk(content, fullContent);
        } catch {}
      }
    }

    return fullContent;
  },

  // ── Embeddings ─────────────────────────────────────────────────────────────
  async embed(input, model = 'text-embedding-3-small') {
    const data = await openaiRequest('/embeddings', 'POST', {
      model,
      input: Array.isArray(input) ? input : [input],
    });
    return Array.isArray(input) ? data.data.map(d => d.embedding) : data.data[0].embedding;
  },

  // ── Speech to Text ─────────────────────────────────────────────────────────
  async transcribe(audioBuffer, { language, prompt } = {}) {
    // Requires FormData with audio file — use in Node.js with form-data package
    throw new Error('Use multipart/form-data to send audio to /v1/audio/transcriptions');
  },

  // ── Text to Speech ─────────────────────────────────────────────────────────
  async speak({ text, voice = 'alloy', model = 'tts-1', speed = 1.0 }) {
    const response = await openaiRequest('/audio/speech', 'POST', {
      model, input: text, voice, speed,
    }, true);
    return response.arrayBuffer();
  },

  // ── Image Generation ───────────────────────────────────────────────────────
  async generateImage({ prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard', n = 1 }) {
    return openaiRequest('/images/generations', 'POST', { prompt, model, size, quality, n });
  },

  // ── Moderation ─────────────────────────────────────────────────────────────
  async moderate(input) {
    return openaiRequest('/moderations', 'POST', { input });
  },

  // ── Models ─────────────────────────────────────────────────────────────────
  async listModels() {
    return openaiRequest('/models', 'GET');
  },

  isConfigured: () => !!OPENAI_API_KEY,
};

export default openai;
