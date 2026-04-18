// Vercel Serverless Function — POST /api/due-diligence
// Reviews a contract and returns structured risk analysis.
// Two modes:
//   "presigning" — pre-signing review for the party about to sign
//   "ma"        — M&A due diligence for an acquirer

const CATEGORIES = [
  "Termination & Exit",
  "Liability & Indemnities",
  "IP & Confidentiality",
  "Payment & Commercial Terms",
  "Data Protection & Compliance",
  "Warranties & Representations",
  "Dispute Resolution",
  "Force Majeure",
  "Assignment & Subcontracting",
  "Boilerplate & Red Flags",
];

function buildPrompt(contractText, mode) {
  const perspective =
    mode === "ma"
      ? "an acquiring party conducting M&A due diligence on a target company that is a party to this contract. Focus on risks that affect deal value, change-of-control implications, retained liabilities, regulatory exposure, and anything the acquirer would want renegotiated, warranted, or indemnified against."
      : "a party that is about to enter into this contract. Focus on operational, commercial and legal risks that the party would face under this contract going forward, and clauses that favour the counterparty disproportionately.";

  return `You are a senior UK commercial contracts solicitor at a Magic Circle firm conducting a thorough review on behalf of ${perspective}

CONTRACT TEXT:
"""
${contractText}
"""

Identify real legal and commercial risks in the contract across the categories listed below. For each category, assign a risk rating and list specific findings grounded in actual clauses of the contract. Do not invent issues that are not in the text.

CATEGORIES TO ASSESS:
${CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

CRITICAL OUTPUT RULES:
- Respond with STRICT JSON ONLY. No commentary before or after. No markdown code fences.
- Every "passage_excerpt" MUST be verbatim text from the contract (copy-paste from it). Max 250 characters. If you cannot find a verbatim passage for an issue, omit that finding.
- Each finding must be genuinely grounded in the contract text. No hallucinated clauses.
- If a category is not addressed in the contract or carries no meaningful risk, set its risk to "NOT_APPLICABLE" and findings to [].
- Risk ratings must be one of: "HIGH", "MEDIUM", "LOW", "NOT_APPLICABLE".
- Overall risk reflects the worst applicable category risk, weighted by commercial significance.

JSON SCHEMA (return exactly this structure):

{
  "overall_risk": "HIGH|MEDIUM|LOW",
  "summary": "2-3 sentence executive summary for ${mode === "ma" ? "the acquirer" : "the contracting party"}.",
  "categories": [
    {
      "name": "Termination & Exit",
      "risk": "HIGH|MEDIUM|LOW|NOT_APPLICABLE",
      "findings": [
        {
          "issue": "Short issue title",
          "passage_excerpt": "exact verbatim text from the contract",
          "explanation": "Why this matters legally and commercially",
          "recommendation": "What to do about it"
        }
      ]
    }
  ]
}

Include all ${CATEGORIES.length} categories in the output in the exact order listed above.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { contractText, mode } = req.body || {};

  if (!contractText || typeof contractText !== "string") {
    return res.status(400).json({ error: "contractText is required." });
  }
  if (!["presigning", "ma"].includes(mode)) {
    return res
      .status(400)
      .json({ error: 'mode must be "presigning" or "ma".' });
  }
  if (contractText.length < 100) {
    return res
      .status(400)
      .json({ error: "Contract text is too short to review meaningfully." });
  }
  if (contractText.length > 60000) {
    return res.status(400).json({
      error:
        "Contract text too long (max 60,000 characters). Try splitting by section.",
    });
  }

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return res
      .status(500)
      .json({ error: "Server misconfiguration: missing API key." });
  }

  try {
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
                "You are a senior UK commercial contracts solicitor. You return only valid JSON, never prose. Every excerpt you quote is verbatim from the contract you are given.",
            },
            { role: "user", content: buildPrompt(contractText, mode) },
          ],
          max_tokens: 6000,
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq error ${groqRes.status}`);
    }

    const groqData = await groqRes.json();
    const raw = groqData.choices?.[0]?.message?.content || "";
    if (!raw) throw new Error("Empty response from Groq.");

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      // Fallback: try to extract JSON from any surrounding text
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse model response as JSON.");
      parsed = JSON.parse(match[0]);
    }

    // Sanity-check and normalise the response shape
    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      throw new Error("Model response missing categories array.");
    }
    parsed.overall_risk = parsed.overall_risk || "MEDIUM";
    parsed.summary = parsed.summary || "";
    parsed.categories = parsed.categories.map((c) => ({
      name: c.name || "",
      risk: c.risk || "NOT_APPLICABLE",
      findings: Array.isArray(c.findings) ? c.findings : [],
    }));

    return res.status(200).json(parsed);
  } catch (e) {
    console.error("Due diligence error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}