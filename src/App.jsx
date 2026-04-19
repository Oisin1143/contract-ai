import { useState, useRef, useEffect } from "react";
import DueDiligence from "./DueDiligence";
import "./DueDiligence.css";
import AuthButton from "./AuthButton";
import MyCases from "./MyCases";
import { supabase } from "./supabase";

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
  .ml-card { border: 1px solid rgba(125,191,232,0.4); border-radius: 4px; padding: 18px 20px; background: rgba(125,191,232,0.04); display: flex; flex-direction: column; gap: 14px; animation: fadeUp 0.4s ease forwards; }
  .ml-header { display: flex; align-items: center; gap: 10px; }
  .ml-badge { font-size: 9px; letter-spacing: 0.18em; padding: 3px 8px; border: 1px solid rgba(125,191,232,0.5); border-radius: 2px; color: #7dbfe8; font-weight: 600; }
  .ml-title { font-family: 'Playfair Display', serif; font-size: 16px; color: #e8d98a; }
  .ml-sub { font-size: 12px; line-height: 1.5; color: rgba(232,224,208,0.65); }
  .ml-bars { display: flex; flex-direction: column; gap: 10px; }
  .ml-bar-row { display: flex; flex-direction: column; gap: 4px; }
  .ml-bar-label { display: flex; justify-content: space-between; font-size: 12px; color: rgba(232,224,208,0.75); }
  .ml-pct { font-weight: 600; }
  .ml-bar-bg { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
  .ml-bar-fill { height: 100%; transition: width 0.6s ease; }
  .ml-features { padding-top: 12px; border-top: 1px solid rgba(200,180,120,0.1); }
  .ml-features-title { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(232,217,138,0.5); margin-bottom: 8px; }
  .ml-feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .ml-feature { display: flex; flex-direction: column; gap: 2px; }
  .ml-feature-wide { grid-column: 1 / -1; }
  .ml-feature-key { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(232,224,208,0.45); }
  .ml-feature-val { font-size: 12.5px; color: #e8e0d0; }
  .ml-disclaimer { font-size: 10.5px; font-style: italic; color: rgba(232,224,208,0.4); padding-top: 8px; border-top: 1px solid rgba(200,180,120,0.08); }
  .divergence-strip { border: 1px solid rgba(232,200,125,0.45); border-left: 3px solid #e8c87d; border-radius: 4px; padding: 14px 18px; background: rgba(232,200,125,0.06); display: flex; flex-direction: column; gap: 8px; animation: fadeUp 0.4s ease forwards; }
  .div-header { display: flex; align-items: center; gap: 10px; }
  .div-icon { font-size: 14px; }
  .div-title { font-family: 'Playfair Display', serif; font-size: 14px; color: #e8c87d; letter-spacing: 0.02em; font-weight: 600; }
  .div-body { font-size: 12.5px; line-height: 1.55; color: rgba(232,224,208,0.85); }

  /* ── Header: right-side grouping ─────────────────── */
  .header-right { display: flex; align-items: center; gap: 14px; }

  /* ── Auth button ─────────────────────────────────── */
  .auth-btn-in { display: flex; align-items: center; gap: 8px; padding: 7px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(200,180,120,0.25); border-radius: 3px; color: #e8e0d0; font-family: 'DM Sans', sans-serif; font-size: 12px; letter-spacing: 0.06em; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
  .auth-btn-in:hover { border-color: rgba(232,217,138,0.55); background: rgba(255,255,255,0.06); }
  .auth-wrap { position: relative; }
  .auth-avatar-btn { padding: 0; background: transparent; border: 1px solid rgba(200,180,120,0.3); border-radius: 50%; cursor: pointer; width: 34px; height: 34px; overflow: hidden; transition: border-color 0.15s; }
  .auth-avatar-btn:hover { border-color: rgba(232,217,138,0.65); }
  .auth-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .auth-avatar-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #c9a84c, #e8d98a); color: #0a0a0a; font-weight: 700; font-size: 13px; font-family: 'Playfair Display', serif; }
  .auth-menu { position: absolute; top: calc(100% + 8px); right: 0; min-width: 220px; background: #0f0f0f; border: 1px solid rgba(200,180,120,0.25); border-radius: 3px; padding: 6px; z-index: 50; box-shadow: 0 14px 30px rgba(0,0,0,0.5); }
  .auth-menu-email { padding: 10px 12px 8px; font-size: 11.5px; color: rgba(232,224,208,0.55); letter-spacing: 0.02em; word-break: break-all; }
  .auth-menu-divider { height: 1px; background: rgba(200,180,120,0.12); margin: 4px 0; }
  .auth-menu-item { width: 100%; padding: 10px 12px; background: transparent; border: none; text-align: left; color: #e8e0d0; font-family: 'DM Sans', sans-serif; font-size: 12.5px; cursor: pointer; border-radius: 2px; transition: background 0.12s; }
  .auth-menu-item:hover { background: rgba(232,217,138,0.08); color: #e8d98a; }

  /* ── Save Case button ────────────────────────────── */
  .save-case-row { display: flex; justify-content: flex-end; }
  .save-case-hint { justify-content: center; font-size: 12px; color: rgba(232,224,208,0.5); font-style: italic; padding: 4px 0; }
  .save-case-btn { padding: 10px 20px; background: rgba(125,191,232,0.08); border: 1px solid rgba(125,191,232,0.4); border-radius: 3px; color: #7dbfe8; font-family: 'DM Sans', sans-serif; font-size: 11.5px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
  .save-case-btn:hover:not(:disabled) { background: rgba(125,191,232,0.15); border-color: rgba(125,191,232,0.65); }
  .save-case-btn:disabled { opacity: 0.7; cursor: not-allowed; }

  /* ── MyCases view ────────────────────────────────── */
  .mc-root { max-width: 980px; margin: 0 auto; padding: 40px 48px 80px; position: relative; z-index: 1; }
  .mc-header { display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 22px; border-bottom: 1px solid rgba(200,180,120,0.12); margin-bottom: 26px; }
  .mc-title { font-family: 'Playfair Display', serif; font-size: 28px; color: #e8d98a; letter-spacing: 0.01em; }
  .mc-sub { font-size: 12px; letter-spacing: 0.08em; color: rgba(232,224,208,0.5); margin-top: 4px; }
  .mc-refresh { padding: 8px 14px; background: transparent; border: 1px solid rgba(200,180,120,0.25); border-radius: 3px; color: rgba(232,217,138,0.75); font-family: 'DM Sans', sans-serif; font-size: 11.5px; letter-spacing: 0.08em; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
  .mc-refresh:hover:not(:disabled) { border-color: rgba(232,217,138,0.55); color: #e8d98a; }
  .mc-refresh:disabled { opacity: 0.5; cursor: wait; }
  .mc-error { padding: 12px 16px; background: rgba(232,125,125,0.08); border: 1px solid rgba(232,125,125,0.3); border-radius: 3px; color: #f0a8a8; font-size: 13px; margin-bottom: 16px; }
  .mc-empty { padding: 70px 20px; text-align: center; color: rgba(232,224,208,0.55); border: 1px dashed rgba(200,180,120,0.2); border-radius: 3px; }
  .mc-empty-icon { font-size: 38px; margin-bottom: 14px; }
  .mc-empty-title { font-family: 'Playfair Display', serif; font-size: 18px; color: #e8d98a; margin-bottom: 8px; }
  .mc-empty-sub { font-size: 13px; line-height: 1.6; max-width: 440px; margin: 0 auto; }
  .mc-list { display: flex; flex-direction: column; gap: 10px; }
  .mc-item { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 18px; background: rgba(255,255,255,0.02); border: 1px solid rgba(200,180,120,0.12); border-radius: 3px; transition: border-color 0.15s, background 0.15s; }
  .mc-item:hover { border-color: rgba(232,217,138,0.3); background: rgba(255,255,255,0.035); }
  .mc-item-main { flex: 1; min-width: 0; cursor: pointer; }
  .mc-item-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .mc-badge { font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; padding: 2px 8px; border-radius: 2px; font-weight: 600; }
  .mc-badge-dispute { background: rgba(201,168,76,0.15); color: #e8d98a; border: 1px solid rgba(232,217,138,0.3); }
  .mc-badge-dd { background: rgba(125,191,232,0.15); color: #7dbfe8; border: 1px solid rgba(125,191,232,0.3); }
  .mc-item-date { font-size: 11px; color: rgba(232,224,208,0.45); letter-spacing: 0.04em; }
  .mc-item-title { font-size: 14px; color: #e8e0d0; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mc-item-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .mc-open-btn { padding: 7px 14px; background: rgba(232,217,138,0.08); border: 1px solid rgba(232,217,138,0.35); border-radius: 2px; color: #e8d98a; font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; transition: background 0.15s; }
  .mc-open-btn:hover { background: rgba(232,217,138,0.18); }
  .mc-delete-btn { width: 32px; height: 32px; background: transparent; border: 1px solid rgba(200,180,120,0.2); border-radius: 2px; color: rgba(232,224,208,0.4); cursor: pointer; transition: border-color 0.15s, color 0.15s; font-size: 14px; }
  .mc-delete-btn:hover { border-color: rgba(232,125,125,0.5); color: #e87d7d; }
  .arb-nav { display: flex; gap: 2px; border: 1px solid rgba(200,180,120,0.18); border-radius: 3px; overflow: hidden; }
  .arb-nav-btn { padding: 8px 16px; background: transparent; border: none; color: rgba(232,224,208,0.5); font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; transition: background 0.15s, color 0.15s; }
  .arb-nav-btn:hover { background: rgba(255,255,255,0.04); color: #e8e0d0; }
  .arb-nav-btn.active { background: linear-gradient(135deg, rgba(201,168,76,0.18), rgba(232,217,138,0.18)); color: #e8d98a; }
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
  const [view,         setView]         = useState("dispute"); // "dispute" | "dd" | "mycases"
  const [user,         setUser]         = useState(null);
  const [saveStatus,   setSaveStatus]   = useState(""); // "", "saving", "saved", "error"
  const [contractText, setContractText] = useState("");
  const [disputeDesc,  setDisputeDesc]  = useState("");
  const [results,      setResults]      = useState(null);
  const [probability,  setProbability]  = useState(null);
  const [bailiiLinks,  setBailiiLinks]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [loadingStep,  setLoadingStep]  = useState("");
  const [error,        setError]        = useState("");
  const [animPct,      setAnimPct]      = useState({ claimant: 0, defendant: 0 });
  const [mlPrediction, setMlPrediction] = useState(null);
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

  // ── Auth: subscribe to sign-in / sign-out events ──
  useEffect(() => {
    if (!supabase) return;
    // Load current session on mount
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
    // Subscribe to future changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Save the current dispute analysis to Supabase ──
  const saveDisputeCase = async () => {
    if (!supabase || !user) return;
    if (!results || !probability) return;
    setSaveStatus("saving");
    // Derive a friendly title: first 60 chars of the dispute
    const title = disputeDesc.trim().slice(0, 60) + (disputeDesc.length > 60 ? "…" : "");
    const { error: insErr } = await supabase.from("saved_cases").insert({
      user_id: user.id,
      case_type: "dispute",
      title,
      input_data: { contractText, disputeDesc },
      result_data: { results, probability, bailiiLinks, mlPrediction },
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

  // ── Load a saved case back into the appropriate view ──
  const openSavedCase = (saved) => {
    if (saved.case_type === "dispute") {
      const ct = saved.input_data?.contractText || "";
      setContractText(ct);
      setDisputeDesc(saved.input_data?.disputeDesc || "");
      setResults(saved.result_data?.results || null);
      setProbability(saved.result_data?.probability || null);
      setBailiiLinks(saved.result_data?.bailiiLinks || []);
      setMlPrediction(saved.result_data?.mlPrediction || null);
      setView("dispute");
      // The contract input is a contentEditable div, not a textarea — React
      // state alone doesn't populate its visible content. Write directly via
      // the ref on the next tick (after the view has switched).
      setTimeout(() => {
        if (contractRef.current) contractRef.current.textContent = ct;
      }, 0);
    } else if (saved.case_type === "dd") {
      // Switch to DD and pass the saved payload via sessionStorage — the
      // DD component reads it on mount (see DueDiligence.jsx change).
      try {
        sessionStorage.setItem(
          "arbitrer_dd_restore",
          JSON.stringify(saved)
        );
      } catch { /* sessionStorage disabled — user will see empty state */ }
      setView("dd");
    }
  };

  const analyse = async () => {
    if (!contractText.trim()) return setError("Please paste the contract text.");
    if (!disputeDesc.trim())  return setError("Please describe the dispute.");

    setError("");
    setLoading(true);
    setResults(null);
    setProbability(null);
    setMlPrediction(null);
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
      // ── Fire LLM analysis + ML prediction in PARALLEL ──
      // The ML call typically returns in <500ms; the LLM call takes
      // 3-10s. We don't make the user wait sequentially.
      const llmPromise = fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText, disputeDesc }),
      });
      const mlPromise = fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractText, disputeDesc }),
      }).catch(() => null); // ML failures are non-fatal — UI still works

      const response = await llmPromise;

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

      // Resolve the ML prediction (may already be done)
      const mlResponse = await mlPromise;
      if (mlResponse && mlResponse.ok) {
        try {
          const mlData = await mlResponse.json();
          setMlPrediction(mlData);
        } catch {
          // ignore parse failures — non-fatal
        }
      }

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
          <div className="logo-title">ARBITRER</div>
          <div className="logo-sub">
            {view === "dispute"
              ? "Contract Dispute Analyser · UK Law"
              : view === "dd"
              ? "Contract Due Diligence · UK Law"
              : "Saved Cases"}
          </div>
        </div>
        <div className="arb-nav">
          <button
            className={`arb-nav-btn ${view === "dispute" ? "active" : ""}`}
            onClick={() => setView("dispute")}
          >
            Dispute Analyser
          </button>
          <button
            className={`arb-nav-btn ${view === "dd" ? "active" : ""}`}
            onClick={() => setView("dd")}
          >
            Due Diligence
          </button>
          {user && (
            <button
              className={`arb-nav-btn ${view === "mycases" ? "active" : ""}`}
              onClick={() => setView("mycases")}
            >
              My Cases
            </button>
          )}
        </div>
        <div className="header-right">
          <div className="live-badge"><div className="live-dot" />Groq AI · UK Law</div>
          {supabase && <AuthButton user={user} />}
        </div>
      </header>

      {view === "dd" && <DueDiligence user={user} />}
      {view === "mycases" && <MyCases user={user} onOpen={openSavedCase} />}

      {view === "dispute" && (
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
                <span className="prob-title">Legal Merits Assessment</span>
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

          {mlPrediction && probability && (() => {
            // Compare LLM vs ML claimant probability — surface the gap
            const llmClaimant = probability.claimant;
            const mlClaimant  = mlPrediction.claimant_probability;
            const delta = Math.abs(llmClaimant - mlClaimant);
            if (delta < 15) return null;

            const llmFavours = llmClaimant > 50 ? "claimant" : "defendant";
            const mlFavours  = mlClaimant  > 50 ? "claimant" : "defendant";
            const sameDirection = llmFavours === mlFavours;

            return (
              <div className="divergence-strip">
                <div className="div-header">
                  <span className="div-icon">⚠️</span>
                  <span className="div-title">Notable divergence: {delta.toFixed(1)} points</span>
                </div>
                <div className="div-body">
                  {sameDirection ? (
                    <>Both signals favour the <strong>{llmFavours}</strong>, but the strength of conviction differs significantly. Treat the prediction as directional rather than precise.</>
                  ) : (
                    <>The <strong>legal merits</strong> favour the <strong>{llmFavours}</strong>, but historically <strong>{mlFavours}s win</strong> in cases with this profile. Cases like this often settle rather than going to judgment — the litigation risk is real even when the argument is strong.</>
                  )}
                </div>
              </div>
            );
          })()}

          {mlPrediction && (
            <div className="ml-card">
              <div className="ml-header">
                <span className="ml-badge">🧠 ML MODEL</span>
                <span className="ml-title">Historical Outcome Pattern</span>
              </div>
              <div className="ml-sub">
                Based on <strong>{mlPrediction.model.training_cases.toLocaleString()}</strong> UK contract dispute judgments scraped from BAILII. Model accuracy on a held-out test set: <strong>{Math.round(mlPrediction.model.training_accuracy * 100)}%</strong>.
              </div>
              <div className="ml-bars">
                {[
                  { label: "Claimant",  pct: mlPrediction.claimant_probability },
                  { label: "Defendant", pct: mlPrediction.defendant_probability },
                ].map(({ label, pct }) => (
                  <div className="ml-bar-row" key={label}>
                    <div className="ml-bar-label">
                      <span>{label}</span>
                      <span className="ml-pct" style={{ color: getProbColor(pct) }}>{pct}%</span>
                    </div>
                    <div className="ml-bar-bg">
                      <div className="ml-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${getProbColor(pct)}99, ${getProbColor(pct)})` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="ml-features">
                <div className="ml-features-title">What the model detected</div>
                <div className="ml-feature-grid">
                  <div className="ml-feature">
                    <span className="ml-feature-key">Breach type</span>
                    <span className="ml-feature-val">{mlPrediction.detected_features.breach_type}</span>
                  </div>
                  <div className="ml-feature">
                    <span className="ml-feature-key">Contract type</span>
                    <span className="ml-feature-val">{mlPrediction.detected_features.contract_type}</span>
                  </div>
                  {mlPrediction.detected_features.damages_claimed_gbp > 0 && (
                    <div className="ml-feature">
                      <span className="ml-feature-key">Damages claimed</span>
                      <span className="ml-feature-val">£{mlPrediction.detected_features.damages_claimed_gbp.toLocaleString()}</span>
                    </div>
                  )}
                  {mlPrediction.detected_features.clauses_detected.length > 0 && (
                    <div className="ml-feature ml-feature-wide">
                      <span className="ml-feature-key">Clauses detected</span>
                      <span className="ml-feature-val">{mlPrediction.detected_features.clauses_detected.join(" · ")}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-disclaimer">
                Statistical baseline trained on historical case patterns. Not legal advice.
              </div>
            </div>
          )}

          {results && user && (
            <div className="save-case-row">
              <button
                className="save-case-btn"
                onClick={saveDisputeCase}
                disabled={saveStatus === "saving" || saveStatus === "saved"}
              >
                {saveStatus === "saving" && "Saving…"}
                {saveStatus === "saved"  && "✓ Saved to My Cases"}
                {saveStatus === "error"  && "Error — try again"}
                {!saveStatus             && "💾 Save to My Cases"}
              </button>
            </div>
          )}

          {results && !user && supabase && (
            <div className="save-case-row save-case-hint">
              Sign in at the top right to save this analysis to your account.
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
      )}
    </div>
  );
}