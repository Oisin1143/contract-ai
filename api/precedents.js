// Vercel Serverless Function — POST /api/precedents
// Given the structured features the ML model (api/predict.py) already
// detected for this dispute, asks the LLM for UK cases with a genuinely
// similar FACT PATTERN — not just supporting legal arguments — and returns
// each as a clickable BAILII *search* link so the user can verify it
// themselves. We never fabricate a direct case URL: a hallucinated case
// name just lands the user on a real search, never a broken/misleading link.

import { buildBailiiSearchUrl } from "./_lib/bailii.js";
import { isRateLimited } from "./_lib/rateLimit.js";

function buildPrompt({ contractType, breachType, clausesDetected, damagesGbp, disputeDesc }) {
  const damagesLine =
    damagesGbp > 0
      ? `Damages claimed: approximately £${damagesGbp.toLocaleString()}.`
      : "No specific damages figure identified.";
  const clausesLine =
    clausesDetected && clausesDetected.length > 0
      ? `Notable clauses present: ${clausesDetected.join(", ")}.`
      : "No notable boilerplate clauses (force majeure, liquidated damages, etc.) identified.";

  return `You are a senior UK commercial litigator identifying PRECEDENT CASES with a similar FACT PATTERN to a dispute — not just cases that support one side's legal argument, but cases whose underlying facts genuinely resemble this situation.

DISPUTE PROFILE (detected automatically from the contract + dispute description):
- Contract type: ${contractType || "commercial"}
- Breach type: ${breachType || "other"}
- ${damagesLine}
- ${clausesLine}

DISPUTE DESCRIPTION:
"""
${disputeDesc}
"""

Identify 3-5 REAL, decided UK cases (England & Wales Court of Appeal, High Court, Supreme Court, or House of Lords) whose facts are genuinely comparable to this dispute profile — similar contract type, similar breach, similar commercial context. Do not invent cases. Only cite cases you have reasonable confidence actually exist and were decided in the UK.

CRITICAL OUTPUT RULES:
- Respond with STRICT JSON ONLY. No markdown code fences, no commentary.
- "similarity" must be 1-2 sentences explaining specifically WHY the facts resemble this dispute (not a generic legal principle).
- "relevance" must be one of: "supports_claimant", "supports_defendant", "mixed".

JSON SCHEMA (return exactly this structure):

{
  "precedents": [
    {
      "caseName": "Party A v Party B",
      "citation": "[Year] Court Reference (or empty string if unsure)",
      "similarity": "...",
      "relevance": "supports_claimant"
    }
  ]
}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  if (isRateLimited(req, res, { routeName: "precedents", max: 15 })) return;

  const { contractType, breachType, clausesDetected, damagesGbp, disputeDesc } = req.body || {};

  if (!disputeDesc || typeof disputeDesc !== "string") {
    return res.status(400).json({ error: "disputeDesc is required." });
  }
  if (disputeDesc.length > 10000) {
    return res.status(400).json({ error: "disputeDesc too long (max 10,000 characters)." });
  }
  if (clausesDetected && !Array.isArray(clausesDetected)) {
    return res.status(400).json({ error: "clausesDetected must be an array." });
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
              "You are a senior UK litigator surfacing genuinely comparable precedent cases. You return only valid JSON, never prose. You only cite cases you have reasonable confidence actually exist.",
          },
          {
            role: "user",
            content: buildPrompt({ contractType, breachType, clausesDetected, damagesGbp, disputeDesc }),
          },
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

    const list = Array.isArray(parsed.precedents) ? parsed.precedents : [];
    const precedents = list
      .filter((p) => p && p.caseName)
      .slice(0, 5)
      .map((p) => ({
        caseName: p.caseName,
        citation: p.citation || "",
        similarity: p.similarity || "",
        relevance: ["supports_claimant", "supports_defendant", "mixed"].includes(p.relevance)
          ? p.relevance
          : "mixed",
        bailiiUrl: buildBailiiSearchUrl(p.caseName),
      }));

    return res.status(200).json({ precedents });
  } catch (e) {
    console.error("Precedents error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
