// src/diffContracts.js
// Client-side word-level diff between two contract versions. Deterministic
// and free — no LLM involved in computing the diff itself, since LLMs are
// unreliable at exact text comparison. The LLM is only used downstream
// (api/redline-summary.js) to explain the significance of the changes a
// real diff algorithm already found.

import { diffWordsWithSpace } from "diff";

/**
 * @param {string} original
 * @param {string} revised
 * @returns {Array<{ value: string, added?: boolean, removed?: boolean }>}
 */
export function buildRedlineSegments(original, revised) {
  return diffWordsWithSpace(original || "", revised || "");
}

const CONTEXT_CHARS = 60;
const MAX_SEGMENTS = 40;
const MAX_TOTAL_CHARS = 8000;

/**
 * Walk the diff parts and extract a compact list of the actually-changed
 * chunks (skipping whitespace-only diffs), each with a little surrounding
 * context so the LLM can judge significance without needing the full
 * document. Bounded in count and total size so cost stays flat regardless
 * of contract length.
 *
 * @returns {Array<{ before: string, after: string, context: string }>}
 */
export function extractChangedSegments(original, revised) {
  const parts = buildRedlineSegments(original, revised);
  const segments = [];
  let totalChars = 0;

  let i = 0;
  while (i < parts.length) {
    const part = parts[i];

    if (!part.added && !part.removed) {
      i++;
      continue;
    }
    if (!part.value.trim()) {
      // whitespace-only diff — not substantive
      i++;
      continue;
    }

    // startIdx/endIdx bound the run of changed parts this chunk covers,
    // so context can be taken from the unchanged neighbours outside it.
    const startIdx = i;
    let before = "";
    let after = "";

    if (part.removed) {
      before = part.value.trim();
      const next = parts[i + 1];
      if (next?.added) {
        after = next.value.trim();
        i++; // consume the paired addition too
      }
    } else {
      after = part.value.trim();
    }
    const endIdx = i;
    i++; // advance past this chunk for the next loop iteration

    if (!before && !after) continue;

    const prevUnchanged = parts[startIdx - 1]?.value || "";
    const nextUnchanged = parts[endIdx + 1]?.value || "";
    const context = [
      prevUnchanged.slice(-CONTEXT_CHARS).trimStart(),
      nextUnchanged.slice(0, CONTEXT_CHARS).trimEnd(),
    ]
      .filter(Boolean)
      .join(" ... ");

    const chunk = { before, after, context };
    const chunkSize = before.length + after.length + context.length;
    if (totalChars + chunkSize > MAX_TOTAL_CHARS || segments.length >= MAX_SEGMENTS) break;
    totalChars += chunkSize;
    segments.push(chunk);
  }

  return segments;
}
