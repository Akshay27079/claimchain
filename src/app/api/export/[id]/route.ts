/**
 * GET /api/export/[id] — Generate a formatted PDF evidence pack.
 * Returns HTML (printed to PDF via browser) or plain text.
 * ?format=html|text
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma }    from "@/lib/prisma";
import { format }    from "date-fns";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const fmt = req.nextUrl.searchParams.get("format") ?? "html";

  try {
    const c = await prisma.case.findUnique({
      where:   { id: params.id },
      include: {
        events:         { include: { document: true }, orderBy: { eventDate: "asc" } },
        documents:      true,
        promises:       true,
        payments:       true,
        contradictions: true,
        gaps:           true,
        parties:        true,
      },
    });
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (fmt === "text") {
      const text = buildTextReport(c);
      return new NextResponse(text, {
        headers: {
          "Content-Type":        "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="ClaimChain-${c.id.slice(0,8)}.txt"`,
        },
      });
    }

    const html = buildHTMLReport(c);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[Export]", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

type FullCase = Awaited<ReturnType<typeof prisma.case.findUnique>> & {
  events:         Array<{ title: string; description: string | null; eventDate: Date; eventType: string; document: { fileName: string } | null }>;
  documents:      Array<{ fileName: string; docType: string; uploadedAt: Date }>;
  promises:       Array<{ text: string; madeBy: string | null; fulfilled: string }>;
  payments:       Array<{ amount: number; purpose: string | null; paidOn: Date | null; hasReceipt: boolean }>;
  contradictions: Array<{ claimA: string; claimB: string; sourceA: string | null; sourceB: string | null; severity: string }>;
  gaps:           Array<{ description: string; suggestion: string | null; severity: string }>;
  parties:        Array<{ name: string; role: string }>;
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "Date unknown";
  return format(d, "dd MMM yyyy");
}

function buildHTMLReport(c: FullCase | null): string {
  if (!c) return "<p>Case not found</p>";

  const totalPaid = c.payments.reduce((s, p) => s + p.amount, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Evidence Pack — ${c.title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 22px; color: #1e1b4b; border-bottom: 3px solid #4f46e5; padding-bottom: 8px; margin-bottom: 20px; }
  h2 { font-size: 15px; color: #4f46e5; margin: 28px 0 10px; text-transform: uppercase; letter-spacing: .5px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8f9ff; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
  .meta-item { display: flex; flex-direction: column; }
  .meta-label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: .5px; }
  .meta-value { font-weight: 600; }
  .timeline { border-left: 3px solid #e0e7ff; padding-left: 20px; }
  .tl-event { position: relative; margin-bottom: 18px; }
  .tl-event::before { content: ''; position: absolute; left: -24px; top: 6px; width: 9px; height: 9px; border-radius: 50%; background: #4f46e5; }
  .tl-date { font-size: 11px; color: #6b7280; font-weight: 600; }
  .tl-title { font-weight: 700; margin: 2px 0; }
  .tl-desc { color: #374151; }
  .tl-source { font-size: 11px; color: #9ca3af; font-style: italic; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #6b7280; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
  .badge-high { background: #fee2e2; color: #b91c1c; }
  .badge-medium { background: #fef3c7; color: #92400e; }
  .badge-low { background: #d1fae5; color: #065f46; }
  .badge-broken { background: #fee2e2; color: #b91c1c; }
  .badge-unknown { background: #f3f4f6; color: #6b7280; }
  .badge-fulfilled { background: #d1fae5; color: #065f46; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print {
    body { padding: 20px; }
    h2 { page-break-before: auto; }
  }
</style>
</head>
<body>

<h1>🔗 ClaimChain Evidence Pack<br><small style="font-size:14px;font-weight:400;color:#6b7280;">${c.title}</small></h1>

<div class="meta-grid">
  <div class="meta-item"><span class="meta-label">Case ID</span><span class="meta-value">${c.id.slice(0,12).toUpperCase()}</span></div>
  <div class="meta-item"><span class="meta-label">Generated</span><span class="meta-value">${fmtDate(new Date())}</span></div>
  <div class="meta-item"><span class="meta-label">Category</span><span class="meta-value">${c.category}</span></div>
  <div class="meta-item"><span class="meta-label">Status</span><span class="meta-value">${c.status}</span></div>
  ${c.productName ? `<div class="meta-item"><span class="meta-label">Product</span><span class="meta-value">${c.productName} ${c.modelNumber ?? ""}</span></div>` : ""}
  ${c.sellerName  ? `<div class="meta-item"><span class="meta-label">Seller</span><span class="meta-value">${c.sellerName}</span></div>` : ""}
  ${c.purchaseDate ? `<div class="meta-item"><span class="meta-label">Purchase Date</span><span class="meta-value">${fmtDate(c.purchaseDate)}</span></div>` : ""}
  ${c.warrantyExpiry ? `<div class="meta-item"><span class="meta-label">Warranty Expiry</span><span class="meta-value">${fmtDate(c.warrantyExpiry)}</span></div>` : ""}
  <div class="meta-item"><span class="meta-label">Total Paid</span><span class="meta-value">₹${totalPaid.toLocaleString("en-IN")}</span></div>
  <div class="meta-item"><span class="meta-label">Documents</span><span class="meta-value">${c.documents.length}</span></div>
</div>

<h2>📅 Chronological Timeline</h2>
<div class="timeline">
${c.events.map(e => `
  <div class="tl-event">
    <div class="tl-date">${fmtDate(e.eventDate)}</div>
    <div class="tl-title">${e.title}</div>
    ${e.description ? `<div class="tl-desc">${e.description}</div>` : ""}
    ${e.document ? `<div class="tl-source">Source: ${e.document.fileName}</div>` : ""}
  </div>`).join("")}
</div>

<h2>📄 Documents Submitted</h2>
<table>
  <thead><tr><th>#</th><th>File Name</th><th>Type</th><th>Uploaded</th></tr></thead>
  <tbody>
  ${c.documents.map((d, i) => `<tr><td>${i+1}</td><td>${d.fileName}</td><td>${d.docType.replace(/_/g," ")}</td><td>${fmtDate(d.uploadedAt)}</td></tr>`).join("")}
  </tbody>
</table>

<h2>🤝 Promises Made</h2>
<table>
  <thead><tr><th>Promise</th><th>Made By</th><th>Status</th></tr></thead>
  <tbody>
  ${c.promises.map(p => `<tr>
    <td>${p.text}</td>
    <td>${p.madeBy ?? "—"}</td>
    <td><span class="badge badge-${p.fulfilled.toLowerCase()}">${p.fulfilled}</span></td>
  </tr>`).join("")}
  </tbody>
</table>

<h2>💰 Payments Made</h2>
<table>
  <thead><tr><th>Amount</th><th>Purpose</th><th>Date</th><th>Receipt</th></tr></thead>
  <tbody>
  ${c.payments.map(p => `<tr>
    <td>₹${p.amount.toLocaleString("en-IN")}</td>
    <td>${p.purpose ?? "—"}</td>
    <td>${fmtDate(p.paidOn)}</td>
    <td>${p.hasReceipt ? "✅ Yes" : "❌ Missing"}</td>
  </tr>`).join("")}
  <tr style="font-weight:700;background:#f8f9ff"><td>Total: ₹${totalPaid.toLocaleString("en-IN")}</td><td colspan="3"></td></tr>
  </tbody>
</table>

${c.contradictions.length > 0 ? `
<h2>⚠️ Contradictions in Evidence</h2>
<table>
  <thead><tr><th>Claim A</th><th>Source A</th><th>Claim B</th><th>Source B</th><th>Severity</th></tr></thead>
  <tbody>
  ${c.contradictions.map(con => `<tr>
    <td>${con.claimA}</td><td><em>${con.sourceA ?? "—"}</em></td>
    <td>${con.claimB}</td><td><em>${con.sourceB ?? "—"}</em></td>
    <td><span class="badge badge-${con.severity.toLowerCase()}">${con.severity}</span></td>
  </tr>`).join("")}
  </tbody>
</table>` : ""}

${c.gaps.length > 0 ? `
<h2>🔍 Evidence Gaps</h2>
<table>
  <thead><tr><th>Gap</th><th>Suggestion</th><th>Severity</th></tr></thead>
  <tbody>
  ${c.gaps.map(g => `<tr>
    <td>${g.description}</td>
    <td>${g.suggestion ?? "—"}</td>
    <td><span class="badge badge-${g.severity.toLowerCase()}">${g.severity}</span></td>
  </tr>`).join("")}
  </tbody>
</table>` : ""}

${c.parties.length > 0 ? `
<h2>👥 Parties Involved</h2>
<table>
  <thead><tr><th>Name</th><th>Role</th></tr></thead>
  <tbody>${c.parties.map(p => `<tr><td>${p.name}</td><td>${p.role.replace(/_/g," ")}</td></tr>`).join("")}</tbody>
</table>` : ""}

<div class="footer">
  Generated by ClaimChain · ${new Date().toISOString()} · This document is for personal evidence organization only and does not constitute legal advice.
</div>

<script>window.onload = () => window.print();</script>
</body>
</html>`;
}

function buildTextReport(c: FullCase | null): string {
  if (!c) return "Case not found";
  const lines: string[] = [
    `CLAIMCHAIN EVIDENCE PACK`,
    `========================`,
    `Case: ${c.title}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `TIMELINE`,
    `--------`,
    ...(c.events ?? []).map(e => `${fmtDate(e.eventDate)} | ${e.title} | ${e.description ?? ""}`),
    ``,
    `PROMISES`,
    `--------`,
    ...(c.promises ?? []).map(p => `- "${p.text}" (by: ${p.madeBy ?? "unknown"}) [${p.fulfilled}]`),
    ``,
    `PAYMENTS`,
    `--------`,
    ...(c.payments ?? []).map(p => `- ₹${p.amount} | ${p.purpose ?? "unknown"} | ${fmtDate(p.paidOn)} | receipt: ${p.hasReceipt ? "yes" : "MISSING"}`),
  ];
  return lines.join("\n");
}
