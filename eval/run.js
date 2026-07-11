// eval/run.js — usage: npm run eval
//
// Runs the real api/due-diligence.js handler (direct import, mock req/res
// — same technique used to verify the other API routes during
// development) against each fixture in eval/fixtures.js, and checks
// whether the review's findings mention the keywords for that fixture's
// planted issue. Prints a pass/fail table + overall recall, and writes
// eval/results.md as a persisted, re-runnable record.

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { FIXTURES } from "./fixtures.js";

const projectRoot = path.resolve(import.meta.dirname, "..");

// Minimal .env loader — no new dependency needed for a dev-only script.
try {
  const envText = readFileSync(path.join(projectRoot, ".env"), "utf-8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  // no .env — GROQ_KEY may already be set in the environment
}

if (!process.env.GROQ_KEY) {
  console.error("GROQ_KEY not found in .env or environment. Cannot run eval.");
  process.exit(1);
}

function mockRes() {
  return {
    _status: 200,
    _body: null,
    setHeader() {},
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Groq's account-level tokens-per-minute cap is separate from this app's
// own per-IP rate limiter, and each due-diligence call is large enough
// (~6-7k tokens) that back-to-back fixture runs trip it. Parse the
// suggested wait out of Groq's error message and retry.
async function callWithBackoff(handler, req, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = mockRes();
    await handler(req, res);
    if (res._status === 200) return res;

    const msg = res._body?.error || "";
    const m = msg.match(/try again in ([\d.]+)s/i);
    if (m && attempt < maxAttempts) {
      const waitMs = Math.ceil(parseFloat(m[1]) * 1000) + 1500;
      process.stdout.write(`[rate limited, waiting ${(waitMs / 1000).toFixed(1)}s] `);
      await sleep(waitMs);
      continue;
    }
    return res; // non-rate-limit failure, or out of retries
  }
}

function findingsText(result) {
  if (!result?.categories) return "";
  return result.categories
    .flatMap((c) => c.findings || [])
    .map((f) => `${f.issue} ${f.explanation} ${f.recommendation} ${f.passage_excerpt}`)
    .join(" ")
    .toLowerCase();
}

async function run() {
  const { default: handler } = await import(
    pathToFileURL(path.join(projectRoot, "api", "due-diligence.js"))
  );

  const rows = [];
  let caughtCount = 0;

  for (let i = 0; i < FIXTURES.length; i++) {
    const fixture = FIXTURES[i];
    const req = {
      method: "POST",
      headers: { "x-forwarded-for": `eval-runner-${i}` }, // distinct bucket per fixture
      body: { contractText: fixture.contractText, mode: fixture.mode },
    };

    process.stdout.write(`Running ${fixture.id}... `);
    const start = Date.now();
    let res;
    try {
      res = await callWithBackoff(handler, req);
    } catch (e) {
      console.log(`ERROR (${e.message})`);
      rows.push({ ...fixture, caught: false, error: e.message, findingCount: 0 });
      continue;
    }
    const ms = Date.now() - start;

    if (res._status !== 200) {
      console.log(`FAILED (status ${res._status}: ${res._body?.error})`);
      rows.push({ ...fixture, caught: false, error: res._body?.error, findingCount: 0 });
      continue;
    }

    const text = findingsText(res._body);
    // Every concept group must have at least one matching synonym.
    const caught = fixture.expectedConcepts.every((group) =>
      group.some((kw) => text.includes(kw.toLowerCase()))
    );
    const findingCount = (res._body.categories || []).flatMap((c) => c.findings || []).length;
    if (caught) caughtCount++;

    console.log(`${caught ? "CAUGHT" : "MISSED"} (${ms}ms, ${findingCount} findings, risk=${res._body.overall_risk})`);
    rows.push({ ...fixture, caught, findingCount });
  }

  const recall = ((caughtCount / FIXTURES.length) * 100).toFixed(1);

  console.log("\n=== Summary ===");
  console.log(`Recall: ${caughtCount}/${FIXTURES.length} planted issues caught (${recall}%)`);
  for (const r of rows) {
    console.log(`  ${r.caught ? "✓" : "✗"} ${r.id} — ${r.description}`);
  }

  const timestamp = new Date().toISOString();
  const md = `# Due Diligence Eval Results

Last run: ${timestamp}

**Recall: ${caughtCount}/${FIXTURES.length} planted issues caught (${recall}%)**

Methodology: ${FIXTURES.length} synthetic contracts, each with one deliberately planted,
unambiguous legal/commercial issue. Each fixture defines a small set of distinct concept
groups (e.g. "the cap" and "it's disproportionate"); a fixture counts as "caught" if every
group has at least one synonym appear (case-insensitive) somewhere across the review's
findings (issue title, explanation, recommendation, or excerpt) — this tolerates the model
paraphrasing without accepting a coincidental partial match as a genuine catch. Ground
truth is true by construction — no external dataset is used. Run with \`npm run eval\`.

| Fixture | Result | Findings | Description |
|---|---|---|---|
${rows.map((r) => `| \`${r.id}\` | ${r.caught ? "✓ Caught" : "✗ Missed"} | ${r.findingCount ?? "—"} | ${r.description} |`).join("\n")}

## Known limitation: run-to-run variance

The review LLM runs at temperature 0.2 (not 0), so exact phrasing varies between runs even
on identical input. During calibration, two fixtures were briefly scored "missed" on one
run despite the model genuinely flagging the correct issue in different words (e.g. "Broad
Indemnity... regardless of cause" instead of "unlimited/uncapped") — the synonym lists were
expanded from real observed outputs, not tuned to force a pass. Expect single-run recall to
vary a few points below 100% on some runs; treat this report as a snapshot, not a
guarantee, and re-run \`npm run eval\` periodically rather than trusting one result forever.
`;

  writeFileSync(path.join(import.meta.dirname, "results.md"), md);
  console.log(`\nWrote eval/results.md`);
}

run().catch((e) => {
  console.error("EVAL_FAILED", e);
  process.exit(1);
});
