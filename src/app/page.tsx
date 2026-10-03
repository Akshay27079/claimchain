import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 flex flex-col items-center justify-center px-4 text-white">
      <div className="text-center max-w-2xl">
        <div className="text-6xl mb-4">🔗</div>
        <h1 className="text-4xl font-bold mb-4">ClaimChain</h1>
        <p className="text-lg text-brand-200 mb-2">
          Never lose a consumer dispute again.
        </p>
        <p className="text-brand-200 mb-10 text-sm leading-relaxed max-w-lg mx-auto">
          Upload your invoices, WhatsApp chats, service reports, and photos.
          ClaimChain builds a timeline, detects contradictions, and exports a
          professional evidence pack — ready for NCH, consumer court, or any ombudsman.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/cases" className="btn-primary text-base px-6 py-3 bg-white text-brand-700 hover:bg-brand-50 rounded-xl font-semibold">
            Start a Case →
          </Link>
          <Link href="/cases" className="btn-secondary text-base px-6 py-3 border-white/30 text-white hover:bg-white/10 rounded-xl font-semibold">
            View Demo
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-3 gap-6 text-center max-w-2xl w-full">
        {[
          { icon: "📎", title: "Upload Anything", desc: "PDF, WhatsApp .txt, images, emails, bank SMS" },
          { icon: "🧠", title: "AI Extracts Facts", desc: "Dates, promises, payments, contradictions — automatic" },
          { icon: "📋", title: "Export Evidence", desc: "Print-ready pack with footnotes for courts or regulators" },
        ].map(f => (
          <div key={f.title} className="bg-white/10 rounded-xl p-5 backdrop-blur-sm">
            <div className="text-3xl mb-2">{f.icon}</div>
            <div className="font-semibold text-sm mb-1">{f.title}</div>
            <div className="text-xs text-brand-200">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
