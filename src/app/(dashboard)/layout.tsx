import Link from "next/link";
import { Scale, LayoutDashboard, FolderOpen } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Topnav */}
      <header className="h-14 bg-white border-b flex items-center px-6 gap-6 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700 text-lg">
          <span className="text-2xl">🔗</span>
          <span>ClaimChain</span>
        </Link>
        <nav className="flex items-center gap-1 ml-4">
          <Link href="/cases" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            <FolderOpen size={15} />
            My Cases
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">Demo Mode</span>
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">D</div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
