// src/NegotiateSimulator.jsx
// Interactive negotiation practice: an AI "opposing counsel" pushes back
// on a flagged clause in character, and the user negotiates with it across
// several turns. Same props/overlay conventions as NegotiateModal, but a
// live back-and-forth instead of a one-shot generation.

import { useState, useEffect, useRef } from "react";

export default function NegotiateSimulator({
  finding,            // { issue, passage_excerpt, explanation, recommendation }
  mode,               // "presigning" | "ma"
  contractType,       // optional category context
  onClose,
}) {
  const [messages, setMessages] = useState([]); // [{ role: "user"|"counsel", content }]
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(true); // true while the opening message loads
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const clause = finding.passage_excerpt || finding.issue;

  const sendTurn = async (nextMessages) => {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/negotiate-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clause,
          issue: finding.issue,
          explanation: finding.explanation,
          mode,
          contractType,
          messages: nextMessages,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setMessages([...nextMessages, { role: "counsel", content: data.reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  // Seed the conversation with an opening reaction from opposing counsel
  useEffect(() => {
    sendTurn([
      {
        role: "user",
        content:
          "I'd like to negotiate this clause. Please open with your position on why it should stay as drafted.",
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const send = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    sendTurn([...messages, { role: "user", content: text }]);
  };

  return (
    <div className="neg-overlay" onClick={onClose}>
      <div className="neg-modal sim-modal" onClick={(e) => e.stopPropagation()}>
        <div className="neg-header">
          <div>
            <div className="neg-eyebrow">Negotiation Simulator</div>
            <div className="neg-title">{finding.issue}</div>
          </div>
          <button className="neg-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="neg-original">
          <div className="neg-section-label">Clause under negotiation</div>
          <div className="neg-original-text">
            {finding.passage_excerpt || (
              <em>No verbatim excerpt available — using issue summary.</em>
            )}
          </div>
        </div>

        <div className="sim-chat" ref={scrollRef}>
          {messages
            .filter((_, i) => i > 0) // hide the synthetic opening prompt
            .map((m, i) => (
              <div key={i} className={`sim-bubble-row sim-bubble-row-${m.role}`}>
                {m.role === "counsel" && <div className="sim-bubble-label">Opposing Counsel</div>}
                <div className={`sim-bubble sim-bubble-${m.role}`}>{m.content}</div>
              </div>
            ))}
          {sending && (
            <div className="sim-bubble-row sim-bubble-row-counsel">
              <div className="sim-bubble-label">Opposing Counsel</div>
              <div className="sim-bubble sim-bubble-counsel sim-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="neg-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="sim-input-row">
          <textarea
            className="sim-input"
            rows={2}
            placeholder="Propose your redline or push back on their position…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={sending}
          />
          <button className="sim-send-btn" onClick={send} disabled={sending || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
