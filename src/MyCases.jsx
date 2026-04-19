// src/MyCases.jsx
// Renders the user's saved cases. Supports re-opening (loads the case
// back into the relevant analyser) and deleting. All queries go through
// Row-Level Security so users only ever see their own data.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function MyCases({ user, onOpen }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    setError("");
    const { data, error: qErr } = await supabase
      .from("saved_cases")
      .select("id, case_type, title, created_at, input_data, result_data")
      .order("created_at", { ascending: false });
    if (qErr) setError(qErr.message);
    else setCases(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this saved case? This cannot be undone.")) return;
    const { error: dErr } = await supabase
      .from("saved_cases")
      .delete()
      .eq("id", id);
    if (dErr) {
      setError(dErr.message);
      return;
    }
    setCases((cs) => cs.filter((c) => c.id !== id));
  };

  if (!user) {
    return (
      <div className="mc-root">
        <div className="mc-empty">
          <div className="mc-empty-icon">🔒</div>
          <div className="mc-empty-title">Sign in to access saved cases</div>
          <div className="mc-empty-sub">
            Use the Sign in button at the top right to log in with Google.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-root">
      <div className="mc-header">
        <div>
          <div className="mc-title">My Cases</div>
          <div className="mc-sub">
            {cases.length} saved {cases.length === 1 ? "analysis" : "analyses"}
          </div>
        </div>
        <button className="mc-refresh" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {error && <div className="mc-error">{error}</div>}

      {!loading && cases.length === 0 && (
        <div className="mc-empty">
          <div className="mc-empty-icon">📂</div>
          <div className="mc-empty-title">No saved cases yet</div>
          <div className="mc-empty-sub">
            Run an analysis in Dispute Analyser or Due Diligence, then click{" "}
            <em>Save Case</em> on the results.
          </div>
        </div>
      )}

      {cases.length > 0 && (
        <div className="mc-list">
          {cases.map((c) => (
            <div key={c.id} className="mc-item">
              <div className="mc-item-main" onClick={() => onOpen(c)}>
                <div className="mc-item-header">
                  <span
                    className={`mc-badge mc-badge-${c.case_type}`}
                  >
                    {c.case_type === "dispute" ? "Dispute" : "Due Diligence"}
                  </span>
                  <span className="mc-item-date">
                    {new Date(c.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="mc-item-title">{c.title}</div>
              </div>
              <div className="mc-item-actions">
                <button
                  className="mc-open-btn"
                  onClick={() => onOpen(c)}
                  title="Open this case"
                >
                  Open
                </button>
                <button
                  className="mc-delete-btn"
                  onClick={() => handleDelete(c.id)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}