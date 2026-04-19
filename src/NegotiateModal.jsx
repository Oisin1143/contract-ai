// src/NegotiateModal.jsx
// Modal that pops over the DD results. Given a single problematic
// finding (clause + issue + explanation), calls /api/negotiate and
// shows three redline variants: aggressive / balanced / accommodating.
// Each variant has copy buttons for the rewrite and the email.

import { useState, useEffect } from "react";

const POSTURES = [
  {
    key: "aggressive",
    label: "Aggressive",
    sub: "Maximum protection · likely opening position",
    color: "#e87d7d",
  },
  {
    key: "balanced",
    label: "Balanced",
    sub: "Middle ground · most likely to be accepted",
    color: "#e8c87d",
  },
  {
    key: "accommodating",
    label: "Accommodating",
    sub: "Small but meaningful win · preserves the relationship",
    color: "#7dd87d",
  },
];

export default function NegotiateModal({
  finding,            // { issue, passage_excerpt, explanation, recommendation }
  mode,               // "presigning" | "ma"
  contractType,       // optional category context
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variants, setVariants] = useState(null);
  const [activeTab, setActiveTab] = useState("balanced");
  const [copied, setCopied] = useState(""); // "aggressive-rewrite" etc.

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/negotiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clause: finding.passage_excerpt || finding.issue,
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
        const data = await res.json();
        if (!cancelled) setVariants(data);
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

  // Close on Escape
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      // Fallback for older browsers — silent
    }
  };

  const active = variants?.[activeTab];
  const activePosture = POSTURES.find((p) => p.key === activeTab);

  return (
    <div className="neg-overlay" onClick={onClose}>
      <div className="neg-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="neg-header">
          <div>
            <div className="neg-eyebrow">Negotiate Clause</div>
            <div className="neg-title">{finding.issue}</div>
          </div>
          <button className="neg-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Original clause reference */}
        <div className="neg-original">
          <div className="neg-section-label">Original clause</div>
          <div className="neg-original-text">
            {finding.passage_excerpt || (
              <em>No verbatim excerpt available — using issue summary.</em>
            )}
          </div>
        </div>

        {/* Body */}
        {loading && (
          <div className="neg-loading">
            <div className="spinner" />
            <div>
              Drafting three redline alternatives and negotiation emails…
            </div>
          </div>
        )}

        {error && (
          <div className="neg-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {variants && !loading && (
          <>
            {/* Posture tabs */}
            <div className="neg-tabs">
              {POSTURES.map((p) => (
                <button
                  key={p.key}
                  className={`neg-tab ${activeTab === p.key ? "active" : ""}`}
                  onClick={() => setActiveTab(p.key)}
                  style={
                    activeTab === p.key ? { borderBottomColor: p.color } : undefined
                  }
                >
                  <div className="neg-tab-label" style={{ color: p.color }}>
                    {p.label}
                  </div>
                  <div className="neg-tab-sub">{p.sub}</div>
                </button>
              ))}
            </div>

            {/* Active variant content */}
            <div className="neg-variant">
              {/* Rationale */}
              <div className="neg-rationale">
                <span
                  className="neg-rationale-tag"
                  style={{ color: activePosture.color }}
                >
                  Why this works:
                </span>{" "}
                {active.rationale}
              </div>

              {/* Rewrite */}
              <div className="neg-block">
                <div className="neg-block-header">
                  <div className="neg-section-label">Proposed redline</div>
                  <button
                    className="neg-copy-btn"
                    onClick={() =>
                      copyToClipboard(active.rewrite, `${activeTab}-rewrite`)
                    }
                  >
                    {copied === `${activeTab}-rewrite` ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
                <div className="neg-rewrite">{active.rewrite}</div>
              </div>

              {/* Email */}
              <div className="neg-block">
                <div className="neg-block-header">
                  <div className="neg-section-label">
                    Email to counterparty
                  </div>
                  <button
                    className="neg-copy-btn"
                    onClick={() =>
                      copyToClipboard(active.email, `${activeTab}-email`)
                    }
                  >
                    {copied === `${activeTab}-email` ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
                <div className="neg-email">{active.email}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}