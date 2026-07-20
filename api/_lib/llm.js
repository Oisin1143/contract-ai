// api/_lib/llm.js
// Central LLM call used by every route: tries Groq first (fast, primary),
// and automatically fails over to OpenAI when Groq's rate limit is hit.
// Groq's free on_demand tier caps out at 100k tokens/day and 12k
// tokens/minute — both routinely hit under normal use — and self-serve
// upgrade to Groq's paid tier is currently closed to new signups. Both
// providers expose an OpenAI-compatible chat-completions shape, so the
// same request body works against either baseUrl and callers don't need
// to know which one actually answered.

const GROQ_MODEL = "llama-3.3-70b-versatile";
const OPENAI_MODEL = "gpt-4o-mini";

function isRateLimitError(message) {
  return /rate limit/i.test(String(message || ""));
}

async function callProvider({ baseUrl, apiKey, model, messages, maxTokens, temperature, jsonMode }) {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `${model} error ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("Empty response from model.");
  return content;
}

/**
 * @param {{ messages: Array<{role: string, content: string}>, maxTokens: number, temperature: number, jsonMode?: boolean, routeName?: string }} args
 * @returns {Promise<{ content: string, provider: "groq" | "openai" }>}
 */
export async function callLLM({ messages, maxTokens, temperature, jsonMode = false, routeName = "llm" }) {
  const GROQ_KEY = process.env.GROQ_KEY;
  const OPENAI_KEY = process.env.OPENAI_KEY;

  if (!GROQ_KEY && !OPENAI_KEY) {
    throw new Error("Server misconfiguration: missing API key.");
  }

  if (GROQ_KEY) {
    try {
      const content = await callProvider({
        baseUrl: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: GROQ_KEY,
        model: GROQ_MODEL,
        messages,
        maxTokens,
        temperature,
        jsonMode,
      });
      return { content, provider: "groq" };
    } catch (e) {
      if (!(isRateLimitError(e.message) && OPENAI_KEY)) throw e;
      console.warn(`[${routeName}] Groq rate-limited — falling back to OpenAI`);
    }
  }

  const content = await callProvider({
    baseUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: OPENAI_KEY,
    model: OPENAI_MODEL,
    messages,
    maxTokens,
    temperature,
    jsonMode,
  });
  return { content, provider: "openai" };
}
