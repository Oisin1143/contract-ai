import { useState, useRef, useEffect } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');`;

const styles = `
  ${FONTS}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, #root { min-height: 100vh; background: #0a0a0a; font-family: 'DM Sans', sans-serif; color: #e8e0d0; }
  .app { min-height: 100vh; background: #0a0a0a; display: flex; flex-direction: column; }
  .app::before {
    content: ''; position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0; opacity: 0.4;
  }
  header {
    position: relative; z-index: 1; padding: 36px 48px 28px;
    border-bottom: 1px solid rgba(200,180,120,0.15);
    display: flex; align-items: center; justify-content: space-between;
  }
  .logo { display: flex; flex-direction: column; gap: 2px; }
  .logo-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; letter-spacing: 0.02em; color: #e8d98a; }
  .logo-sub { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(232,217,138,0.45); font-weight: 300; }
  .live-badge { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(100,220,120,0.7); border: 1px solid rgba(100,220,120,0.25); padding: 4px 10px; border-radius: 2px; display: flex; align-items: center; gap: 5px; }
  .live-dot { width: 5px; height: 5px; background: #64dc78; border-radius: 50%; animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  main {
    position: relative; z-index: 1;
    display: grid; grid-template-columns: 1fr 1fr; gap: 0;
    max-width: 1400px; width: 100%; margin: 0 auto;
    padding: 48px; align-items: start;
  }
  .left-panel { padding-right: 40px; border-right: 1px solid rgba(200,180,120,0.12); display: flex; flex-direction: column; gap: 28px; position: sticky; top: 24px; }
  .right-panel { padding-left: 40px; display: flex; flex-direction: column; gap: 24px; }
  .dispute-input { display: flex; flex-direction: column; gap: 10px; }
  .dispute-input label { font-size: 13px; letter-spacing: 0.06em; color: rgba(232,224,208,0.6); }
  .dispute-input textarea, .api-field {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(200,180,120,0.18); border-radius: 3px;
    color: #e8e0d0; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 14px 16px;
    resize: vertical; outline: none; transition: border-color 0.2s; width: 100%;
  }
  .dispute-input textarea:focus, .api-field:focus { border-color: rgba(232,217,138,0.45); background: rgba(255,255,255,0.05); }
  .dispute-input textarea::placeholder, .api-field::placeholder { color: rgba(232,224,208,0.25); }
  .contract-box {
    background: rgba(255,255,255,0.02); border: 1px solid rgba(200,180,120,0.15); border-radius: 3px;
    padding: 14px 16px; font-size: 12.5px; line-height: 1.7; color: rgba(232,224,208,0.7);
    min-height: 200px; max-height: 260px; overflow-y: auto;
    white-space: pre-wrap; word-break: break-word; outline: none; transition: border-color 0.2s;
  }
  .contract-box:empty:before { content: attr(data-placeholder); color: rgba(232,224,208,0.22); pointer-events: none; }
  .contract-box:focus { border-color: rgba(232,217,138,0.4); }
  .analyse-btn {
    display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 32px;
    background: linear-gradient(135deg, #c9a84c 0%, #e8d98a 50%, #c9a84c 100%);
    border: none; border-radius: 3px; color: #0a0a0a; font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
    cursor: pointer; transition: opacity 0.2s, transform 0.15s; width: 100%; margin-top: 4px;
  }
  .analyse-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .analyse-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .spinner { width: 16px; height: 16px; border: 2px solid rgba(10,10,10,0.3); border-top-color: #0a0a0a; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; gap: 16px; opacity: 0.3; }
  .empty-icon { font-size: 48px; filter: grayscale(1); }
  .empty-text { font-family: 'Playfair Display', serif; font-size: 16px; color: rgba(232,224,208,0.6); text-align: center; line-height: 1.6; }
  .prob-card { border: 1px solid rgba(232,217,138,0.3); border-radius: 4px; overflow: hidden; background: rgba(232,217,138,0.03); animation: fadeUp 0.4s ease forwards; }
  .prob-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: rgba(232,217,138,0.08); border-bottom: 1px solid rgba(232,217,138,0.15); }
  .prob-title { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 600; color: #e8d98a; }
  .prob-body { padding: 22px 18px; display: flex; flex-direction: column; gap: 18px; }
  .prob-bar-row { display: flex; flex-direction: column; gap: 6px; }
  .prob-bar-label { font-size: 12px; display: flex; justify-content: space-between; align-items: center; color: rgba(232,224,208,0.55); }
  .prob-pct { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 700; }
  .prob-bar-bg { height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
  .prob-bar-fill { height: 100%; border-radius: 4px; transition: width 1.4s cubic-bezier(0.4,0,0.2,1); }
  .prob-reasoning { font-size: 13px; line-height: 1.8; color: rgba(232,224,208,0.6); border-top: 1px solid rgba(200,180,120,0.1); padding-top: 14px; font-style: italic; }
  .result-section { border: 1px solid rgba(200,180,120,0.15); border-radius: 4px; overflow: hidden; animation: fadeUp 0.4s ease forwards; opacity: 0; }
  .result-section:nth-child(2) { animation-delay: 0.07s; }
  .result-section:nth-child(3) { animation-delay: 0.14s; }
  .result-section:nth-child(4) { animation-delay: 0.21s; }
  .result-section:nth-child(5) { animation-delay: 0.28s; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .result-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: rgba(200,168,76,0.07); border-bottom: 1px solid rgba(200,180,120,0.12); }
  .result-icon { font-size: 16px; }
  .result-title { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 600; color: #e8d98a; }
  .result-body { padding: 18px; font-size: 13.5px; line-height: 1.8; color: rgba(232,224,208,0.85); }
  .fmt-numbered { display: flex; flex-direction: column; gap: 18px; }
  .fmt-item { display: flex; flex-direction: column; gap: 5px; }
  .fmt-item-header { display: flex; align-items: baseline; gap: 10px; }
  .fmt-num { font-family: 'Playfair Display', serif; font-size: 13px; color: rgba(232,217,138,0.5); flex-shrink: 0; min-width: 18px; }
  .fmt-bold { font-weight: 600; color: #e8e0d0; font-size: 13.5px; }
  .fmt-body { font-size: 13.5px; line-height: 1.8; color: rgba(232,224,208,0.75); padding-left: 28px; }
  .fmt-plain { font-size: 13.5px; line-height: 1.8; color: rgba(232,224,208,0.85); margin-bottom: 4px; }
  .fmt-party-label { font-family: 'Playfair Display', serif; font-size: 13px; font-weight: 600; color: #e8d98a; margin-top: 14px; margin-bottom: 8px; border-bottom: 1px solid rgba(232,217,138,0.15); padding-bottom: 6px; }
  .risk-pill { display: inline-block; padding: 3px 12px; border-radius: 2px; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-left: auto; }
  .risk-low { background: rgba(100,200,100,0.15); color: #7dd87d; border: 1px solid rgba(100,200,100,0.3); }
  .risk-medium { background: rgba(220,180,60,0.15); color: #e8d98a; border: 1px solid rgba(220,180,60,0.3); }
  .risk-high { background: rgba(220,80,60,0.15); color: #e87d7d; border: 1px solid rgba(220,80,60,0.3); }
  .disclaimer { font-size: 11px; color: rgba(232,224,208,0.25); letter-spacing: 0.04em; text-align: center; padding: 12px 0 0; border-top: 1px solid rgba(200,180,120,0.08); line-height: 1.7; }
  @media (max-width: 900px) {
    main { grid-template-columns: 1fr; padding: 24px; }
    .left-panel { padding-right: 0; border-right: none; border-bottom: 1px solid rgba(200,180,120,0.12); padding-bottom: 32px; position: static; }
    .right-panel { padding-left: 0; padding-top: 32px; }
    header { padding: 24px; }
  }
`;

