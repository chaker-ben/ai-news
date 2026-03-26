import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";

const updateAlertSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  keywords: z.array(z.string().min(1)).min(1).max(20).optional(),
  channels: z.array(z.enum(["whatsapp", "email", "telegram"])).min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { alertId } = await params;

  try {
    const body = updateAlertSchema.parse(await request.json());

    const alert = await prisma.customAlert.updateMany({
      where: { id: alertId, userId },
      data: body,
    });

    if (alert.count === 0) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const updated = await prisma.customAlert.findUnique({ where: { id: alertId } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] update alert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { alertId } = await params;

  const result = await prisma.customAlert.deleteMany({
    where: { id: alertId, userId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { deleted: true } });
}
