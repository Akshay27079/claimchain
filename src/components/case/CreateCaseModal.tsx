"use client";

import { useState } from "react";
import { X } from "lucide-react";

const CATEGORIES = [
  { value: "PRODUCT",   label: "📦 Product" },
  { value: "SERVICE",   label: "🔧 Service" },
  { value: "INSURANCE", label: "🛡️ Insurance" },
  { value: "TELECOM",   label: "📱 Telecom" },
  { value: "BANKING",   label: "🏦 Banking" },
  { value: "ECOMMERCE", label: "🛒 E-Commerce" },
  { value: "BUILDER",   label: "🏗️ Builder" },
  { value: "OTHER",     label: "📋 Other" },
];

interface Props {
  userId:    string;
  onClose:   () => void;
  onCreated: () => void;
}

export default function CreateCaseModal({ userId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title:        "",
    description:  "",
    category:     "PRODUCT",
    productName:  "",
    modelNumber:  "",
    sellerName:   "",
    purchaseDate: "",
    warrantyExpiry: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/cases", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, userId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create case"); return; }
      onCreated();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold">New Case</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18}/></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="label">Case Title <span className="text-red-500">*</span></label>
            <input className="input" placeholder='e.g. "AC stopped working — LG Service Center"'
              value={form.title} onChange={e => set("title", e.target.value)} />
          </div>

          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => set("category", e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Brief Description</label>
            <textarea className="input resize-none" rows={3}
              placeholder="What happened in 1–2 sentences..."
              value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          <div className="border-t pt-4">
            <p className="section-title">Product / Service Details (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Product Name</label>
                <input className="input" placeholder='e.g. "LG 1.5 Ton AC"'
                  value={form.productName} onChange={e => set("productName", e.target.value)} />
              </div>
              <div>
                <label className="label">Model Number</label>
                <input className="input" placeholder='e.g. "KS-Q18YNXA"'
                  value={form.modelNumber} onChange={e => set("modelNumber", e.target.value)} />
              </div>
              <div>
                <label className="label">Seller / Company</label>
                <input className="input" placeholder='e.g. "Reliance Digital"'
                  value={form.sellerName} onChange={e => set("sellerName", e.target.value)} />
              </div>
              <div>
                <label className="label">Purchase Date</label>
                <input className="input" type="date"
                  value={form.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Warranty Expiry</label>
                <input className="input" type="date"
                  value={form.warrantyExpiry} onChange={e => set("warrantyExpiry", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Creating…" : "Create Case"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
