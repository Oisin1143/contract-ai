// Vercel Serverless Function — POST /api/negotiate-chat
// Powers an interactive negotiation simulator: the LLM roleplays opposing
// counsel reacting to a flagged clause, and pushes back realistically as
// the user negotiates across a few turns. Stateless — the full message
// history is passed in on every call, same pattern as the rest of the app.

import { isRateLimited } from "./_lib/rateLimit.js";
import { friendlyLLMError } from "./_lib/llmErrors.js";
import { callLLM } from "./_lib/llm.js";

function buildSystemPrompt({ clause, issue, explanation, mode, contractType }) {
  const perspective =
    mode === "ma"
      ? "the counterparty in an M&A transaction, defending your client's position as the target/seller side"
      : "the counterparty to this contract, defending your client's position";

  return `You are a senior UK commercial solicitor roleplaying as OPPOSING COUNSEL — ${perspective}. You are negotiating over ONE specific clause in a ${contractType || "commercial"} contract with the user, who represents the other party.

THE CLAUSE UNDER NEGOTIATION:
"""
${clause}
"""

THE USER'S CONCERN WITH IT:
Issue: ${issue}
Why it matters to them: ${explanation}

YOUR ROLE:
- Stay firmly in character as opposing counsel throughout. Never break character, never mention you are an AI, never add meta-commentary.
- Defend your client's position on this clause realistically, but negotiate like a real solicitor would across several exchanges — you can concede ground incrementally if the user makes good points or offers reasonable trade-offs, but don't cave immediately.
- Keep each reply concise: 2-4 sentences, professional but firm, UK English (organisation, favour, programme).
- If the user proposes specific redline language, react to it specifically — accept, counter-propose, or push back with a reason.
- If several exchanges have gone by and a reasonable middle ground has been reached, you may signal willingness to settle on it.

Respond with ONLY your in-character reply as opposing counsel. No labels, no quotation marks around the whole reply, no stage directions.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  if (isRateLimited(req, res, { routeName: "negotiate-chat", max: 30 })) return;

  const { clause, issue, explanation, mode, contractType, messages } = req.body || {};

  if (!clause || typeof clause !== "string" || clause.length < 10) {
    return res.status(400).json({ error: "clause is required." });
  }
  if (!issue || !explanation) {
    return res.status(400).json({ error: "issue and explanation are required." });
  }
  if (mode && !["presigning", "ma"].includes(mode)) {
    return res.status(400).json({ error: 'mode must be "presigning" or "ma".' });
  }
  if (clause.length > 4000) {
    return res.status(400).json({ error: "Clause too long (max 4,000 chars)." });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array." });
  }
  if (messages.length > 30) {
    return res.status(400).json({ error: "Conversation too long (max 30 messages)." });
  }
  for (const m of messages) {
    if (!m || typeof m.content !== "string" || !["user", "counsel"].includes(m.role)) {
      return res.status(400).json({ error: "Each message needs role ('user'|'counsel') and string content." });
    }
    if (m.content.length > 2000) {
      return res.status(400).json({ error: "A message is too long (max 2,000 chars)." });
    }
  }

  // "counsel" (opposing counsel, the AI) maps to assistant; "user" stays user.
  const chatMessages = [
    { role: "system", content: buildSystemPrompt({ clause, issue, explanation, mode, contractType }) },
    ...messages.map((m) => ({
      role: m.role === "counsel" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  try {
    const { content } = await callLLM({
      messages: chatMessages,
      maxTokens: 400,
      temperature: 0.6,
      routeName: "negotiate-chat",
    });
    const reply = content.trim();
    if (!reply) throw new Error("Empty response from model.");

    return res.status(200).json({ reply });
  } catch (e) {
    console.error("Negotiate-chat error:", e.message);
    return res.status(500).json({ error: friendlyLLMError(e.message) });
  }
}
