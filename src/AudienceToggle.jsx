// src/AudienceToggle.jsx
// Shows three pills (Partner / Client / Explain it to me). Clicking one
// calls /api/reframe and invokes onRewrite(text) with the result. Parent
// is responsible for displaying that text. Clicking "Reset" reverts.

import { useState } from "react";

const AUDIENCES = [
  { key: "partner", label: "Partner brief",      sub: "Legalese · default" },
  { key: "client",  label: "Client-facing",      sub: "Plain professional" },
  { key: "simple",  label: "Explain it to me",   sub: "No jargon" },
];

export default function AudienceToggle({
  originalAnalysis,   // the original analysis string (markdown-ish)
  contextType,        // "dispute" | "dd"
  onRewrite,          // (text | null) => void — receives rewritten text, or null to reset
  activeAudience,     // current selected key from parent (controlled)
  setActiveAudience,  // setter from parent
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectAudience = async (key) => {
    if (loading) return;
    if (key === activeAudience) return; // already on this audience
    setError("");

    // Partner = the original analysis, no need to call the API
    if (key === "partner") {
      setActiveAudience("partner");
      onRewrite(null); // null means "show original"
      return;
    }

    setLoading(true);
    setActiveAudience(key);
    try {
      const res = await fetch("/api/reframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalAnalysis,
          audience: key,
          contextType,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      onRewrite(data.rewritten);
    } catch (e) {
      setError(e.message);
      setActiveAudience("partner"); // revert on failure
      onRewrite(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aud-toggle">
      <div className="aud-toggle-label">Rewrite for audience</div>
      <div className="aud-toggle-row">
        {AUDIENCES.map((a) => (
          <button
            key={a.key}
            className={`aud-pill ${activeAudience === a.key ? "active" : ""}`}
            onClick={() => selectAudience(a.key)}
            disabled={loading}
          >
            <div className="aud-pill-label">{a.label}</div>
            <div className="aud-pill-sub">{a.sub}</div>
          </button>
        ))}
      </div>
      {loading && <div className="aud-status">Rewriting for {activeAudience}…</div>}
      {error && <div className="aud-error">Error: {error}</div>}
    </div>
  );
}