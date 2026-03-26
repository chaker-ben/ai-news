import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";

const createAlertSchema = z.object({
  name: z.string().min(1).max(100),
  keywords: z.array(z.string().min(1)).min(1).max(20),
  channels: z.array(z.enum(["whatsapp", "email", "telegram"])).min(1),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.customAlert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: alerts });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createAlertSchema.parse(await request.json());

    const alert = await prisma.customAlert.create({
      data: {
        userId,
        name: body.name,
        keywords: body.keywords,
        channels: body.channels,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ data: alert }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] create alert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
