"use client";

import type { Document } from "@/types";
import { format }       from "date-fns";

const DOC_ICONS: Record<string, string> = {
  INVOICE: "🧾", WARRANTY: "🛡️", SERVICE_REPORT: "🔧",
  WHATSAPP_EXPORT: "💬", EMAIL: "📧", PHOTO: "📷",
  BANK_SMS: "💳", BANK_STATEMENT: "🏦", LEGAL_NOTICE: "⚖️",
  COMPLAINT: "📝", SCREENSHOT: "🖥️", OTHER: "📄",
};

interface Props { documents: Document[] }

export default function DocumentList({ documents }: Props) {
  if (!documents.length) return (
    <p className="text-sm text-slate-400 text-center py-4">No documents uploaded yet.</p>
  );

  return (
    <ul className="space-y-2">
      {documents.map(d => (
        <li key={d.id} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
          <span className="text-lg flex-shrink-0">{DOC_ICONS[d.docType] ?? "📄"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-700 truncate">{d.fileName}</p>
            <p className="text-xs text-slate-400">
              {d.docType.replace(/_/g, " ")} · {(d.sizeBytes / 1024).toFixed(0)} KB
            </p>
          </div>
          <span className="text-xs text-slate-300 flex-shrink-0">
            {format(new Date(d.uploadedAt), "dd MMM")}
          </span>
        </li>
      ))}
    </ul>
  );
}
