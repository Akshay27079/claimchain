/**
 * POST /api/upload
 * Accepts multipart form with: caseId, file(s)
 * Parses each file, runs AI extraction, saves to DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir }         from "fs/promises";
import { join }                      from "path";
import { existsSync }               from "fs";
import { v4 as uuidv4 }            from "uuid";
import { prisma }                   from "@/lib/prisma";
import { extractText }              from "@/lib/parsers";
import { extractFromText, extractFromImage } from "@/lib/ai/extract";
import type { UploadResponse }      from "@/types";
import { parseISO, isValid }        from "date-fns";
import { DateConfidence }           from "@prisma/client";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData  = await req.formData();
    const caseId    = formData.get("caseId") as string;
    const files     = formData.getAll("files") as File[];

    if (!caseId)        return NextResponse.json({ error: "caseId required" }, { status: 400 });
    if (!files?.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

    // Verify case exists
    const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord)  return NextResponse.json({ error: "Case not found" }, { status: 404 });

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });

    const results: UploadResponse[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File ${file.name} exceeds 20 MB limit` }, { status: 413 });
      }

      const buffer      = Buffer.from(await file.arrayBuffer());
      const ext         = file.name.split(".").pop() ?? "bin";
      const storedName  = `${uuidv4()}.${ext}`;
      const filePath    = join(UPLOAD_DIR, storedName);

      // Write to disk
      await writeFile(filePath, buffer);

      // Extract text
      const isImage = file.type.startsWith("image/");
      const { text, docType, meta } = isImage
        ? { text: "", docType: "PHOTO" as const, meta: { isImage: true } }
        : await extractText(buffer, file.type, file.name);

      // AI extraction
      const extracted = isImage
        ? await extractFromImage(buffer, file.type)
        : await extractFromText(text, docType);

      // Save document to DB
      const document = await prisma.document.create({
        data: {
          caseId,
          fileName:    file.name,
          storedName,
          mimeType:    file.type,
          sizeBytes:   file.size,
          docType:     extracted.docType,
          rawText:     isImage ? extracted.summary : text.slice(0, 100_000),
        },
      });

      // Persist extracted events
      let eventsCreated   = 0;
      let promisesCreated = 0;
      let paymentsCreated = 0;

      for (const ev of extracted.events) {
        const parsedDate = tryParseDate(ev.date);
        if (!parsedDate) continue;

        await prisma.event.create({
          data: {
            caseId,
            documentId:     document.id,
            title:          ev.title,
            description:    ev.description,
            eventDate:      parsedDate,
            dateConfidence: ev.confidence >= 0.8 ? DateConfidence.EXTRACTED : DateConfidence.APPROXIMATE,
            eventType:      ev.eventType,
            isManual:       false,
          },
        });
        eventsCreated++;
      }

      // Persist extracted promises
      for (const pr of extracted.promises) {
        await prisma.promise.create({
          data: {
            caseId,
            documentId: document.id,
            text:       pr.text,
            madeBy:     pr.madeBy ?? null,
            madeOn:     tryParseDate(pr.dueDate ?? null) ?? undefined,
          },
        });
        promisesCreated++;
      }

      // Persist extracted payments
      for (const pay of extracted.payments) {
        await prisma.payment.create({
          data: {
            caseId,
            documentId: document.id,
            amount:     pay.amount,
            currency:   pay.currency ?? "INR",
            purpose:    pay.purpose ?? null,
            paidOn:     tryParseDate(pay.date ?? null) ?? undefined,
            hasReceipt: pay.hasReceipt,
          },
        });
        paymentsCreated++;
      }

      // Persist new parties (upsert by name within case)
      for (const party of extracted.parties) {
        const existing = await prisma.party.findFirst({
          where: { caseId, name: party.name },
        });
        if (!existing) {
          await prisma.party.create({
            data: { caseId, name: party.name, role: party.role },
          });
        }
      }

      // Update case product info if invoice/warranty and fields are empty
      if (extracted.productInfo && (extracted.docType === "INVOICE" || extracted.docType === "WARRANTY")) {
        const pi = extracted.productInfo;
        await prisma.case.update({
          where: { id: caseId },
          data: {
            productName:   caseRecord.productName   || pi.name    || undefined,
            modelNumber:   caseRecord.modelNumber   || pi.model   || undefined,
            serialNumber:  caseRecord.serialNumber  || pi.serial  || undefined,
            purchaseDate:  caseRecord.purchaseDate  || tryParseDate(pi.purchaseDate  ?? null) || undefined,
            warrantyExpiry:caseRecord.warrantyExpiry|| tryParseDate(pi.warrantyExpiry ?? null) || undefined,
            sellerName:    caseRecord.sellerName    || pi.sellerName || undefined,
          },
        });
      }

      results.push({
        documentId:      document.id,
        fileName:        file.name,
        docType:         document.docType,
        extracted,
        eventsCreated,
        promisesCreated,
        paymentsCreated,
      });
    }

    return NextResponse.json({ data: results }, { status: 201 });
  } catch (err) {
    console.error("[Upload API]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

function tryParseDate(raw: string | null | undefined): Date | null {
  if (!raw || raw === "unknown" || raw === "null") return null;
  try {
    const d = parseISO(raw);
    if (isValid(d)) return d;
    const d2 = new Date(raw);
    if (isValid(d2)) return d2;
  } catch (_) {}
  return null;
}
