// src/AutoNegotiate.jsx
// Autonomous negotiation: fires one request to /api/auto-negotiate, which
// runs a full AI-vs-AI redline exchange server-side, then reveals the
// transcript turn-by-turn client-side for a "watching it happen" effect.
// Each turn's redline is a real word-level diff against the previous turn
// (src/diffContracts.js) — the same deterministic-diff approach Redline
// Compare uses, not the model's own claim about what it changed.

import { useState, useEffect, useRef } from "react";
import { buildRedlineSegments } from "./diffContracts";

const PARTY_LABEL = { ourCounsel: "Our Counsel", opposingCounsel: "Opposing Counsel" };
const MOVE_LABEL = { counter: "Counter-proposal", accept: "Accepted", deadlock: "Deadlock declared" };

const OUTCOME_META = {
  agreed: { icon: "✓", label: "Agreement reached", color: "#7dd87d" },
  deadlock: { icon: "⚠", label: "Deadlock — positions did not converge", color: "#e87d7d" },
  max_rounds: { icon: "⏱", label: "Round limit reached without full agreement", color: "#e8d98a" },
};

function RedlineText({ prev, curr }) {
  const segments = buildRedlineSegments(prev || "", curr || "");
  return (
    <div className="autoneg-text">
      {segments.map((part, i) =>
        part.added ? (
          <ins key={i} className="redline-added">{part.value}</ins>
        ) : part.removed ? (
          <del key={i} className="redline-removed">{part.value}</del>
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </div>
  );
}

export default function AutoNegotiate({
  finding,            // { issue, passage_excerpt, explanation, recommendation }
  mode,               // "presigning" | "ma"
  contractType,       // optional category context
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [revealCount, setRevealCount] = useState(0);
  const revealTimer = useRef(null);

  const clause = finding.passage_excerpt || finding.issue;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auto-negotiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clause,
            issue: finding.issue,
            explanation: finding.explanation,
            mode,
            contractType,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `Server error ${res.status}`);
        }
        const result = await res.json();
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progressive reveal: once the full transcript is in, unveil one turn at
  // a time so it reads like a live exchange rather than a wall of text.
  useEffect(() => {
    if (!data) return;
    revealTimer.current = setInterval(() => {
      setRevealCount((n) => {
        if (n >= data.transcript.length) {
          clearInterval(revealTimer.current);
          return n;
        }
        return n + 1;
      });
    }, 900);
    return () => clearInterval(revealTimer.current);
  }, [data]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const fullyRevealed = data && revealCount >= data.transcript.length;
  const outcomeMeta = data ? OUTCOME_META[data.outcome] : null;

  return (
    <div className="neg-overlay" onClick={onClose}>
      <div className="neg-modal autoneg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="neg-header">
          <div>
            <div className="neg-eyebrow">Autonomous Negotiation</div>
            <div className="neg-title">{finding.issue}</div>
          </div>
          <button className="neg-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="neg-original">
          <div className="neg-section-label">Clause as originally drafted</div>
          <div className="neg-original-text">
            {clause || <em>No verbatim excerpt available — using issue summary.</em>}
          </div>
        </div>

        {loading && (
          <div className="neg-loading">
            <div className="spinner" />
            <div>Two AI solicitors are negotiating this clause — this can take up to a minute…</div>
          </div>
        )}

        {error && (
          <div className="neg-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {data && (
          <div className="autoneg-transcript">
            {data.transcript.slice(0, revealCount).map((turn, i) => {
              const prevText = i === 0 ? data.originalClause : data.transcript[i - 1].text;
              return (
                <div key={i} className={`autoneg-turn autoneg-turn-${turn.party}`}>
                  <div className="autoneg-turn-header">
                    <span className={`autoneg-badge autoneg-badge-${turn.party}`}>
                      {PARTY_LABEL[turn.party]}
                    </span>
                    <span className="autoneg-move">{MOVE_LABEL[turn.move]}</span>
                  </div>
                  <RedlineText prev={prevText} curr={turn.text} />
                  {turn.rationale && (
                    <div className="autoneg-rationale">{turn.rationale}</div>
                  )}
                </div>
              );
            })}

            {revealCount < data.transcript.length && (
              <div className="autoneg-typing">
                <span />
                <span />
                <span />
              </div>
            )}

            {fullyRevealed && (
              <div className="autoneg-outcome" style={{ borderColor: outcomeMeta.color }}>
                <div className="autoneg-outcome-header" style={{ color: outcomeMeta.color }}>
                  {outcomeMeta.icon} {outcomeMeta.label}
                  {data.transcript.length > 0 && ` after ${data.transcript.length} turn${data.transcript.length === 1 ? "" : "s"}`}
                </div>
                <div className="neg-block">
                  <div className="neg-block-header">
                    <div className="neg-section-label">Final position</div>
                    <button
                      className="neg-copy-btn"
                      onClick={() => navigator.clipboard?.writeText(data.finalText).catch(() => {})}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="neg-rewrite">{data.finalText}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
