// src/DueDiligence.jsx
// Due diligence / pre-signing contract review feature.
// - Accepts text paste OR .pdf / .docx / .txt upload
// - Two modes: "presigning" or "ma" (M&A)
// - Renders: executive summary, categorised risk list, and a heatmap
//   that highlights each risky passage directly in the contract text.

import { useState, useMemo, useRef, useEffect } from "react";
import { extractTextFromFile } from "./extractText";
import NegotiateModal from "./NegotiateModal";
import { supabase } from "./supabase";

const RISK_COLORS = {
  HIGH: "#e87d7d",
  MEDIUM: "#e8c87d",
  LOW: "#7dbfe8",
  NOT_APPLICABLE: "rgba(232,224,208,0.3)",
};

const RISK_BG = {
  HIGH: "rgba(232,125,125,0.18)",
  MEDIUM: "rgba(232,200,125,0.18)",
  LOW: "rgba(125,191,232,0.15)",
};

export default function DueDiligence({ user }) {
  const [mode, setMode] = useState("presigning"); // "presigning" | "ma"
  const [contractText, setContractText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState(null);
  const [activeFinding, setActiveFinding] = useState(null); // {categoryIdx, findingIdx}
  const [negotiating, setNegotiating] = useState(null); // { finding, categoryName }
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"
  const fileInputRef = useRef(null);
  const contractRef = useRef(null);

  // ── Restore a saved DD case if App.jsx handed one to us via sessionStorage ──
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("arbitrer_dd_restore");
      if (!raw) return;
      sessionStorage.removeItem("arbitrer_dd_restore");
      const saved = JSON.parse(raw);
      if (saved.case_type !== "dd") return;
      setMode(saved.input_data?.mode || "presigning");
      setContractText(saved.input_data?.contractText || "");
      setFileName(saved.input_data?.fileName || "");
      setResults(saved.result_data || null);
    } catch { /* no-op */ }
  }, []);

  // ── Save the current DD review to Supabase ──
  const saveDDCase = async () => {
    if (!supabase || !user || !results) return;
    setSaveStatus("saving");
    const title =
      (results.summary || "").slice(0, 60) +
      ((results.summary || "").length > 60 ? "…" : "") ||
      `Due diligence — ${mode === "ma" ? "M&A" : "Pre-signing"}`;
    const { error: insErr } = await supabase.from("saved_cases").insert({
      user_id: user.id,
      case_type: "dd",
      title,
      input_data: { contractText, mode, fileName },
      result_data: results,
    });
    if (insErr) {
      console.error(insErr);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 3000);
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    setLoadingStep(`Extracting text from ${file.name}…`);
    setLoading(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.length < 100) {
        throw new Error(
          "Extracted text is too short. The file may be scanned or image-based."
        );
      }
      setContractText(text);
    } catch (err) {
      setError(err.message);
      setFileName("");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const runAnalysis = async () => {
    setError("");
    setResults(null);
    setActiveFinding(null);

    if (!contractText || contractText.trim().length < 100) {
      setError("Please paste or upload a contract with at least 100 characters.");
      return;
    }

    setLoading(true);
    setLoadingStep("Reviewing contract with senior-barrister AI…");
    try {
      const response = await fetch("/api/due-diligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText, mode }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Server error ${response.status}`);
      }
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError("Error: " + err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  // ── Build the highlighted contract text ──
  //   For each finding with a verbatim excerpt, find it in the contract
  //   and wrap it with a <mark> span coloured by that finding's risk.
  //   Uses the CATEGORY's risk as the highlight colour.
  const highlightedSegments = useMemo(() => {
    if (!results || !contractText) return null;

    // Collect all findings with their risk rating
    const findings = [];
    results.categories.forEach((cat, catIdx) => {
      (cat.findings || []).forEach((f, fIdx) => {
        if (f.passage_excerpt && f.passage_excerpt.length > 10) {
          findings.push({
            excerpt: f.passage_excerpt,
            risk: cat.risk,
            categoryIdx: catIdx,
            findingIdx: fIdx,
            issue: f.issue,
          });
        }
      });
    });

    // Find each excerpt in the contract — case-insensitive exact match first,
    // then a whitespace-normalised fallback. If still not found, skip.
    const normalized = contractText.replace(/\s+/g, " ");
    const markers = []; // { start, end, risk, categoryIdx, findingIdx, issue }

    findings.forEach((f) => {
      let idx = contractText.indexOf(f.excerpt);
      let matchLen = f.excerpt.length;
      if (idx === -1) {
        // Try normalised match
        const ne = f.excerpt.replace(/\s+/g, " ").trim();
        const ni = normalized.indexOf(ne);
        if (ni !== -1) {
          // Map normalised index back — cheap approximation: use same index
          idx = ni;
          matchLen = ne.length;
        }
      }
      if (idx !== -1) {
        markers.push({
          start: idx,
          end: idx + matchLen,
          risk: f.risk,
          categoryIdx: f.categoryIdx,
          findingIdx: f.findingIdx,
          issue: f.issue,
        });
      }
    });

    // Sort markers by start, resolve overlaps by preferring HIGH > MEDIUM > LOW
    markers.sort((a, b) => a.start - b.start);
    const priority = { HIGH: 3, MEDIUM: 2, LOW: 1, NOT_APPLICABLE: 0 };
    const filtered = [];
    for (const m of markers) {
      const last = filtered[filtered.length - 1];
      if (last && m.start < last.end) {
        // Overlap — keep the higher-risk marker
        if (priority[m.risk] > priority[last.risk]) {
          filtered[filtered.length - 1] = m;
        }
      } else {
        filtered.push(m);
      }
    }

    // Build segments: plain text + highlighted text
    const segs = [];
    let cursor = 0;
    for (const m of filtered) {
      if (m.start > cursor) {
        segs.push({ type: "text", content: contractText.slice(cursor, m.start) });
      }
      segs.push({
        type: "mark",
        content: contractText.slice(m.start, m.end),
        risk: m.risk,
        categoryIdx: m.categoryIdx,
        findingIdx: m.findingIdx,
        issue: m.issue,
      });
      cursor = m.end;
    }
    if (cursor < contractText.length) {
      segs.push({ type: "text", content: contractText.slice(cursor) });
    }
    return segs;
  }, [results, contractText]);

  // Scroll the contract pane to show a specific finding's highlight
  const jumpToFinding = (categoryIdx, findingIdx) => {
    setActiveFinding({ categoryIdx, findingIdx });
    const el = document.querySelector(
      `[data-finding="${categoryIdx}-${findingIdx}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="dd-root">
      {/* ── INPUT ROW ───────────────────────────────────── */}
      {!results && (
        <div className="dd-input-row">
          {/* Mode toggle */}
          <div className="dd-mode-toggle">
            <button
              className={`dd-mode-btn ${mode === "presigning" ? "active" : ""}`}
              onClick={() => setMode("presigning")}
            >
              Pre-Signing Review
            </button>
            <button
              className={`dd-mode-btn ${mode === "ma" ? "active" : ""}`}
              onClick={() => setMode("ma")}
            >
              M&amp;A Due Diligence
            </button>
          </div>

          <div className="dd-mode-explainer">
            {mode === "presigning"
              ? "Reviewing risks from the perspective of a party about to sign this contract."
              : "Reviewing risks from the perspective of an acquirer evaluating a target company that is party to this contract."}
          </div>

          {/* Upload */}
          <div className="dd-upload">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              ref={fileInputRef}
              style={{ display: "none" }}
            />
            <button
              className="dd-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              📎 &nbsp;Upload .pdf / .docx / .txt
            </button>
            {fileName && <div className="dd-filename">✓ {fileName}</div>}
          </div>

          <div className="dd-or">— or paste contract text below —</div>

          <div className="dispute-input">
            <label>Contract text</label>
            <textarea
              rows={10}
              className="dd-textarea"
              placeholder="Paste the full contract text here…"
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
            />
          </div>

          {error && <div className="dd-error">{error}</div>}

          <button
            className="analyse-btn"
            onClick={runAnalysis}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                {loadingStep || "Reviewing…"}
              </>
            ) : (
              <>🛡️ &nbsp;Run Due Diligence Review</>
            )}
          </button>

          <div className="disclaimer">
            This tool assists with contract review and is not a substitute for
            advice from a qualified solicitor. AI-generated findings should be
            verified against the source contract. Do not upload confidential
            client documents.
          </div>
        </div>
      )}

      {/* ── RESULTS ─────────────────────────────────────── */}
      {results && (
        <div className="dd-results">
          <div className="dd-results-header">
            <div>
              <div className="dd-results-title">Review Complete</div>
              <div className="dd-results-sub">
                {mode === "ma"
                  ? "M&A Due Diligence"
                  : "Pre-Signing Contract Review"}
              </div>
            </div>
            <div className="dd-header-actions">
              {user && supabase && (
                <button
                  className="dd-save-btn"
                  onClick={saveDDCase}
                  disabled={saveStatus === "saving" || saveStatus === "saved"}
                >
                  {saveStatus === "saving" && "Saving…"}
                  {saveStatus === "saved"  && "✓ Saved"}
                  {saveStatus === "error"  && "Error — try again"}
                  {!saveStatus             && "💾 Save to My Cases"}
                </button>
              )}
              {!user && supabase && (
                <span className="dd-save-hint">
                  Sign in to save this review
                </span>
              )}
              <button
                className="dd-reset-btn"
                onClick={() => {
                  setResults(null);
                  setContractText("");
                  setFileName("");
                  setActiveFinding(null);
                  setSaveStatus("");
                }}
              >
                ← Review another contract
              </button>
            </div>
          </div>

          {/* Overall risk + summary */}
          <div className="dd-overall-card">
            <div className="dd-overall-label">Overall risk</div>
            <div
              className="dd-overall-risk"
              style={{ color: RISK_COLORS[results.overall_risk] }}
            >
              {results.overall_risk}
            </div>
            <div className="dd-overall-summary">{results.summary}</div>
          </div>

          {/* Two-pane: heatmap + categories */}
          <div className="dd-split">
            {/* Contract heatmap */}
            <div className="dd-heatmap-pane">
              <div className="dd-pane-title">Contract Heatmap</div>
              <div className="dd-contract-text" ref={contractRef}>
                {highlightedSegments?.map((seg, i) =>
                  seg.type === "mark" ? (
                    <mark
                      key={i}
                      data-finding={`${seg.categoryIdx}-${seg.findingIdx}`}
                      className={`dd-mark ${
                        activeFinding?.categoryIdx === seg.categoryIdx &&
                        activeFinding?.findingIdx === seg.findingIdx
                          ? "dd-mark-active"
                          : ""
                      }`}
                      style={{
                        background: RISK_BG[seg.risk],
                        borderBottom: `2px solid ${RISK_COLORS[seg.risk]}`,
                      }}
                      title={seg.issue}
                    >
                      {seg.content}
                    </mark>
                  ) : (
                    <span key={i}>{seg.content}</span>
                  )
                )}
              </div>
            </div>

            {/* Categories list */}
            <div className="dd-categories-pane">
              <div className="dd-pane-title">Risk Categories</div>
              <div className="dd-categories">
                {results.categories.map((cat, catIdx) => (
                  <div key={catIdx} className="dd-category">
                    <div className="dd-category-header">
                      <span className="dd-category-name">{cat.name}</span>
                      <span
                        className="dd-category-risk"
                        style={{
                          color: RISK_COLORS[cat.risk],
                          borderColor: RISK_COLORS[cat.risk],
                        }}
                      >
                        {cat.risk.replace("_", " ")}
                      </span>
                    </div>
                    {cat.findings && cat.findings.length > 0 ? (
                      <div className="dd-findings">
                        {cat.findings.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className={`dd-finding ${
                              activeFinding?.categoryIdx === catIdx &&
                              activeFinding?.findingIdx === fIdx
                                ? "dd-finding-active"
                                : ""
                            }`}
                            onClick={() => jumpToFinding(catIdx, fIdx)}
                          >
                            <div className="dd-finding-issue">{f.issue}</div>
                            {f.passage_excerpt && (
                              <div className="dd-finding-excerpt">
                                "{f.passage_excerpt}"
                              </div>
                            )}
                            <div className="dd-finding-section">
                              <span className="dd-finding-label">Why it matters:</span>{" "}
                              {f.explanation}
                            </div>
                            <div className="dd-finding-section">
                              <span className="dd-finding-label">Recommendation:</span>{" "}
                              {f.recommendation}
                            </div>
                            {(cat.risk === "HIGH" || cat.risk === "MEDIUM") && (
                              <button
                                className="dd-negotiate-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNegotiating({
                                    finding: f,
                                    categoryName: cat.name,
                                  });
                                }}
                              >
                                💼 Generate counter-clause &amp; email
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="dd-no-findings">No material findings.</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Negotiate clause modal */}
      {negotiating && (
        <NegotiateModal
          finding={negotiating.finding}
          mode={mode}
          contractType={negotiating.categoryName}
          onClose={() => setNegotiating(null)}
        />
      )}
    </div>
  );
}