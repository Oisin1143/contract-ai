// Vercel Serverless Function — POST /api/negotiate
// Given a problematic contract clause + context, returns three
// redline counter-proposals (aggressive / balanced / accommodating)
// plus a ready-to-send negotiation email for each.

import { isRateLimited } from "./_lib/rateLimit.js";
import { friendlyLLMError } from "./_lib/llmErrors.js";
import { callLLM } from "./_lib/llm.js";

function buildPrompt({ clause, issue, explanation, mode, contractType }) {
  const perspective =
    mode === "ma"
      ? "an acquirer in an M&A transaction conducting due diligence"
      : "a party preparing to enter into this contract";

  return `You are a senior UK commercial contracts solicitor advising ${perspective}. The user has identified a problematic clause in a ${contractType || "commercial"} contract and wants to negotiate it.

ORIGINAL CLAUSE (from the contract):
"""
${clause}
"""

THE PROBLEM WITH IT:
Issue: ${issue}
Why it matters: ${explanation}

YOUR TASK:
Produce THREE redline alternatives the user can propose to the counterparty. Each represents a different negotiation posture:

1. AGGRESSIVE — Maximum protection for our client. The counterparty may reject this; that is acceptable as an opening position.
2. BALANCED — A middle-ground rewrite that addresses the risk fairly. Most likely to be accepted in commercial negotiation.
3. ACCOMMODATING — A small but meaningful improvement. High likelihood of acceptance with minimal pushback. Use when relationship preservation matters.

For EACH posture, provide:
- "rewrite": The exact replacement clause text — drafted as a UK commercial lawyer would. Use clear plain English where possible. No square-bracket placeholders — write real, deployable language.
- "rationale": ONE sentence explaining what this rewrite achieves and why it's defensible.
- "email": A short, professional email to the counterparty's commercial / legal contact proposing this redline. 80–140 words. Polite but firm. Reference the clause specifically. End with a clear ask.

CRITICAL OUTPUT RULES:
- Respond with STRICT JSON ONLY. No markdown code fences, no commentary.
- All text in proper UK English (organisation, favour, programme).
- Drafting must be commercially realistic — avoid US legalese ("hereinafter", "WHEREAS").

JSON SCHEMA (return exactly this structure):

{
  "aggressive": {
    "rewrite": "...",
    "rationale": "...",
    "email": "..."
  },
  "balanced": {
    "rewrite": "...",
    "rationale": "...",
    "email": "..."
  },
  "accommodating": {
    "rewrite": "...",
    "rationale": "...",
    "email": "..."
  }
}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  if (isRateLimited(req, res, { routeName: "negotiate", max: 15 })) return;

  const { clause, issue, explanation, mode, contractType } = req.body || {};

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

  try {
    const { content: raw } = await callLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a senior UK commercial contracts solicitor producing deployable redline language and negotiation correspondence. You return only valid JSON, never prose. All drafting is in UK English and commercially realistic.",
        },
        {
          role: "user",
          content: buildPrompt({ clause, issue, explanation, mode, contractType }),
        },
      ],
      maxTokens: 3500,
      temperature: 0.4,
      jsonMode: true,
      routeName: "negotiate",
    });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse model response as JSON.");
      parsed = JSON.parse(match[0]);
    }

    // Sanity-check shape
    for (const key of ["aggressive", "balanced", "accommodating"]) {
      if (!parsed[key] || !parsed[key].rewrite) {
        throw new Error(`Model response missing ${key} variant.`);
      }
      // Ensure all fields exist
      parsed[key].rewrite = parsed[key].rewrite || "";
      parsed[key].rationale = parsed[key].rationale || "";
      parsed[key].email = parsed[key].email || "";
    }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error("Negotiate error:", e.message);
    return res.status(500).json({ error: friendlyLLMError(e.message) });
  }
}