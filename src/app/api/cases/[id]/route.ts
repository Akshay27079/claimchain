import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeCase } from "@/lib/ai/extract";
import { Severity }    from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const c = await prisma.case.findUnique({
      where:   { id: params.id },
      include: {
        documents:      true,
        events:         { include: { document: true }, orderBy: { eventDate: "asc" } },
        promises:       { include: { document: true } },
        payments:       { include: { document: true } },
        contradictions: true,
        gaps:           true,
        parties:        true,
      },
    });
    if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    return NextResponse.json({ data: c });
  } catch (err) {
    console.error("[GET /api/cases/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body    = await req.json();
    const updated = await prisma.case.update({
      where: { id: params.id },
      data:  body,
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/cases/[id]]", err);
    return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.case.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Case deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete case" }, { status: 500 });
  }
}

// POST /api/cases/[id]?action=analyze — run AI intelligence analysis
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const action = new URL(req.url).searchParams.get("action");
  if (action !== "analyze") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  try {
    const c = await prisma.case.findUnique({
      where:   { id: params.id },
      include: { documents: true, events: true, promises: true, payments: true },
    });
    if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    // Build a text summary for the AI
    const summary = buildCaseSummary(c);
    const result  = await analyzeCase(summary);

    // Persist contradictions
    await prisma.contradiction.deleteMany({ where: { caseId: params.id } });
    for (const con of result.contradictions) {
      await prisma.contradiction.create({
        data: {
          caseId:   params.id,
          claimA:   con.claimA,
          claimB:   con.claimB,
          sourceA:  con.sourceA,
          sourceB:  con.sourceB,
          severity: (con.severity as Severity) ?? "MEDIUM",
        },
      });
    }

    // Persist gaps
    await prisma.gap.deleteMany({ where: { caseId: params.id } });
    for (const gap of result.gaps) {
      await prisma.gap.create({
        data: {
          caseId:      params.id,
          description: gap.description,
          suggestion:  gap.suggestion,
          severity:    (gap.severity as Severity) ?? "MEDIUM",
        },
      });
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[POST /api/cases/[id]?action=analyze]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

function buildCaseSummary(c: {
  title: string;
  description: string | null;
  productName: string | null;
  events: Array<{ title: string; description: string | null; eventDate: Date }>;
  documents: Array<{ fileName: string; docType: string; rawText: string | null }>;
  promises: Array<{ text: string; madeBy: string | null }>;
  payments: Array<{ amount: number; purpose: string | null; hasReceipt: boolean }>;
}): string {
  const lines = [
    `CASE: ${c.title}`,
    c.description ? `DESC: ${c.description}` : "",
    c.productName  ? `PRODUCT: ${c.productName}` : "",
    "",
    "TIMELINE:",
    ...c.events.map(e => `  ${e.eventDate.toISOString().slice(0,10)}: ${e.title} — ${e.description ?? ""}`),
    "",
    "DOCUMENTS:",
    ...c.documents.map(d => `  [${d.docType}] ${d.fileName}: ${(d.rawText ?? "").slice(0, 500)}`),
    "",
    "PROMISES:",
    ...c.promises.map(p => `  - "${p.text}" (by: ${p.madeBy ?? "unknown"})`),
    "",
    "PAYMENTS:",
    ...c.payments.map(p => `  - ₹${p.amount} for ${p.purpose ?? "unknown"} | receipt: ${p.hasReceipt}`),
  ];
  return lines.filter(Boolean).join("\n");
}
