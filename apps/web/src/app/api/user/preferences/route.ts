import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";

const updatePreferencesSchema = z.object({
  whatsappNumber: z.string().nullable().optional(),
  telegramChatId: z.string().nullable().optional(),
  emailNotifications: z.boolean().optional(),
  digestTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  timezone: z.string().optional(),
  digestEnabled: z.boolean().optional(),
  weeklyDigestEnabled: z.boolean().optional(),
  minScoreAlert: z.number().min(0).max(10).optional(),
  maxArticlesDigest: z.number().min(1).max(50).optional(),
  language: z.enum(["fr", "en", "ar"]).optional(),
  categoryIds: z.array(z.string()).optional(),
  sourceIds: z.array(z.string()).optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
    include: {
      categories: { include: { category: true } },
      sources: { include: { source: true } },
    },
  });

  if (!preferences) {
    return NextResponse.json(
      { error: "Preferences not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: preferences });
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = updatePreferencesSchema.parse(await request.json());
    const { categoryIds, sourceIds, ...prefsData } = body;

    const preferences = await prisma.userPreferences.update({
      where: { userId },
      data: prefsData,
    });

    // Update categories if provided
    if (categoryIds !== undefined) {
      await prisma.userCategory.deleteMany({
        where: { preferencesId: preferences.id },
      });
      if (categoryIds.length > 0) {
        await prisma.userCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            preferencesId: preferences.id,
            categoryId,
          })),
        });
      }
    }

    // Update sources if provided
    if (sourceIds !== undefined) {
      await prisma.userSource.deleteMany({
        where: { preferencesId: preferences.id },
      });
      if (sourceIds.length > 0) {
        await prisma.userSource.createMany({
          data: sourceIds.map((sourceId) => ({
            preferencesId: preferences.id,
            sourceId,
          })),
        });
      }
    }

    const updated = await prisma.userPreferences.findUnique({
      where: { userId },
      include: {
        categories: { include: { category: true } },
        sources: { include: { source: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[API] preferences update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
