# 🔗 ClaimChain

> **"Google Maps timeline, but for a consumer dispute."**

ClaimChain is an AI-powered evidence organizer for consumer disputes. Upload your invoices, WhatsApp chats, service reports, photos, and emails — ClaimChain builds a chronological timeline, detects contradictions, tracks promises, and exports a professional evidence pack ready for the National Consumer Helpline, consumer court, or any ombudsman.

---

## The Problem It Solves

You have a dispute with a service center. Your evidence is scattered across:
- WhatsApp conversations
- Email threads  
- Service visit receipts
- Invoice PDFs
- Bank transaction SMS
- Phone photos

All the evidence **exists** but it's **unusable** — you can't see the full story, you don't know what's missing, and you can't prove what the technician promised.

ClaimChain turns that chaos into a clear, dated, sourced timeline in minutes.

---

## Features

| Feature | Description |
|---|---|
| 📎 **Upload Anything** | PDF, WhatsApp .txt export, images, email (.eml), bank SMS paste |
| 🧠 **AI Extraction** | Gemini 1.5 Flash extracts dates, promises, amounts, and parties automatically |
| 📅 **Auto Timeline** | Every document contributes events to a chronological timeline |
| ⚠️ **Contradiction Detection** | AI finds where documents say opposite things |
| 🔍 **Gap Detection** | Identifies missing evidence ("payment without receipt", "visit without report") |
| 🤝 **Promise Tracker** | Every commitment made gets tracked with fulfilled/broken status |
| 📊 **Evidence Graph** | Visual map: documents → events → payments |
| 📋 **PDF Export** | Print-ready evidence pack with footnotes for courts/regulators |
| 💰 **Payment Tracking** | All money paid, flagged if receipt is missing |

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (local or cloud — Supabase/Neon are free)
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone and install

```bash
git clone https://github.com/Akshay27079/claimchain.git
cd claimchain
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and GEMINI_API_KEY
```

### 3. Set up database

```bash
npx prisma db push        # Create tables
npx prisma generate       # Generate client
```

### 4. Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM |
| AI | Google Gemini 1.5 Flash |
| File Parsing | pdf-parse, custom WhatsApp parser, custom SMS parser |
| Visualization | ReactFlow (evidence graph) |
| Auth | NextAuth.js v5 |

---

## Architecture

```
Upload File
    │
    ▼
extractText()          ← pdf.ts / whatsapp.ts / sms.ts / image
    │
    ▼
extractFromText()      ← Gemini 1.5 Flash
    │
    ├── Events[]       → event table → Timeline view
    ├── Promises[]     → promise table → Intelligence panel
    ├── Payments[]     → payment table → Intelligence panel
    ├── Parties[]      → party table
    └── ProductInfo    → case table (auto-fill)
    │
    ▼
analyzeCase()          ← Gemini (run manually)
    │
    ├── Contradictions → contradiction table
    └── Gaps           → gap table
    │
    ▼
/api/export/[id]       ← HTML report → Print to PDF
```

---

## Revenue Model

| Tier | Price | Features |
|---|---|---|
| Free | ₹0 | 1 active case, basic timeline |
| Case Pack | ₹99 | Full evidence PDF export, all AI features |
| Unlimited | ₹299/month | Unlimited cases, priority AI, legal notice template |
| B2B API | Custom | Warranty companies, insurers, legal firms |

---

## Roadmap

- [ ] Legal notice auto-draft (Consumer Protection Act format)
- [ ] NCH / e-Jagriti form auto-fill
- [ ] Mobile app (React Native)
- [ ] Shared case links (for lawyers/consumer forums)
- [ ] Multi-language support (Hindi, Marathi, Tamil)
- [ ] Ombudsman integration (Banking, Insurance, Telecom)

---

## Privacy

All files are stored **locally on your server** (or your own Supabase storage). ClaimChain never sends your personal documents to any third party except Google Gemini for AI extraction, and only the extracted text (not the original file) is sent.

---

*ClaimChain is an independent open-source project. It is not affiliated with or endorsed by any government agency.*
