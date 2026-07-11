// Vercel Serverless Function — POST /api/redline-summary
// Takes the compact list of changed segments already computed client-side
// by a real diff algorithm (src/diffContracts.js) and explains the
// legal/commercial significance of each substantive change. Deliberately
// does NOT receive the two full contract texts — the LLM is only used for
// the judgement layer a diff algorithm can't provide, not for finding the
// changes themselves (LLMs are unreliable at exact text comparison).

import { isRateLimited } from "./_lib/rateLimit.js";

function buildPrompt(segments) {
  const list = segments
    .map(
      (s, i) =>
        `${i + 1}. Context: "...${s.context}..."\n   Before: ${s.before ? `"${s.before}"` : "(nothing — this is new text)"}\n   After: ${s.after ? `"${s.after}"` : "(nothing — this was deleted)"}`
    )
    .join("\n\n");

  return `You are a senior UK commercial solicitor reviewing changes between two versions of a contract. Below is a list of exact textual changes already identified by a diff tool (not by you) — each with a little surrounding context.

CHANGES:
${list}

YOUR TASK:
For each change that is legally or commercially SUBSTANTIVE (ignore pure formatting, typo fixes, or whitespace), explain what changed and why it matters. Skip changes that are trivial or immaterial — do not force an entry for every input change if it isn't substantive.

CRITICAL OUTPUT RULES:
- Respond with STRICT JSON ONLY. No markdown code fences, no commentary.
- "whatChanged" is a short factual one-sentence description of the change itself.
- "significance" is 1-2 sentences on the legal/commercial impact — who it favours and why, where relevant.
- If NO changes are substantive, return an empty "changes" array.

JSON SCHEMA (return exactly this structure):

{
  "changes": [
    {
      "whatChanged": "...",
      "significance": "..."
    }
  ]
}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  if (isRateLimited(req, res, { routeName: "redline-summary", max: 10 })) return;

  const { segments } = req.body || {};

  if (!Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: "segments must be a non-empty array." });
  }
  if (segments.length > 40) {
    return res.status(400).json({ error: "Too many segments (max 40)." });
  }
  for (const s of segments) {
    if (!s || typeof s !== "object") {
      return res.status(400).json({ error: "Each segment must be an object." });
    }
    const before = typeof s.before === "string" ? s.before : "";
    const after = typeof s.after === "string" ? s.after : "";
    const context = typeof s.context === "string" ? s.context : "";
    if (before.length > 500 || after.length > 500 || context.length > 500) {
      return res.status(400).json({ error: "A segment field is too long (max 500 chars each)." });
    }
  }

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({ error: "Server misconfiguration: missing API key." });
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a senior UK commercial solicitor explaining the significance of already-identified contract changes. You return only valid JSON, never prose. You only comment on changes given to you — you do not invent additional ones.",
          },
          { role: "user", content: buildPrompt(segments) },
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq error ${groqRes.status}`);
    }

    const groqData = await groqRes.json();
    const raw = groqData.choices?.[0]?.message?.content || "";
    if (!raw) throw new Error("Empty response from Groq.");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse model response as JSON.");
      parsed = JSON.parse(match[0]);
    }

    const changes = Array.isArray(parsed.changes)
      ? parsed.changes
          .filter((c) => c && c.whatChanged)
          .map((c) => ({
            whatChanged: c.whatChanged,
            significance: c.significance || "",
          }))
      : [];

    return res.status(200).json({ changes });
  } catch (e) {
    console.error("Redline-summary error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
