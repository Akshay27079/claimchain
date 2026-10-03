"use client";

import { useRef, useState, DragEvent } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";

interface Props {
  caseId:     string;
  onUploaded: () => void;
}

interface FileState {
  file:    File;
  status:  "pending" | "uploading" | "done" | "error";
  message: string;
}

const ACCEPT = ".pdf,.txt,.jpg,.jpeg,.png,.eml,.mbox";

export default function UploadZone({ caseId, onUploaded }: Props) {
  const inputRef                   = useRef<HTMLInputElement>(null);
  const [files,   setFiles]        = useState<FileState[]>([]);
  const [dragging, setDragging]    = useState(false);
  const [uploading, setUploading]  = useState(false);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next: FileState[] = Array.from(incoming).map(f => ({
      file: f, status: "pending", message: ""
    }));
    setFiles(prev => [...prev, ...next]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function upload() {
    const pending = files.filter(f => f.status === "pending");
    if (!pending.length) return;
    setUploading(true);

    // Upload all at once
    const formData = new FormData();
    formData.append("caseId", caseId);
    pending.forEach(f => formData.append("files", f.file));

    setFiles(prev => prev.map(f =>
      f.status === "pending" ? { ...f, status: "uploading" } : f
    ));

    try {
      const res  = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setFiles(prev => prev.map(f =>
          f.status === "uploading" ? { ...f, status: "error", message: json.error ?? "Upload failed" } : f
        ));
      } else {
        const results: Array<{ fileName: string; eventsCreated: number; promisesCreated: number }> = json.data ?? [];
        setFiles(prev => prev.map(f => {
          if (f.status !== "uploading") return f;
          const r = results.find(r => r.fileName === f.file.name);
          return {
            ...f,
            status:  "done",
            message: r ? `${r.eventsCreated} events, ${r.promisesCreated} promises extracted` : "Uploaded",
          };
        }));
        onUploaded();
      }
    } catch (_) {
      setFiles(prev => prev.map(f =>
        f.status === "uploading" ? { ...f, status: "error", message: "Network error" } : f
      ));
    } finally {
      setUploading(false);
    }
  }

  const hasPending = files.some(f => f.status === "pending");

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${dragging ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-400 hover:bg-slate-50"}`}
      >
        <Upload size={24} className="mx-auto text-slate-400 mb-2"/>
        <p className="text-sm font-medium text-slate-600">Drop files here or click to browse</p>
        <p className="text-xs text-slate-400 mt-1">PDF, WhatsApp .txt, Images, Email (.eml)</p>
        <input
          ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-sm bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-400 flex-shrink-0">
                {f.status === "uploading" && <Loader2 size={14} className="animate-spin"/>}
                {f.status === "done"      && <CheckCircle size={14} className="text-green-500"/>}
                {f.status === "error"     && <AlertCircle size={14} className="text-red-500"/>}
                {f.status === "pending"   && <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300"/>}
              </span>
              <span className="flex-1 truncate font-medium text-slate-700">{f.file.name}</span>
              {f.message && <span className="text-xs text-slate-400 truncate max-w-[140px]">{f.message}</span>}
              {f.status === "pending" && (
                <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-400">
                  <X size={14}/>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasPending && (
        <button onClick={upload} disabled={uploading} className="btn-primary w-full justify-center">
          {uploading ? <Loader2 size={15} className="animate-spin"/> : <Upload size={15}/>}
          {uploading ? "Uploading & Extracting…" : `Upload ${files.filter(f => f.status === "pending").length} File(s)`}
        </button>
      )}
    </div>
  );
}