// ── Render formatted text: strips **, formats numbered points ──
function FormattedText({ text }) {
  if (!text) return null;
  // Force Claimant/Defendant labels onto their own lines
  const cleaned = text
    .replace(/\*\*(Claimant[^*]*)\*\*:?/gi, "\n**$1**\n")
    .replace(/\*\*(Defendant[^*]*)\*\*:?/gi, "\n**$1**\n")
    .replace(/\n{3,}/g, "\n\n");
  const lines = cleaned.split("\n").filter(l => l.trim() !== "");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (/^\*\*(claimant|defendant)[^*]*\*\*$/i.test(line)) {
      elements.push(<div key={i} className="fmt-party-label">{line.replace(/\*\*/g, "").replace(/:$/, "")}</div>);
      i++; continue;
    }
    const numberedMatch = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*[:\s]*(.*)/);
    if (numberedMatch) {
      const [, num, title, inline] = numberedMatch;
      const nextLine = lines[i+1] && !/^\d+\./.test(lines[i+1].trim()) && !/^\*\*(claimant|defendant)/i.test(lines[i+1].trim()) ? lines[i+1].trim() : null;
      const body = inline.trim() ? inline.trim() : (nextLine || "");
      const skipNext = !inline.trim() && nextLine;
      elements.push(
        <div key={i} className="fmt-item">
          <div className="fmt-item-header">
            <span className="fmt-num">{num}.</span>
            <span className="fmt-bold">{title.replace(/:$/, "")}</span>
          </div>
          {body && <div className="fmt-body">{body.replace(/\*\*/g, "")}</div>}
        </div>
      );
      i += skipNext ? 2 : 1; continue;
    }
    const boldOnly = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
    if (boldOnly) {
      const [, title, rest] = boldOnly;
      elements.push(
        <div key={i} className="fmt-item">
          <span className="fmt-bold">{title.replace(/:$/, "")}</span>
          {rest && <div className="fmt-body">{rest.replace(/\*\*/g, "")}</div>}
        </div>
      );
      i++; continue;
    }
    elements.push(<div key={i} className="fmt-plain">{line.replace(/\*/g, "")}</div>);
    i++;
  }
  return <div className="fmt-numbered">{elements}</div>;
}

