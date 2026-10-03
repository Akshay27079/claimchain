"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams }           from "next/navigation";
import Link                    from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import ReactFlow, {
  Background, Controls, MiniMap,
  type Node, type Edge,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { CaseFull } from "@/types";
import { format } from "date-fns";

const DOC_COLORS: Record<string, string> = {
  INVOICE: "#3b82f6", WARRANTY: "#8b5cf6", SERVICE_REPORT: "#f59e0b",
  WHATSAPP_EXPORT: "#22c55e", EMAIL: "#6366f1", PHOTO: "#ec4899",
  BANK_SMS: "#14b8a6", OTHER: "#94a3b8",
};

const EVENT_COLORS: Record<string, string> = {
  PURCHASE: "#3b82f6", FAULT_REPORTED: "#f97316", SERVICE_VISIT: "#eab308",
  PAYMENT: "#22c55e", PROMISE_MADE: "#a855f7", ESCALATION: "#ef4444",
  DEFAULT: "#64748b",
};

export default function GraphPage() {
  const { id }                = useParams<{ id: string }>();
  const [caseData, setCase]   = useState<CaseFull | null>(null);
  const [loading, setLoad]    = useState(true);
  const [nodes,   setNodes]   = useState<Node[]>([]);
  const [edges,   setEdges]   = useState<Edge[]>([]);

  useEffect(() => {
    (async () => {
      setLoad(true);
      const res  = await fetch(`/api/cases/${id}`);
      const json = await res.json();
      const c: CaseFull = json.data;
      setCase(c);
      if (c) buildGraph(c);
      setLoad(false);
    })();
  }, [id]);

  function buildGraph(c: CaseFull) {
    const ns: Node[] = [];
    const es: Edge[] = [];
    let   x = 0;

    // Central case node
    ns.push({
      id:       "case",
      type:     "default",
      position: { x: 400, y: 0 },
      data:     { label: `📁 ${c.title}` },
      style:    { background: "#1e1b4b", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, padding: "10px 16px", fontSize: 13 },
    });

    // Document nodes — row below case
    c.documents.forEach((doc, i) => {
      const nodeId = `doc_${doc.id}`;
      const color  = DOC_COLORS[doc.docType] ?? DOC_COLORS.OTHER;
      ns.push({
        id:       nodeId,
        type:     "default",
        position: { x: 80 + i * 200, y: 130 },
        data:     { label: `${docIcon(doc.docType)} ${truncate(doc.fileName, 20)}` },
        style:    { background: color + "22", border: `2px solid ${color}`, borderRadius: 10, color: "#1e293b", fontSize: 11, fontWeight: 600, padding: "8px 12px" },
      });
      es.push({
        id:     `case_${doc.id}`,
        source: "case",
        target: nodeId,
        markerEnd: { type: MarkerType.Arrow },
        style: { stroke: color, strokeWidth: 1.5 },
      });
    });

    // Event nodes — row below documents
    const eventsByDoc: Record<string, typeof c.events> = {};
    c.events.forEach(ev => {
      const key = (ev as { documentId?: string | null }).documentId ?? "manual";
      if (!eventsByDoc[key]) eventsByDoc[key] = [];
      eventsByDoc[key].push(ev);
    });

    c.events.forEach((ev, i) => {
      const nodeId  = `ev_${ev.id}`;
      const color   = EVENT_COLORS[(ev as { eventType: string }).eventType] ?? EVENT_COLORS.DEFAULT;
      const docId   = (ev as { documentId?: string | null }).documentId;
      const date    = ev.eventDate ? format(new Date(ev.eventDate), "dd MMM") : "?";

      ns.push({
        id:       nodeId,
        type:     "default",
        position: { x: 60 + i * 160, y: 300 },
        data:     { label: `${date}\n${truncate(ev.title, 22)}` },
        style:    { background: color + "18", border: `1.5px solid ${color}`, borderRadius: 8, color: "#1e293b", fontSize: 10, padding: "6px 10px", whiteSpace: "pre-line", lineHeight: 1.4 },
      });

      // Connect to source document or case
      const sourceId = docId ? `doc_${docId}` : "case";
      es.push({
        id:     `src_${ev.id}`,
        source: sourceId,
        target: nodeId,
        markerEnd: { type: MarkerType.Arrow },
        style: { stroke: color, strokeWidth: 1, strokeDasharray: docId ? "0" : "4" },
      });
    });

    // Payment nodes
    c.payments.forEach((pay, i) => {
      const nodeId = `pay_${pay.id}`;
      ns.push({
        id:       nodeId,
        type:     "default",
        position: { x: 60 + i * 180, y: 460 },
        data:     { label: `💰 ₹${pay.amount.toLocaleString("en-IN")}\n${truncate(pay.purpose ?? "Payment", 20)}${pay.hasReceipt ? "" : "\n⚠️ No receipt"}` },
        style:    {
          background: pay.hasReceipt ? "#f0fdf4" : "#fef2f2",
          border:     pay.hasReceipt ? "1.5px solid #22c55e" : "1.5px solid #ef4444",
          borderRadius: 8, color: "#1e293b", fontSize: 10, padding: "6px 10px", whiteSpace: "pre-line",
        },
      });
      const docId = (pay as { documentId?: string | null }).documentId;
      es.push({
        id:     `pay_src_${pay.id}`,
        source: docId ? `doc_${docId}` : "case",
        target: nodeId,
        style:  { stroke: pay.hasReceipt ? "#22c55e" : "#ef4444", strokeDasharray: "3" },
      });
    });

    setNodes(ns);
    setEdges(es);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-brand-500" size={32}/>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-1 text-sm text-slate-400 mb-4">
        <Link href="/cases">Cases</Link>
        <ChevronRight size={14}/>
        <Link href={`/cases/${id}`} className="hover:text-brand-600">{caseData?.title}</Link>
        <ChevronRight size={14}/>
        <span className="text-slate-700">Evidence Graph</span>
      </div>

      <h1 className="text-xl font-bold mb-2">📊 Evidence Graph</h1>
      <p className="text-sm text-slate-400 mb-4">
        Visual map showing documents → events → payments. Orange/red nodes indicate issues.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { color: "#1e1b4b", label: "Case" },
          { color: "#3b82f6", label: "Invoice" },
          { color: "#22c55e", label: "WhatsApp" },
          { color: "#f59e0b", label: "Service Report" },
          { color: "#ef4444", label: "Missing Receipt" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className="w-3 h-3 rounded-full" style={{ background: l.color }}/>
            {l.label}
          </div>
        ))}
      </div>

      <div className="card overflow-hidden" style={{ height: 560 }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background gap={16} color="#e2e8f0"/>
          <Controls/>
          <MiniMap nodeColor={n => {
            const style = n.style as { background?: string } | undefined;
            return style?.background ?? "#e2e8f0";
          }}/>
        </ReactFlow>
      </div>
    </div>
  );
}

function docIcon(docType: string): string {
  const m: Record<string, string> = {
    INVOICE: "🧾", WARRANTY: "🛡️", SERVICE_REPORT: "🔧",
    WHATSAPP_EXPORT: "💬", EMAIL: "📧", PHOTO: "📷",
    BANK_SMS: "💳", OTHER: "📄",
  };
  return m[docType] ?? "📄";
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
