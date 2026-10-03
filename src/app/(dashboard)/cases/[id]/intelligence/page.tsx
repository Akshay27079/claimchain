"use client";

import { useEffect, useState } from "react";
import { useParams }           from "next/navigation";
import Link                    from "next/link";
import { ChevronRight, Loader2, Brain, AlertTriangle, Search, CheckCircle, XCircle, HelpCircle, Zap } from "lucide-react";
import type { CaseFull } from "@/types";

const SEVERITY_CONFIG = {
  CRITICAL: { color: "bg-red-100 text-red-800 border-red-200",    dot: "bg-red-500"    },
  HIGH:     { color: "bg-red-100 text-red-700 border-red-200",    dot: "bg-red-400"    },
  MEDIUM:   { color: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-500" },
  LOW:      { color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500"  },
};

const FULFILLED_CONFIG = {
  YES:     { icon: <CheckCircle size={14} className="text-green-500"/>, label: "Fulfilled",   bg: "bg-green-50  border-green-200" },
  NO:      { icon: <XCircle    size={14} className="text-red-500"/>,   label: "Broken",      bg: "bg-red-50    border-red-200"   },
  UNKNOWN: { icon: <HelpCircle size={14} className="text-slate-400"/>, label: "Unknown",     bg: "bg-slate-50  border-slate-200" },
};

export default function IntelligencePage() {
  const { id }             = useParams<{ id: string }>();
  const [c,     setCase]   = useState<CaseFull | null>(null);
  const [load,  setLoad]   = useState(true);
  const [analyzing, setAna]= useState(false);

  async function fetch_data() {
    setLoad(true);
    const res  = await fetch(`/api/cases/${id}`);
    const json = await res.json();
    setCase(json.data ?? null);
    setLoad(false);
  }

  useEffect(() => { fetch_data(); }, [id]);

  async function runAnalysis() {
    setAna(true);
    await fetch(`/api/cases/${id}?action=analyze`, { method: "POST" });
    await fetch_data();
    setAna(false);
  }

  if (load) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-brand-500" size={32}/>
    </div>
  );

  const noData = !c || (c.contradictions.length === 0 && c.gaps.length === 0 && c.promises.length === 0);

  const brokenPromises  = c?.promises.filter(p => p.fulfilled === "NO")    ?? [];
  const unknownPromises = c?.promises.filter(p => p.fulfilled === "UNKNOWN") ?? [];
  const missingReceipts = c?.payments.filter(p => !p.hasReceipt)           ?? [];
  const highGaps        = c?.gaps.filter(g => g.severity === "HIGH" || g.severity === "CRITICAL") ?? [];
  const highContradictions = c?.contradictions.filter(con => con.severity === "HIGH" || con.severity === "CRITICAL") ?? [];

  // Rough strength score
  const totalIssues = (c?.contradictions.length ?? 0) + (c?.gaps.length ?? 0) + brokenPromises.length;
  const totalDocs   = c?.documents.length ?? 0;
  const score = Math.max(0, Math.min(100,
    Math.round(((totalDocs * 10) - (totalIssues * 8) + (c?.events.length ?? 0) * 3))
  ));

  return (
    <div>
      <div className="flex items-center gap-1 text-sm text-slate-400 mb-4">
        <Link href="/cases">Cases</Link>
        <ChevronRight size={14}/>
        <Link href={`/cases/${id}`} className="hover:text-brand-600 truncate max-w-xs">{c?.title}</Link>
        <ChevronRight size={14}/>
        <span className="text-slate-700">Intelligence</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Brain size={20} className="text-brand-600"/> Intelligence Report</h1>
          <p className="text-sm text-slate-400 mt-0.5">AI-powered analysis of contradictions, gaps, and promise status</p>
        </div>
        <button onClick={runAnalysis} disabled={analyzing} className="btn-primary">
          {analyzing ? <Loader2 size={15} className="animate-spin"/> : <Zap size={15}/>}
          {analyzing ? "Analyzing…" : "Re-run Analysis"}
        </button>
      </div>

      {noData ? (
        <div className="card p-12 text-center">
          <Brain size={40} className="mx-auto text-slate-300 mb-4"/>
          <h2 className="font-semibold text-slate-600 mb-2">No analysis yet</h2>
          <p className="text-sm text-slate-400 mb-5">Upload documents first, then run the AI analysis to detect contradictions and gaps.</p>
          <button onClick={runAnalysis} className="btn-primary mx-auto">
            <Zap size={15}/> Run AI Analysis
          </button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Strength score */}
          <div className="card p-5">
            <p className="section-title">Case Strength Score</p>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${score} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-800">{score}</span>
              </div>
              <div>
                <p className={`text-lg font-bold ${score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                  {score >= 70 ? "Strong case" : score >= 40 ? "Moderate case" : "Needs more evidence"}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {totalDocs} document{totalDocs !== 1 ? "s" : ""} · {c?.events.length} events · {totalIssues} issue{totalIssues !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Alert strip */}
          {(highContradictions.length > 0 || missingReceipts.length > 0 || brokenPromises.length > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-semibold text-red-800 text-sm mb-2 flex items-center gap-2">
                <AlertTriangle size={15}/> Action Required
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                {highContradictions.length > 0   && <li>{highContradictions.length} high-severity contradiction{highContradictions.length !== 1 ? "s" : ""} detected</li>}
                {missingReceipts.length > 0 && <li>{missingReceipts.length} payment{missingReceipts.length !== 1 ? "s" : ""} missing receipt</li>}
                {brokenPromises.length > 0  && <li>{brokenPromises.length} promise{brokenPromises.length !== 1 ? "s" : ""} marked as broken</li>}
              </ul>
            </div>
          )}

          {/* Contradictions */}
          {(c?.contradictions.length ?? 0) > 0 && (
            <div className="card p-5">
              <p className="section-title">⚠️ Contradictions ({c!.contradictions.length})</p>
              <div className="space-y-3">
                {c!.contradictions.map(con => {
                  const sev = SEVERITY_CONFIG[con.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.MEDIUM;
                  return (
                    <div key={con.id} className={`border rounded-xl p-4 ${sev.color}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`badge border ${sev.color}`}>{con.severity}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs font-bold text-slate-500 mb-1">📄 {con.sourceA ?? "Source A"}</p>
                          <p className="text-sm">{con.claimA}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-xs font-bold text-slate-500 mb-1">📄 {con.sourceB ?? "Source B"}</p>
                          <p className="text-sm">{con.claimB}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gaps */}
          {(c?.gaps.length ?? 0) > 0 && (
            <div className="card p-5">
              <p className="section-title">🔍 Evidence Gaps ({c!.gaps.length})</p>
              <div className="space-y-2">
                {c!.gaps.map(g => {
                  const sev = SEVERITY_CONFIG[g.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.MEDIUM;
                  return (
                    <div key={g.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sev.dot}`}/>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{g.description}</p>
                        {g.suggestion && (
                          <p className="text-xs text-slate-500 mt-1">💡 {g.suggestion}</p>
                        )}
                      </div>
                      <span className={`badge border text-xs ${sev.color}`}>{g.severity}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Promises */}
          {(c?.promises.length ?? 0) > 0 && (
            <div className="card p-5">
              <p className="section-title">🤝 Promises Tracker ({c!.promises.length})</p>
              <div className="space-y-2">
                {c!.promises.map(p => {
                  const cfg = FULFILLED_CONFIG[p.fulfilled as keyof typeof FULFILLED_CONFIG] ?? FULFILLED_CONFIG.UNKNOWN;
                  return (
                    <div key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg}`}>
                      <span className="flex-shrink-0 mt-0.5">{cfg.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm text-slate-800">"{p.text}"</p>
                        {p.madeBy && <p className="text-xs text-slate-500 mt-0.5">Made by: {p.madeBy}</p>}
                      </div>
                      <span className="text-xs text-slate-500 flex-shrink-0">{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Missing receipts */}
          {missingReceipts.length > 0 && (
            <div className="card p-5">
              <p className="section-title">💰 Payments Without Receipts ({missingReceipts.length})</p>
              <div className="space-y-2">
                {missingReceipts.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-800">₹{p.amount.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-slate-500">{p.purpose ?? "Purpose unknown"}</p>
                    </div>
                    <span className="badge-red">No Receipt</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