const SECTIONS = [
  { key: "issues",    icon: "⚖️",  title: "Key Legal Issues & Breach" },
  { key: "arguments", icon: "🗣️",  title: "Arguments for Both Sides" },
  { key: "caselaw",   icon: "📚",  title: "Relevant UK Case Law & Statutes" },
  { key: "outcome",   icon: "🎯",  title: "Likely Outcome & Risk Assessment" },
];

function getRiskLevel(text) {
  const t = text.toLowerCase();
  if (t.includes("high risk")) return "high";
  if (t.includes("low risk")) return "low";
  return "medium";
}

function parseSection(fullText, heading) {
  const regex = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = fullText.match(regex);
  return match ? match[1].trim() : "";
}

function parseProbability(fullText) {
  const cMatch = fullText.match(/Claimant win probability:\s*(\d+)%/i);
  const dMatch = fullText.match(/Defendant win probability:\s*(\d+)%/i);
  const rMatch = fullText.match(/Reasoning:\s*([\s\S]+?)(?=\n##|$)/i);
  if (!cMatch) return null;
  return {
    claimant:  parseInt(cMatch[1]),
    defendant: dMatch ? parseInt(dMatch[1]) : 100 - parseInt(cMatch[1]),
    reasoning: rMatch ? rMatch[1].replace(/\*\*/g, "").trim() : "",
  };
}

function getProbColor(pct) {
  if (pct >= 60) return "#7dd87d";
  if (pct >= 40) return "#e8d98a";
  return "#e87d7d";
}

export default function App() {
  const [contractText, setContractText] = useState("");
  const [disputeDesc,  setDisputeDesc]  = useState("");
  const [results,      setResults]      = useState(null);
  const [probability,  setProbability]  = useState(null);
  const [bailiiLinks,  setBailiiLinks]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingStep,  setLoadingStep]  = useState("");
  const [error,        setError]        = useState("");
  const [animPct,      setAnimPct]      = useState({ claimant: 0, defendant: 0 });
  const contractRef = useRef(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (probability) {
      setTimeout(() => setAnimPct({ claimant: probability.claimant, defendant: probability.defendant }), 150);
    } else {
      setAnimPct({ claimant: 0, defendant: 0 });
    }
  }, [probability]);

  const analyse = async () => {
    if (!contractText.trim()) return setError("Please paste the contract text.");
    if (!disputeDesc.trim())  return setError("Please describe the dispute.");

    setError("");
    setLoading(true);
    setResults(null);
    setProbability(null);
    setBailiiLinks([]);
    setLoadingStep("Contacting server…");

    const prompt = `You are a senior UK contract law barrister. Analyse the contract and dispute below thoroughly.

CONTRACT TEXT:
"""
${contractText}
"""

DISPUTE DESCRIPTION:
"""
${disputeDesc}
"""

Provide your COMPLETE analysis using EXACTLY these headings:

## KEY LEGAL ISSUES & BREACH
List all key legal issues as numbered points:
1. **Issue Title:** Full explanation specific to the contract clauses.

## ARGUMENTS FOR BOTH SIDES
**Claimant:**
1. **Argument Title:** Full explanation referencing specific contract clauses.

**Defendant:**
1. **Argument Title:** Full explanation.

## RELEVANT UK CASE LAW & STATUTES
1. **Case/Statute [citation]:** How it applies to this dispute.

## LIKELY OUTCOME & RISK ASSESSMENT
1. **Factor:** Explanation. State HIGH RISK, MEDIUM RISK, or LOW RISK for the claimant.

## OVERALL PROBABILITY
Claimant win probability: [X]%
Defendant win probability: [Y]%
Reasoning: [2-3 sentences explaining the split based on the strength of arguments and applicable UK case law.]`;

    try {
      // ── Call our secure backend — API key never touches the browser ──
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${backendUrl}/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText, disputeDesc }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error || `Server error ${response.status}`);
      }

      const data = await response.json();
      const fullText = data.result || "";

      

      setLoadingStep("Parsing analysis…");

      setResults({
        issues:    parseSection(fullText, "KEY LEGAL ISSUES & BREACH"),
        arguments: parseSection(fullText, "ARGUMENTS FOR BOTH SIDES"),
        caselaw:   parseSection(fullText, "RELEVANT UK CASE LAW & STATUTES"),
        outcome:   parseSection(fullText, "LIKELY OUTCOME & RISK ASSESSMENT"),
      });
      setProbability(parseProbability(fullText));
      setBailiiLinks(data.bailiiLinks || []);

    } catch (e) {
      console.error(e);
      setError("Error: " + e.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="app">
      <header>
        <div className="logo">
          <div className="logo-title">Unknown</div>
          <div className="logo-sub">Contract Dispute Analyser · UK Law</div>
        </div>
        <div className="live-badge"><div className="live-dot" />Groq AI · UK Law</div>
      </header>

      <main>
        {/* LEFT */}
        <div className="left-panel">
          <div className="dispute-input">
            <label>Paste the full contract text</label>
            <div
              className="contract-box"
              contentEditable
              suppressContentEditableWarning
              ref={contractRef}
              data-placeholder="Paste contract here…"
              onInput={e => setContractText(e.currentTarget.textContent)}
            />
          </div>

          <div className="dispute-input">
            <label>Describe the dispute</label>
            <textarea
              rows={4}
              placeholder="e.g. Party A claims Party B failed to deliver by 15 March 2024, causing £40,000 loss…"
              value={disputeDesc}
              onChange={e => setDisputeDesc(e.target.value)}
            />
          </div>

          {error && <div style={{ color: "#e87d7d", fontSize: 13 }}>{error}</div>}

          <button className="analyse-btn" onClick={analyse} disabled={loading}>
            {loading ? <><div className="spinner" />{loadingStep || "Analysing…"}</> : <>⚖️ &nbsp;Analyse Contract Dispute</>}
          </button>

          <div className="disclaimer">
            This tool is intended to assist with legal research and analysis only. It does not constitute legal advice and should not be relied upon as a substitute for consultation with a qualified solicitor or barrister.<br /><br />
            By submitting contract text you confirm it does not contain unlawful content and that you accept full responsibility for the information provided.<br /><br />
            Contract text entered into this tool is processed by third party AI servers. Do not submit confidential or sensitive documents.
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-panel">
          {!results && !loading && (
            <div className="empty-state">
              <div className="empty-icon">⚖️</div>
              <div className="empty-text">Paste a contract and describe<br />the dispute to begin analysis</div>
            </div>
          )}

          {loading && (
            <div className="empty-state" style={{ opacity: 0.6 }}>
              <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: "rgba(232,217,138,0.2)", borderTopColor: "#e8d98a" }} />
              <div className="empty-text">{loadingStep}</div>
            </div>
          )}

          {probability && (
            <div className="prob-card">
              <div className="prob-header">
                <span style={{ fontSize: 16 }}>📊</span>
                <span className="prob-title">Overall Win Probability</span>
              </div>
              <div className="prob-body">
                {[
                  { label: "Claimant",  pct: animPct.claimant },
                  { label: "Defendant", pct: animPct.defendant },
                ].map(({ label, pct }) => (
                  <div className="prob-bar-row" key={label}>
                    <div className="prob-bar-label">
                      <span>{label}</span>
                      <span className="prob-pct" style={{ color: getProbColor(pct) }}>{pct}%</span>
                    </div>
                    <div className="prob-bar-bg">
                      <div className="prob-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${getProbColor(pct)}99, ${getProbColor(pct)})` }} />
                    </div>
                  </div>
                ))}
                {probability.reasoning && (
                  <div className="prob-reasoning">{probability.reasoning}</div>
                )}
              </div>
            </div>
          )}

          {results && SECTIONS.map(({ key, icon, title }) => {
            const text = results[key] || "";
            const isOutcome = key === "outcome";
            const risk = isOutcome ? getRiskLevel(text) : null;
            if (!text) return null;
            return (
              <div className="result-section" key={key}>
                <div className="result-header">
                  <span className="result-icon">{icon}</span>
                  <span className="result-title">{title}</span>
                  {isOutcome && risk && <span className={`risk-pill risk-${risk}`}>{risk} risk</span>}
                </div>
                <div className="result-body">
                  <FormattedText text={text} />
                </div>
                {key === "caselaw" && bailiiLinks.length > 0 && (
                  <div className="sources-box">
                    <div className="sources-title">🏛️ Verify on BAILII</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                      {bailiiLinks.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noreferrer" style={{
                          display: "inline-block",
                          padding: "5px 12px",
                          border: "1px solid rgba(100,220,160,0.3)",
                          borderRadius: "3px",
                          fontSize: "12px",
                          color: "rgba(100,220,160,0.8)",
                          textDecoration: "none",
                          background: "rgba(100,220,120,0.05)",
                          transition: "all 0.15s",
                        }}>
                          {link.name} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}