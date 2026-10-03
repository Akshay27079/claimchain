"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter }             from "next/navigation";
import Link                                 from "next/link";
import {
  Clock, FileText, Zap, AlertTriangle, Download,
  Upload, ChevronRight, Brain, BarChart2, Loader2
} from "lucide-react";
import type { CaseFull } from "@/types";
import UploadZone         from "@/components/upload/UploadZone";
import DocumentList       from "@/components/case/DocumentList";
import { formatDistanceToNow, format } from "date-fns";

const NAV_TABS = [
  { key: "timeline",     label: "Timeline",     icon: Clock },
  { key: "graph",        label: "Evidence Graph", icon: BarChart2 },
  { key: "intelligence", label: "Intelligence", icon: Brain },
];

export default function CaseDetailPage() {
  const { id }              = useParams<{ id: string }>();
  const router              = useRouter();
  const [caseData, setCase] = useState<CaseFull | null>(null);
  const [loading, setLoad]  = useState(true);
  const [analyzing, setAna] = useState(false);
  const [tab, setTab]       = useState("timeline");

  const load = useCallback(async () => {
    setLoad(true);
    const res  = await fetch(`/api/cases/${id}`);
    const json = await res.json();
    setCase(json.data ?? null);
    setLoad(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function runAnalysis() {
    setAna(true);
    await fetch(`/api/cases/${id}?action=analyze`, { method: "POST" });
    await load();
    setAna(false);
    setTab("intelligence");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-brand-500" size={32}/>
    </div>
  );

  if (!caseData) return (
    <div className="card p-12 text-center">
      <p className="text-slate-500">Case not found.</p>
      <Link href="/cases" className="btn-primary mt-4 inline-flex">← Back to Cases</Link>
    </div>
  );

  const issues = caseData.contradictions.length + caseData.gaps.length;
  const totalPaid = caseData.payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-slate-400 mb-4">
        <Link href="/cases" className="hover:text-brand-600">Cases</Link>
        <ChevronRight size={14}/>
        <span className="text-slate-700 font-medium truncate max-w-xs">{caseData.title}</span>
      </div>

      {/* Header card */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{caseData.title}</h1>
            {caseData.description && <p className="text-sm text-slate-500 mt-1">{caseData.description}</p>}
            <div className="flex flex-wrap gap-3 mt-3">
              {caseData.productName && (
                <span className="badge-blue">📦 {caseData.productName} {caseData.modelNumber ?? ""}</span>
              )}
              {caseData.sellerName && (
                <span className="badge-gray">🏪 {caseData.sellerName}</span>
              )}
              {caseData.purchaseDate && (
                <span className="badge-gray">🗓 Purchased {format(new Date(caseData.purchaseDate), "dd MMM yyyy")}</span>
              )}
              {caseData.warrantyExpiry && (
                <span className="badge-yellow">🛡 Warranty until {format(new Date(caseData.warrantyExpiry), "dd MMM yyyy")}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={runAnalysis} disabled={analyzing} className="btn-primary">
              {analyzing ? <Loader2 size={15} className="animate-spin"/> : <Brain size={15}/>}
              {analyzing ? "Analyzing…" : "Run AI Analysis"}
            </button>
            <a href={`/api/export/${id}?format=html`} target="_blank" className="btn-secondary">
              <Download size={15}/> Export PDF
            </a>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t">
          <Stat label="Documents"  value={caseData.documents.length}    icon="📄" />
          <Stat label="Events"     value={caseData.events.length}       icon="📅" />
          <Stat label="Total Paid" value={`₹${totalPaid.toLocaleString("en-IN")}`} icon="💰" />
          <Stat label="Issues"     value={issues} icon={issues > 0 ? "⚠️" : "✅"} alert={issues > 0}/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upload + Documents */}
        <div className="space-y-4">
          <div className="card p-4">
            <p className="section-title">Upload Evidence</p>
            <UploadZone caseId={id} onUploaded={load} />
          </div>
          <div className="card p-4">
            <p className="section-title">Documents ({caseData.documents.length})</p>
            <DocumentList documents={caseData.documents} />
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2 card overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b bg-slate-50">
            {NAV_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => {
                  if (t.key === "timeline" || t.key === "graph" || t.key === "intelligence") {
                    router.push(`/cases/${id}/${t.key}`);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-brand-600 text-brand-700 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <t.icon size={15}/> {t.label}
              </button>
            ))}
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-500 text-center py-8">
              Use the navigation tabs above to view Timeline, Evidence Graph, or Intelligence analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, alert }: { label: string; value: string | number; icon: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${alert ? "bg-red-50" : "bg-slate-50"}`}>
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className={`text-xl font-bold ${alert ? "text-red-600" : "text-slate-800"}`}>{value}</span>
      </div>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}
