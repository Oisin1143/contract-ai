// api/_lib/bailii.js
// Shared helper for turning a case name into a BAILII search link.
// We only ever build a *search* URL (never a guessed direct case URL) so an
// LLM-hallucinated case name fails safe — the user always lands on a real,
// verifiable BAILII search rather than a broken/misleading deep link.

export function buildBailiiSearchUrl(caseName) {
  return `https://www.bailii.org/cgi-bin/lucy_search_1.cgi?query=${encodeURIComponent(
    caseName
  )}&method=boolean&mask_path=uk%2Fcases%2FEWCA+uk%2Fcases%2FEWHC+uk%2Fcases%2FUKSC+uk%2Fcases%2FUKHL`;
}
