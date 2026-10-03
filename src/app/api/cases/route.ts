import { NextRequest, NextResponse } from "next/server";
import { prisma }    from "@/lib/prisma";
import { z }         from "zod";

const CreateCaseSchema = z.object({
  title:         z.string().min(3).max(200),
  description:   z.string().optional(),
  category:      z.enum(["PRODUCT","SERVICE","INSURANCE","TELECOM","BANKING","ECOMMERCE","BUILDER","OTHER"]).default("PRODUCT"),
  productName:   z.string().optional(),
  modelNumber:   z.string().optional(),
  serialNumber:  z.string().optional(),
  sellerName:    z.string().optional(),
  purchaseDate:  z.string().optional(),
  warrantyExpiry:z.string().optional(),
  userId:        z.string(), // from session in real app
});

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "demo-user";
  try {
    const cases = await prisma.case.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { documents: true, events: true, promises: true, payments: true, contradictions: true, gaps: true }
        }
      }
    });
    return NextResponse.json({ data: cases });
  } catch (err) {
    console.error("[GET /api/cases]", err);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = CreateCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { purchaseDate, warrantyExpiry, ...rest } = parsed.data;

    // Ensure demo user exists
    await prisma.user.upsert({
      where:  { id: rest.userId },
      update: {},
      create: { id: rest.userId, email: `${rest.userId}@demo.claimchain.in`, name: "Demo User" },
    });

    const newCase = await prisma.case.create({
      data: {
        ...rest,
        purchaseDate:  purchaseDate  ? new Date(purchaseDate)  : undefined,
        warrantyExpiry:warrantyExpiry? new Date(warrantyExpiry): undefined,
      },
    });
    return NextResponse.json({ data: newCase }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/cases]", err);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}
