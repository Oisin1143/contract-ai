// Vercel Serverless Function — POST /api/reframe
// Takes an already-generated analysis (dispute or DD) and rewrites
// it for a different audience. Keeps the same findings, changes
// tone/vocabulary/depth.

const AUDIENCES = {
  partner: {
    label: "Partner brief",
    instruction: `
Rewrite for a partner at a commercial law firm. This is the default professional register:
- Dense, precise legal vocabulary — use terms of art (consideration, repudiatory breach, quantum, etc.) without defining them
- Cite the specific legal doctrines and where relevant the leading cases
- Concise and bulleted; assumes full legal literacy
- Focused on litigation risk, strategic posture, and what needs counsel's immediate attention`,
  },
  client: {
    label: "Client-facing note",
    instruction: `
Rewrite for a commercially-minded but non-lawyer business director (e.g. a COO, General Counsel of a small company, or founder).
- Plain professional English; explain any legal term you use in one clause
- Lead with commercial and operational impact, not doctrine
- Written in a tone appropriate for emailing to the client — measured, practical, not alarming unless alarm is warranted
- Structure: (i) the bottom line, (ii) the specific risks that matter, (iii) what we recommend they do next`,
  },
  simple: {
    label: "Explain it to me",
    instruction: `
Rewrite for a complete non-lawyer who has never seen a contract dispute before.
- No legal jargon at all. If you must use a legal term, replace it with a plain-English equivalent
- Short sentences, short paragraphs, conversational tone — like explaining to a friend over coffee
- Use everyday analogies sparingly where they genuinely help
- Reassure where possible; explain clearly where the risk is real
- Structure: what's going on · what the risks actually mean in real life · what they should probably do`,
  },
};

function buildPrompt({ originalAnalysis, audience, contextType }) {
  const aud = AUDIENCES[audience];
  const contextLabel =
    contextType === "dd"
      ? "a due-diligence contract review"
      : "a contract dispute analysis";

  return `You are rewriting ${contextLabel} for a specific audience.

AUDIENCE: ${aud.label}
STYLE INSTRUCTION:${aud.instruction}

ORIGINAL ANALYSIS:
"""
${originalAnalysis}
"""

YOUR TASK:
Rewrite the analysis above for the target audience. CRITICAL:
- Preserve every substantive finding — do not drop points, invent new ones, or change facts
- Keep the same overall structure (sections, categories, probabilities if present)
- Only change tone, vocabulary, and explanatory depth
- Use proper UK English (organisation, favour, programme)
- Return the rewritten analysis as plain markdown-style text using the SAME section headings the original used (e.g. "## KEY LEGAL ISSUES & BREACH")
- Do NOT wrap the output in JSON or code fences — return the rewritten analysis directly`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { originalAnalysis, audience, contextType } = req.body || {};

  if (!originalAnalysis || typeof originalAnalysis !== "string") {
    return res.status(400).json({ error: "originalAnalysis is required." });
  }
  if (!AUDIENCES[audience]) {
    return res
      .status(400)
      .json({ error: `audience must be one of: ${Object.keys(AUDIENCES).join(", ")}` });
  }
  if (originalAnalysis.length > 30000) {
    return res.status(400).json({ error: "originalAnalysis too long." });
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
              "You are a senior UK commercial solicitor skilled at translating legal analysis for different audiences. You preserve every substantive finding. You write in UK English.",
          },
          {
            role: "user",
            content: buildPrompt({ originalAnalysis, audience, contextType }),
          },
        ],
        max_tokens: 5000,
        temperature: 0.3,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq error ${groqRes.status}`);
    }

    const groqData = await groqRes.json();
    const rewritten = groqData.choices?.[0]?.message?.content || "";
    if (!rewritten) throw new Error("Empty response from Groq.");

    return res.status(200).json({ rewritten, audience });
  } catch (e) {
    console.error("Reframe error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}