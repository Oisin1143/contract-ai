// Vercel Serverless Function — POST /api/auto-negotiate
// Autonomous two-agent negotiation: two independent AI solicitors — "Our
// Counsel" (addressing the flagged issue) and "Opposing Counsel" (defending
// the counterparty's position) — redline a single clause back and forth
// with no human input, until they converge, deadlock, or hit the round
// cap. Each turn is one Groq call producing strict JSON; the word-level
// redline between turns is computed client-side by the same deterministic
// diff used in Redline Compare, not by the model — same grounding
// philosophy as api/redline-summary.js.

import { isRateLimited } from "./_lib/rateLimit.js";

const MAX_TURNS = 6; // 3 rounds each side
const MODEL = "llama-3.3-70b-versatile";

function perspective(mode, party) {
  if (party === "ourCounsel") {
    return mode === "ma"
      ? "the acquirer's solicitor in an M&A transaction, conducting due diligence and seeking to fix this clause before signing"
      : "the solicitor for the party about to sign this contract, seeking to fix this clause before signing";
  }
  return mode === "ma"
    ? "the target/seller's solicitor in an M&A transaction, defending the clause as drafted"
    : "the counterparty's solicitor, defending the clause as drafted";
}

function formatTranscript(transcript) {
  const label = { ourCounsel: "Our Counsel", opposingCounsel: "Opposing Counsel" };
  return transcript
    .map(
      (t, i) =>
        `Turn ${i + 1} (${label[t.party]} — ${t.move}):\n"${t.text}"\nRationale: ${t.rationale}`
    )
    .join("\n\n");
}

function buildPrompt({ party, clause, issue, explanation, mode, contractType, transcript }) {
  const who = perspective(mode, party);
  const opener = party === "ourCounsel" && transcript.length === 0;

  const header = `You are a senior UK commercial solicitor acting as ${who}. You are in an autonomous redline negotiation with opposing counsel over ONE clause in a ${contractType || "commercial"} contract. Neither of you is a human — you are negotiating directly against another AI solicitor representing the other side. Stay strictly in character and in role; never mention you are an AI.

THE CLAUSE AS ORIGINALLY DRAFTED:
"""
${clause}
"""
${party === "ourCounsel" ? `\nTHE ISSUE YOUR CLIENT HAS WITH IT:\nIssue: ${issue}\nWhy it matters: ${explanation}\n` : ""}`;

  if (opener) {
    return `${header}
YOUR TASK:
Produce an opening redraft of this clause that fixes the issue above in your client's favour. This is your opening position — it can be assertive, but it must be a real, deployable clause (no square-bracket placeholders).

CRITICAL OUTPUT RULES:
- Respond with STRICT JSON ONLY: {"move":"counter","text":"...","rationale":"..."}
- "text" is the full replacement clause, UK English, commercially realistic.
- "rationale" is ONE sentence on what this redraft achieves.`;
  }

  return `${header}
NEGOTIATION SO FAR:
${formatTranscript(transcript)}

YOUR TASK:
Respond to the most recent turn above. You have three options:
1. "counter" — propose your own redraft that moves the position, conceding some ground if the other side has made a fair point, but still protecting your client. Must differ from the previous turn's text in a substantive way.
2. "accept" — if the other side's last proposal is genuinely reasonable and you have no material objection left, accept it. Set "text" to their exact clause text (repeat it verbatim).
3. "deadlock" — if you have already conceded what you reasonably can and the other side's position is unacceptable with no room left to move, declare deadlock. Set "text" to your own last proposed position (or the original clause if you haven't proposed one yet).

Negotiate like a real solicitor: don't cave immediately, but don't repeat the same position forever either — make genuine incremental movement across turns where it's justified.

CRITICAL OUTPUT RULES:
- Respond with STRICT JSON ONLY: {"move":"counter"|"accept"|"deadlock","text":"...","rationale":"..."}
- "text" is the full clause text (UK English, commercially realistic, no placeholders).
- "rationale" is ONE sentence explaining your move.`;
}

async function callGroq(GROQ_KEY, prompt) {
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a senior UK commercial solicitor in an autonomous AI-vs-AI redline negotiation. You return only valid JSON, never prose, never meta-commentary about being an AI.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 700,
      temperature: 0.5,
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

  if (!parsed.text || !["counter", "accept", "deadlock"].includes(parsed.move)) {
    throw new Error("Model response missing required fields.");
  }

  return {
    move: parsed.move,
    text: String(parsed.text).trim(),
    rationale: String(parsed.rationale || "").trim(),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }
  if (isRateLimited(req, res, { routeName: "auto-negotiate", max: 5 })) return;

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

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({ error: "Server misconfiguration: missing API key." });
  }

  const transcript = [];
  let outcome = "max_rounds";

  try {
    for (let i = 0; i < MAX_TURNS; i++) {
      const party = i % 2 === 0 ? "ourCounsel" : "opposingCounsel";
      const prompt = buildPrompt({ party, clause, issue, explanation, mode, contractType, transcript });
      const turn = await callGroq(GROQ_KEY, prompt);
      transcript.push({ party, ...turn });

      if (turn.move === "accept" || turn.move === "deadlock") {
        outcome = turn.move === "accept" ? "agreed" : "deadlock";
        break;
      }
    }

    const finalText = transcript[transcript.length - 1]?.text || clause;
    return res.status(200).json({ originalClause: clause, transcript, outcome, finalText });
  } catch (e) {
    console.error("Auto-negotiate error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
