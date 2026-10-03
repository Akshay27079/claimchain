"use client";

import { useEffect, useState } from "react";
import { useParams }           from "next/navigation";
import Link                    from "next/link";
import { ChevronRight, Plus, Loader2, Edit2, Check, X } from "lucide-react";
import type { CaseFull, EventWithDocument } from "@/types";
import { format } from "date-fns";

const EVENT_CONFIG: Record<string, { icon: string; color: string }> = {
  PURCHASE:         { icon: "🛍️",  color: "bg-blue-100   text-blue-800  border-blue-200"  },
  FAULT_REPORTED:   { icon: "⚠️",   color: "bg-orange-100 text-orange-800 border-orange-200" },
  SERVICE_VISIT:    { icon: "🔧",   color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  PAYMENT:          { icon: "💰",   color: "bg-green-100  text-green-800  border-green-200"  },
  PROMISE_MADE:     { icon: "🤝",   color: "bg-purple-100 text-purple-800 border-purple-200" },
  PROMISE_BROKEN:   { icon: "💔",   color: "bg-red-100    text-red-800    border-red-200"    },
  COMPANY_RESPONSE: { icon: "📧",   color: "bg-slate-100  text-slate-700  border-slate-200"  },
  ESCALATION:       { icon: "🚨",   color: "bg-red-100    text-red-800    border-red-200"    },
  REFUND:           { icon: "↩️",   color: "bg-teal-100   text-teal-800   border-teal-200"   },
  REPLACEMENT:      { icon: "🔄",   color: "bg-teal-100   text-teal-800   border-teal-200"   },
  COMPLAINT_FILED:  { icon: "📝",   color: "bg-brand-100  text-brand-800  border-brand-200"  },
  LEGAL_NOTICE:     { icon: "⚖️",   color: "bg-gray-100   text-gray-800   border-gray-200"   },
  OTHER:            { icon: "📌",   color: "bg-slate-100  text-slate-600  border-slate-200"  },
};

export default function TimelinePage() {
  const { id }              = useParams<{ id: string }>();
  const [caseData, setCase] = useState<CaseFull | null>(null);
  const [loading, setLoad]  = useState(true);
  const [adding,  setAdding]= useState(false);
  const [newEvent, setNew]  = useState({ title: "", date: "", eventType: "OTHER", description: "" });
  const [saving,  setSave]  = useState(false);

  async function load() {
    setLoad(true);
    const res  = await fetch(`/api/cases/${id}`);
    const json = await res.json();
    setCase(json.data ?? null);
    setLoad(false);
  }

  useEffect(() => { load(); }, [id]);

  async function addManualEvent() {
    if (!newEvent.title || !newEvent.date) return;
    setSave(true);
    await fetch(`/api/cases/${id}/events`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...newEvent, isManual: true }),
    });
    setAdding(false);
    setNew({ title: "", date: "", eventType: "OTHER", description: "" });
    await load();
    setSave(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-brand-500" size={32}/>
    </div>
  );

  const events = (caseData?.events ?? []) as EventWithDocument[];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-slate-400 mb-6">
        <Link href="/cases">Cases</Link>
        <ChevronRight size={14}/>
        <Link href={`/cases/${id}`} className="hover:text-brand-600 truncate max-w-xs">
          {caseData?.title}
        </Link>
        <ChevronRight size={14}/>
        <span className="text-slate-700">Timeline</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">📅 Evidence Timeline</h1>
          <p className="text-sm text-slate-400 mt-0.5">{events.length} events in chronological order</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary">
          <Plus size={15}/> Add Event
        </button>
      </div>

      {events.length === 0 && !adding && (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm">No events yet. Upload documents to auto-extract events, or add them manually.</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        {events.length > 0 && (
          <div className="absolute left-[120px] top-0 bottom-0 w-0.5 bg-slate-200" />
        )}

        <div className="space-y-4">
          {events.map((ev, idx) => {
            const cfg = EVENT_CONFIG[ev.eventType] ?? EVENT_CONFIG.OTHER;
            const date = new Date(ev.eventDate);
            return (
              <div key={ev.id} className="flex gap-4 relative">
                {/* Date column */}
                <div className="w-[112px] flex-shrink-0 text-right pt-3">
                  <p className="text-xs font-bold text-slate-600">{format(date, "dd MMM yyyy")}</p>
                  <p className="text-xs text-slate-400">{format(date, "EEEE")}</p>
                </div>

                {/* Dot */}
                <div className="relative flex-shrink-0 w-6 flex items-start justify-center pt-3.5 z-10">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 bg-white border-brand-500`}/>
                </div>

                {/* Card */}
                <div className="flex-1 card p-4 mb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{cfg.icon}</span>
                      <h3 className="font-semibold text-slate-800">{ev.title}</h3>
                      <span className={`badge border text-xs ${cfg.color}`}>
                        {ev.eventType.replace(/_/g," ")}
                      </span>
                      {ev.dateConfidence === "APPROXIMATE" && (
                        <span className="badge-yellow text-xs">~ approximate date</span>
                      )}
                    </div>
                  </div>
                  {ev.description && (
                    <p className="text-sm text-slate-600 mt-2">{ev.description}</p>
                  )}
                  {ev.document && (
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      📄 Source: {ev.document.fileName}
                    </p>
                  )}
                  {ev.isManual && (
                    <p className="text-xs text-slate-400 mt-1">✏️ Added manually</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add manual event inline form */}
          {adding && (
            <div className="flex gap-4">
              <div className="w-[112px] flex-shrink-0"/>
              <div className="relative flex-shrink-0 w-6 flex items-start justify-center pt-3.5">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-brand-400"/>
              </div>
              <div className="flex-1 card p-4 border-brand-300">
                <p className="text-sm font-semibold text-slate-700 mb-3">New Event</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="label">Title</label>
                    <input className="input" placeholder="What happened?"
                      value={newEvent.title} onChange={e => setNew(n => ({ ...n, title: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="label">Date</label>
                    <input className="input" type="date"
                      value={newEvent.date} onChange={e => setNew(n => ({ ...n, date: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <select className="input" value={newEvent.eventType}
                      onChange={e => setNew(n => ({ ...n, eventType: e.target.value }))}>
                      {Object.keys(EVENT_CONFIG).map(k => (
                        <option key={k} value={k}>{k.replace(/_/g," ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <input className="input" placeholder="Optional details"
                      value={newEvent.description} onChange={e => setNew(n => ({ ...n, description: e.target.value }))}/>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addManualEvent} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Save
                  </button>
                  <button onClick={() => setAdding(false)} className="btn-secondary">
                    <X size={14}/> Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
