import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DateConfidence } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const event = await prisma.event.create({
      data: {
        caseId:         params.id,
        title:          body.title,
        description:    body.description ?? null,
        eventDate:      new Date(body.date),
        eventType:      body.eventType ?? "OTHER",
        dateConfidence: DateConfidence.USER_SET,
        isManual:       true,
      },
    });
    return NextResponse.json({ data: event }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
