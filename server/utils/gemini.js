const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function isGeminiEnabled() {
  return Boolean(GEMINI_API_KEY);
}

function normalizeReply(text) {
  if (!text) return '';
  return text.replace(/```(?:json|txt)?/g, '').trim();
}

function parseGeminiJson(text) {
  if (!text) return null;
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGemini(prompt, options = {}) {
  if (!GEMINI_API_KEY) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxOutputTokens ?? 1024,
          },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

async function callGeminiChat(systemPrompt, messages = [], options = {}) {
  if (!GEMINI_API_KEY || !messages.length) return null;

  const contents = messages.map((message) => ({
    role: message.role === 'model' || message.role === 'assistant' || message.role === 'bot' ? 'model' : 'user',
    parts: [{ text: message.text }],
  }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxOutputTokens ?? 800,
          },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return normalizeReply(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
  } catch {
    return null;
  }
}

module.exports = {
  isGeminiEnabled,
  callGemini,
  callGeminiChat,
  parseGeminiJson,
  normalizeReply,
  GEMINI_MODEL,
};
