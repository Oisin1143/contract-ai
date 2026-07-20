// api/_lib/llmErrors.js
// Raw rate-limit error text from Groq or OpenAI is accurate but not
// something a user should see mid-review — it names internal org IDs and
// service tiers, and reads as a crash rather than "try again shortly."
// This only surfaces once callLLM (api/_lib/llm.js) has already tried
// falling over to the secondary provider and that failed too, so by the
// time a route reaches this, both providers are genuinely unavailable.

export function friendlyLLMError(rawMessage) {
  const msg = String(rawMessage || "");
  if (!/rate limit/i.test(msg)) return msg;

  const m = msg.match(/try again in (?:(\d+)m)?([\d.]+)(ms|s)\b/i);
  if (!m) return "This app is briefly rate-limited — please try again shortly.";

  const minutes = m[1] ? parseFloat(m[1]) : 0;
  const value = parseFloat(m[2]);
  const unit = m[3].toLowerCase();
  const totalSeconds = minutes * 60 + (unit === "s" ? value : value / 1000);

  if (/tokens per day|TPD/i.test(msg)) {
    const mins = Math.ceil(totalSeconds / 60);
    return `This app has hit its free daily usage limit. Please try again in about ${mins} minute${mins === 1 ? "" : "s"}.`;
  }
  if (totalSeconds < 10) {
    return "Momentarily busy — please try again in a few seconds.";
  }
  if (totalSeconds < 60) {
    return `Briefly rate-limited — please try again in about ${Math.ceil(totalSeconds)}s.`;
  }
  const mins = Math.ceil(totalSeconds / 60);
  return `Rate limited — please try again in about ${mins} minute${mins === 1 ? "" : "s"}.`;
}
