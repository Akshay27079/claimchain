// ClaimChain — shared TypeScript types

import type {
  Case, Document, Event, Promise, Payment,
  Contradiction, Gap, Party,
  CaseCategory, CaseStatus, DocumentType,
  EventType, DateConfidence, PromiseFulfilled,
  PartyRole, Severity,
} from "@prisma/client";

export type {
  Case, Document, Event, Promise, Payment,
  Contradiction, Gap, Party,
  CaseCategory, CaseStatus, DocumentType,
  EventType, DateConfidence, PromiseFulfilled,
  PartyRole, Severity,
};

// ── Enriched types returned by API ───────────────────────────────────────────

export type CaseWithCounts = Case & {
  _count: {
    documents: number;
    events: number;
    promises: number;
    payments: number;
    contradictions: number;
    gaps: number;
  };
};

export type CaseFull = Case & {
  documents:     Document[];
  events:        Event[];
  promises:      Promise[];
  payments:      Payment[];
  contradictions: Contradiction[];
  gaps:          Gap[];
  parties:       Party[];
};

export type EventWithDocument = Event & {
  document: Document | null;
};

// ── Upload / extraction types ─────────────────────────────────────────────────

export interface ParsedDocument {
  text:        string;
  dates:       ExtractedDate[];
  amounts:     ExtractedAmount[];
  promises:    ExtractedPromise[];
  docType:     DocumentType;
}

export interface ExtractedDate {
  raw:         string;      // original text "03 Aug 2024"
  parsed:      Date;
  confidence:  number;      // 0–1
  context:     string;      // surrounding text snippet
}

export interface ExtractedAmount {
  raw:         string;      // "₹1,250"
  value:       number;
  currency:    string;
  context:     string;
  purpose?:    string;
}

export interface ExtractedPromise {
  text:        string;
  madeBy?:     string;
  dueDate?:    Date;
  context:     string;
}

// ── AI extraction result ──────────────────────────────────────────────────────

export interface AIExtractionResult {
  summary:       string;
  events:        AIEvent[];
  promises:      AIPromise[];
  payments:      AIPayment[];
  parties:       AIParty[];
  docType:       DocumentType;
  productInfo?:  AIProductInfo;
}

export interface AIEvent {
  title:       string;
  description: string;
  date:        string;       // ISO string or natural language
  eventType:   EventType;
  confidence:  number;
}

export interface AIPromise {
  text:        string;
  madeBy?:     string;
  dueDate?:    string;
}

export interface AIPayment {
  amount:      number;
  currency:    string;
  purpose?:    string;
  date?:       string;
  hasReceipt:  boolean;
}

export interface AIParty {
  name:        string;
  role:        PartyRole;
}

export interface AIProductInfo {
  name?:          string;
  model?:         string;
  serial?:        string;
  purchaseDate?:  string;
  warrantyExpiry?: string;
  sellerName?:    string;
}

// ── Intelligence analysis result ──────────────────────────────────────────────

export interface IntelligenceReport {
  gaps:          GapSuggestion[];
  contradictions: ContradictionSuggestion[];
  promisesStatus: PromiseStatus[];
  strengthScore:  number;   // 0–100 — how strong the case is
  weaknesses:     string[];
  strengths:      string[];
}

export interface GapSuggestion {
  description: string;
  suggestion:  string;
  severity:    Severity;
}

export interface ContradictionSuggestion {
  claimA:   string;
  sourceA:  string;
  claimB:   string;
  sourceB:  string;
  severity: Severity;
}

export interface PromiseStatus {
  text:       string;
  madeBy?:    string;
  madeOn?:    string;
  fulfilled:  PromiseFulfilled;
}

// ── Evidence graph node/edge types ────────────────────────────────────────────

export interface GraphNode {
  id:       string;
  type:     "case" | "document" | "event" | "promise" | "payment";
  label:    string;
  data:     Record<string, unknown>;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id:     string;
  source: string;
  target: string;
  label?: string;
}

// ── API response types ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?:    T;
  error?:   string;
  message?: string;
}

export interface UploadResponse {
  documentId: string;
  fileName:   string;
  docType:    DocumentType;
  extracted:  AIExtractionResult;
  eventsCreated:   number;
  promisesCreated: number;
  paymentsCreated: number;
}
