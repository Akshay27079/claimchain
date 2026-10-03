import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimChain — Organize Your Consumer Dispute Evidence",
  description: "Auto-build a timeline, detect contradictions, and export a professional evidence pack for any consumer dispute.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
