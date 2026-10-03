/**
 * extract.ts — AI extraction engine using Google Gemini.
 *
 * Given raw text from any document, returns structured:
 *   - Events (with dates, types)
 *   - Promises (commitments made)
 *   - Payments (amounts, purposes)
 *   - Parties (people/companies)
 *   - Product info (if invoice/warranty)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIExtractionResult, AIEvent, AIPromise, AIPayment, AIParty, AIProductInfo } from "@/types";
import { DocumentType, EventType, PartyRole } from "@prisma/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const EXTRACTION_PROMPT = `You are an AI assistant that helps consumers organize evidence for disputes.

Analyze the following document text and extract structured information.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "summary": "One sentence summary of what this document is",
  "docType": "INVOICE|WARRANTY|SERVICE_REPORT|WHATSAPP_EXPORT|EMAIL|PHOTO|BANK_SMS|BANK_STATEMENT|LEGAL_NOTICE|COMPLAINT|SCREENSHOT|OTHER",
  "events": [
    {
      "title": "Short title",
      "description": "What happened",
      "date": "YYYY-MM-DD or natural language like 'next day' or 'unknown'",
      "eventType": "PURCHASE|FAULT_REPORTED|SERVICE_VISIT|PAYMENT|PROMISE_MADE|PROMISE_BROKEN|COMPANY_RESPONSE|ESCALATION|REFUND|REPLACEMENT|COMPLAINT_FILED|LEGAL_NOTICE|OTHER",
      "confidence": 0.9
    }
  ],
  "promises": [
    {
      "text": "Exact promise text",
      "madeBy": "Person/company name or null",
      "dueDate": "YYYY-MM-DD or null"
    }
  ],
  "payments": [
    {
      "amount": 1250.00,
      "currency": "INR",
      "purpose": "Service charge or null",
      "date": "YYYY-MM-DD or null",
      "hasReceipt": true
    }
  ],
  "parties": [
    {
      "name": "Party name",
      "role": "BUYER|SELLER|MANUFACTURER|SERVICE_CENTER|TECHNICIAN|INSURER|REGULATOR|LAWYER|OTHER"
    }
  ],
  "productInfo": {
    "name": "Product name or null",
    "model": "Model number or null",
    "serial": "Serial number or null",
    "purchaseDate": "YYYY-MM-DD or null",
    "warrantyExpiry": "YYYY-MM-DD or null",
    "sellerName": "Seller name or null"
  }
}

Rules:
- Extract ALL dates mentioned, even approximate ones
- A "promise" is any commitment, assurance, or undertaking (e.g. "will replace", "refund in 7 days", "technician will come")
- Extract ALL monetary amounts mentioned
- If a date is mentioned as relative ("yesterday", "tomorrow"), make a best effort to resolve it
- For WhatsApp chats, the bracketed timestamps are the actual dates — use them
- Return valid JSON only. No extra text.

DOCUMENT TEXT:
`;

export async function extractFromText(
  text: string,
  docType: DocumentType,
  hint?: string,
): Promise<AIExtractionResult> {
  if (!process.env.GEMINI_API_KEY) {
    return buildFallback(docType);
  }

  try {
    const model  = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = EXTRACTION_PROMPT + (hint ? `[CONTEXT: ${hint}]\n` : "") + text.slice(0, 30_000);

    const result   = await model.generateContent(prompt);
    const rawText  = result.response.text().trim();

    // Strip markdown fences if present
    const jsonStr = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed  = JSON.parse(jsonStr) as AIExtractionResult;

    // Validate and normalise
    return normaliseResult(parsed, docType);
  } catch (err) {
    console.error("[AI Extract] Error:", err);
    return buildFallback(docType);
  }
}

// ── Gemini Vision for images ──────────────────────────────────────────────────

export async function extractFromImage(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<AIExtractionResult> {
  if (!process.env.GEMINI_API_KEY) return buildFallback(DocumentType.PHOTO);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imagePart = {
      inlineData: {
        data:     imageBuffer.toString("base64"),
        mimeType: mimeType,
      },
    };

    const prompt = EXTRACTION_PROMPT + "[This is an image. Extract all visible text, dates, amounts, and information.]\n";
    const result  = await model.generateContent([prompt, imagePart]);
    const rawText = result.response.text().trim();
    const jsonStr = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed  = JSON.parse(jsonStr) as AIExtractionResult;

    return normaliseResult(parsed, DocumentType.PHOTO);
  } catch (err) {
    console.error("[AI Extract Vision] Error:", err);
    return buildFallback(DocumentType.PHOTO);
  }
}

// ── Intelligence: contradiction + gap detection ───────────────────────────────

const INTELLIGENCE_PROMPT = `You are an AI assistant analyzing a consumer dispute case.

Given the following case summary with all evidence, identify:
1. CONTRADICTIONS: Two pieces of evidence that say opposite or incompatible things
2. GAPS: Missing evidence that would strengthen the case
3. STRENGTHS: Strong points the consumer has
4. WEAKNESSES: Weak points or things that could be challenged

Return ONLY valid JSON:
{
  "contradictions": [
    {
      "claimA": "What document A says",
      "sourceA": "Document A name/type",
      "claimB": "What document B says",
      "sourceB": "Document B name/type",
      "severity": "HIGH|MEDIUM|LOW"
    }
  ],
  "gaps": [
    {
      "description": "What is missing",
      "suggestion": "How to get this evidence",
      "severity": "HIGH|MEDIUM|LOW"
    }
  ],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "strengthScore": 65
}

CASE DATA:
`;

export async function analyzeCase(caseSummary: string): Promise<{
  contradictions: Array<{ claimA: string; sourceA: string; claimB: string; sourceB: string; severity: string }>;
  gaps: Array<{ description: string; suggestion: string; severity: string }>;
  strengths: string[];
  weaknesses: string[];
  strengthScore: number;
}> {
  if (!process.env.GEMINI_API_KEY) {
    return { contradictions: [], gaps: [], strengths: [], weaknesses: [], strengthScore: 50 };
  }

  try {
    const model   = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result  = await model.generateContent(INTELLIGENCE_PROMPT + caseSummary.slice(0, 25_000));
    const rawText = result.response.text().trim();
    const jsonStr = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("[AI Intelligence] Error:", err);
    return { contradictions: [], gaps: [], strengths: [], weaknesses: [], strengthScore: 50 };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliseResult(parsed: Partial<AIExtractionResult>, fallbackType: DocumentType): AIExtractionResult {
  return {
    summary:     parsed.summary     ?? "Document processed",
    docType:     (parsed.docType    ?? fallbackType) as DocumentType,
    events:      (parsed.events     ?? []).map(normaliseEvent),
    promises:    parsed.promises    ?? [],
    payments:    parsed.payments    ?? [],
    parties:     (parsed.parties    ?? []).map(normaliseParty),
    productInfo: parsed.productInfo ?? undefined,
  };
}

function normaliseEvent(e: Partial<AIEvent>): AIEvent {
  return {
    title:       e.title       ?? "Event",
    description: e.description ?? "",
    date:        e.date        ?? "unknown",
    eventType:   (Object.values(EventType).includes(e.eventType as EventType)
      ? e.eventType
      : EventType.OTHER) as EventType,
    confidence:  e.confidence  ?? 0.7,
  };
}

function normaliseParty(p: Partial<AIParty>): AIParty {
  return {
    name: p.name ?? "Unknown",
    role: (Object.values(PartyRole).includes(p.role as PartyRole)
      ? p.role
      : PartyRole.OTHER) as PartyRole,
  };
}

function buildFallback(docType: DocumentType): AIExtractionResult {
  return {
    summary:  "Document uploaded. Configure GEMINI_API_KEY for AI extraction.",
    docType,
    events:   [],
    promises: [],
    payments: [],
    parties:  [],
  };
}
