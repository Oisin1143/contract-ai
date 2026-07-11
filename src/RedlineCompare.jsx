// src/RedlineCompare.jsx
// Version comparison: paste/upload two versions of a contract, see an
// exact word-level redline (real diff algorithm, deterministic) plus an
// LLM-generated explanation of why each substantive change matters.

import { useState, useRef } from "react";
import { extractTextFromFile } from "./extractText";
import { buildRedlineSegments, extractChangedSegments } from "./diffContracts";

function VersionInput({ label, value, onChange, fileName, onFileUpload, disabled }) {
  const fileInputRef = useRef(null);
  return (
    <div className="redline-input-col">
      <label className="redline-input-label">{label}</label>
      <div className="redline-upload">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={onFileUpload}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="redline-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          📎 Upload .pdf / .docx / .txt
        </button>
        {fileName && <div className="redline-filename">✓ {fileName}</div>}
      </div>
      <textarea
        className="redline-textarea"
        rows={12}
        placeholder="Paste contract text here…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function RedlineCompare() {
  const [originalText, setOriginalText] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [revisedFileName, setRevisedFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redlineSegments, setRedlineSegments] = useState(null);
  const [changes, setChanges] = useState(null);
  const [changesLoading, setChangesLoading] = useState(false);

  const handleUpload = (setText, setFileName) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.length < 20) {
        throw new Error("Extracted text is too short. The file may be scanned or image-based.");
      }
      setText(text);
    } catch (err) {
      setError(err.message);
      setFileName("");
    }
  };

  const compare = async () => {
    setError("");
    if (!originalText.trim() || !revisedText.trim()) {
      setError("Please provide both the original and revised versions.");
      return;
    }
    setLoading(true);
    setRedlineSegments(null);
    setChanges(null);

    try {
      const segments = buildRedlineSegments(originalText, revisedText);
      setRedlineSegments(segments);

      const changedChunks = extractChangedSegments(originalText, revisedText);
      if (changedChunks.length === 0) {
        setChanges([]);
      } else {
        setChangesLoading(true);
        fetch("/api/redline-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments: changedChunks }),
        })
          .then((r) => {
            if (!r.ok) throw new Error(`Server error ${r.status}`);
            return r.json();
          })
          .then((d) => setChanges(d?.changes || []))
          .catch(() => setChanges(null))
          .finally(() => setChangesLoading(false));
      }
    } catch (e) {
      setError("Error computing diff: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setOriginalText("");
    setRevisedText("");
    setOriginalFileName("");
    setRevisedFileName("");
    setRedlineSegments(null);
    setChanges(null);
    setError("");
  };

  return (
    <div className="redline-root">
      {!redlineSegments && (
        <div className="redline-input-row">
          <div className="redline-inputs">
            <VersionInput
              label="Original Version"
              value={originalText}
              onChange={setOriginalText}
              fileName={originalFileName}
              onFileUpload={handleUpload(setOriginalText, setOriginalFileName)}
            />
            <VersionInput
              label="Revised Version"
              value={revisedText}
              onChange={setRevisedText}
              fileName={revisedFileName}
              onFileUpload={handleUpload(setRevisedText, setRevisedFileName)}
            />
          </div>

          {error && <div className="redline-error">{error}</div>}

          <button className="analyse-btn" onClick={compare} disabled={loading}>
            {loading ? (
              <>
                <div className="spinner" />
                Comparing…
              </>
            ) : (
              <>🔍 &nbsp;Compare Versions</>
            )}
          </button>

          <div className="disclaimer">
            This tool highlights textual differences and an AI-generated explanation of their
            significance. It is not a substitute for advice from a qualified solicitor —
            always verify substantive changes against the source documents.
          </div>
        </div>
      )}

      {redlineSegments && (
        <div className="redline-results">
          <div className="redline-results-header">
            <div>
              <div className="redline-results-title">Comparison Complete</div>
              <div className="redline-results-sub">
                {originalFileName || "Original"} → {revisedFileName || "Revised"}
              </div>
            </div>
            <button className="dd-reset-btn" onClick={reset}>
              ← Compare another pair
            </button>
          </div>

          <div className="redline-split">
            <div className="redline-view-pane">
              <div className="dd-pane-title">Redline</div>
              <div className="redline-text">
                {redlineSegments.map((part, i) =>
                  part.added ? (
                    <ins key={i} className="redline-added">
                      {part.value}
                    </ins>
                  ) : part.removed ? (
                    <del key={i} className="redline-removed">
                      {part.value}
                    </del>
                  ) : (
                    <span key={i}>{part.value}</span>
                  )
                )}
              </div>
            </div>

            <div className="redline-changes-pane">
              <div className="dd-pane-title">What Changed</div>
              {changesLoading && (
                <div className="redline-loading">Analysing the significance of each change…</div>
              )}
              {changes && changes.length === 0 && !changesLoading && (
                <div className="dd-no-findings">No substantive changes detected.</div>
              )}
              {changes && changes.length > 0 && (
                <div className="redline-changes-list">
                  {changes.map((c, i) => (
                    <div className="redline-change-item" key={i}>
                      <div className="redline-change-what">{c.whatChanged}</div>
                      {c.significance && (
                        <div className="redline-change-significance">{c.significance}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {changes === null && !changesLoading && (
                <div className="dd-no-findings">
                  Couldn't load change explanations — the redline above still shows every
                  textual difference.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
