/**
 * pdf.ts — Extract plain text from a PDF buffer.
 * Uses pdf-parse. Returns raw text for downstream AI processing.
 */

import pdfParse from "pdf-parse";

export interface PDFParseResult {
  text:      string;
  numPages:  number;
  info:      Record<string, unknown>;
}

export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  try {
    const data = await pdfParse(buffer);
    return {
      text:     data.text.trim(),
      numPages: data.numpages,
      info:     (data.info as Record<string, unknown>) ?? {},
    };
  } catch (err) {
    console.error("[parsePDF] Error:", err);
    throw new Error("Failed to parse PDF. The file may be corrupt or password-protected.");
  }
}
