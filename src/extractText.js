// src/extractText.js
// Browser-side text extraction for uploaded contract files.
// Handles .txt, .docx, .pdf. Runs entirely in the browser so
// we never hit Vercel's 4.5MB request body limit for uploads.

import mammoth from "mammoth/mammoth.browser";
import * as pdfjs from "pdfjs-dist";
// Vite-friendly worker import
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Read an uploaded file and return its plain text content.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file) {
  if (!file) throw new Error("No file provided.");

  const name = file.name.toLowerCase();

  if (name.endsWith(".txt")) {
    return await file.text();
  }

  if (name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value.trim();
  }

  if (name.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pageTexts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str).join(" ");
      pageTexts.push(text);
    }
    return pageTexts.join("\n\n").trim();
  }

  // Legacy .doc (binary Word) is not supported — nudge user to convert
  if (name.endsWith(".doc")) {
    throw new Error(
      "Legacy .doc files are not supported. Please save as .docx and try again."
    );
  }

  throw new Error(
    "Unsupported file type. Please upload a .txt, .docx or .pdf file."
  );
}