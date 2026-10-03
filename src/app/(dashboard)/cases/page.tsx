"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderOpen, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";
import type { CaseWithCounts } from "@/types";
import { formatDistanceToNow } from "date-fns";
import CreateCaseModal from "@/components/case/CreateCaseModal";

const DEMO_USER = "demo-user";

const STATUS_CONFIG = {
  ACTIVE:     { label: "Active",     color: "badge-blue" },
  RESOLVED:   { label: "Resolved",   color: "badge-green" },
  ESCALATED:  { label: "Escalated",  color: "badge-red" },
  CLOSED:     { label: "Closed",     color: "badge-gray" },
};

const CATEGORY_ICONS: Record<string, string> = {
  PRODUCT: "📦", SERVICE: "🔧", INSURANCE: "🛡️",
  TELECOM: "📱", BANKING: "🏦", ECOMMERCE: "🛒",
  BUILDER: "🏗️", OTHER: "📋",
};

export default function CasesPage() {
  const [cases,   setCases]   = useState<CaseWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    const res  = await fetch(`/api/cases?userId=${DEMO_USER}`);
    const json = await res.json();
    setCases(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Cases</h1>
          <p className="text-sm text-slate-500 mt-1">
            {cases.length === 0 ? "No cases yet" : `${cases.length} case${cases.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> New Case
        </button>
      </div>

      {/* Empty state */}
      {!loading && cases.length === 0 && (
        <div className="card p-16 text-center">
          <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-600 mb-2">No cases yet</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
            Create your first case and start uploading evidence. ClaimChain will build
            your timeline and detect contradictions automatically.
          </p>
          <button onClick={() => setShowNew(true)} className="btn-primary mx-auto">
            <Plus size={16} /> Create First Case
          </button>
        </div>
      )}

      {/* Cases grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-6" />
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map(j => <div key={j} className="h-10 bg-slate-100 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map(c => (
            <Link key={c.id} href={`/cases/${c.id}`} className="card p-5 hover:shadow-md transition-shadow block group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{CATEGORY_ICONS[c.category] ?? "📋"}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm group-hover:text-brand-700 transition-colors leading-tight">
                      {c.title}
                    </h3>
                    {c.productName && (
                      <p className="text-xs text-slate-400 mt-0.5">{c.productName}</p>
                    )}
                  </div>
                </div>
                <span className={STATUS_CONFIG[c.status]?.color ?? "badge-gray"}>
                  {STATUS_CONFIG[c.status]?.label ?? c.status}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <StatChip icon={<FileText size={12}/>} label="Docs" value={c._count.documents} />
                <StatChip icon={<Clock size={12}/>}     label="Events" value={c._count.events} />
                <StatChip
                  icon={c._count.contradictions > 0 ? <AlertTriangle size={12}/> : <CheckCircle size={12}/>}
                  label="Issues"
                  value={c._count.contradictions + c._count.gaps}
                  alert={c._count.contradictions > 0}
                />
              </div>

              <p className="text-xs text-slate-400 mt-3">
                Updated {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
              </p>
            </Link>
          ))}
        </div>
      )}

      {showNew && (
        <CreateCaseModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
          userId={DEMO_USER}
        />
      )}
    </div>
  );
}

function StatChip({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: number; alert?: boolean }) {
  return (
    <div className={`flex flex-col items-center p-2 rounded-lg ${alert && value > 0 ? "bg-red-50" : "bg-slate-50"}`}>
      <span className={`${alert && value > 0 ? "text-red-500" : "text-slate-400"} mb-0.5`}>{icon}</span>
      <span className={`text-lg font-bold ${alert && value > 0 ? "text-red-600" : "text-slate-700"}`}>{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
