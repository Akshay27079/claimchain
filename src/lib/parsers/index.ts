/**
 * parsers/index.ts — Route incoming files to the correct parser.
 * Returns raw text suitable for AI extraction.
 */

import { parsePDF }       from "./pdf";
import { parseWhatsApp }  from "./whatsapp";
import { parseSMS }       from "./sms";
import { DocumentType }   from "@prisma/client";

export interface RawExtraction {
  text:     string;
  docType:  DocumentType;
  meta:     Record<string, unknown>;
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<RawExtraction> {
  const name  = originalName.toLowerCase();
  const lower = mimeType.toLowerCase();

  // ── PDF ───────────────────────────────────────────────────────────────────
  if (lower === "application/pdf" || name.endsWith(".pdf")) {
    const result  = await parsePDF(buffer);
    const docType = guessDocTypeFromText(result.text, name);
    return { text: result.text, docType, meta: { numPages: result.numPages } };
  }

  // ── WhatsApp .txt export ──────────────────────────────────────────────────
  if (lower === "text/plain" || name.endsWith(".txt")) {
    const raw = buffer.toString("utf-8");
    // Detect if it's a WhatsApp export by looking for the pattern
    const isWhatsApp = /^\[?\d{1,2}\/\d{1,2}\/\d{2,4}/m.test(raw) &&
                       raw.includes(" - ") || raw.includes("]: ");
    if (isWhatsApp) {
      const result = parseWhatsApp(raw);
      return {
        text:    result.plainText,
        docType: DocumentType.WHATSAPP_EXPORT,
        meta:    {
          participants: result.participants,
          messageCount: result.messages.length,
          dateRange:    result.dateRange,
        },
      };
    }
    // Plain text — could be bank SMS paste
    const smsResult = parseSMS(raw);
    if (smsResult.payments.length > 0) {
      return {
        text:    raw,
        docType: DocumentType.BANK_SMS,
        meta:    { paymentCount: smsResult.payments.length },
      };
    }
    // Generic text
    return { text: raw, docType: DocumentType.OTHER, meta: {} };
  }

  // ── Images — return filename + placeholder text for AI vision ────────────
  if (lower.startsWith("image/")) {
    // Image text extraction via Gemini Vision happens in the AI engine
    return {
      text:    `[Image file: ${originalName}. Content will be extracted via AI vision.]`,
      docType: guessDocTypeFromName(name),
      meta:    { isImage: true },
    };
  }

  // ── Email (.eml / .mbox) ──────────────────────────────────────────────────
  if (name.endsWith(".eml") || name.endsWith(".mbox") || lower === "message/rfc822") {
    const raw = buffer.toString("utf-8");
    // Strip email headers, keep body
    const body = raw.replace(/^[\s\S]*?\n\n/, ""); // everything after first blank line
    return {
      text:    body.slice(0, 50_000), // cap at 50k chars
      docType: DocumentType.EMAIL,
      meta:    {},
    };
  }

  // Fallback
  return {
    text:    buffer.toString("utf-8", 0, Math.min(buffer.length, 50_000)),
    docType: DocumentType.OTHER,
    meta:    {},
  };
}

// ── Heuristics to guess document type ────────────────────────────────────────

function guessDocTypeFromText(text: string, name: string): DocumentType {
  const t = text.toLowerCase();
  const n = name.toLowerCase();

  if (n.includes("invoice") || t.includes("tax invoice") || t.includes("gstin"))
    return DocumentType.INVOICE;
  if (n.includes("warrant") || t.includes("warranty") || t.includes("guarantee"))
    return DocumentType.WARRANTY;
  if (t.includes("service report") || t.includes("job sheet") || t.includes("service order"))
    return DocumentType.SERVICE_REPORT;
  if (t.includes("legal notice") || t.includes("consumer protection"))
    return DocumentType.LEGAL_NOTICE;
  if (t.includes("complaint") || t.includes("grievance"))
    return DocumentType.COMPLAINT;
  if (t.includes("statement") && (t.includes("bank") || t.includes("account")))
    return DocumentType.BANK_STATEMENT;
  return DocumentType.OTHER;
}

function guessDocTypeFromName(name: string): DocumentType {
  if (name.includes("invoice"))  return DocumentType.INVOICE;
  if (name.includes("warranty")) return DocumentType.WARRANTY;
  if (name.includes("service"))  return DocumentType.SERVICE_REPORT;
  if (name.includes("receipt"))  return DocumentType.INVOICE;
  if (name.includes("photo") || name.includes("img") || name.includes("dsc"))
    return DocumentType.PHOTO;
  return DocumentType.OTHER;
}
