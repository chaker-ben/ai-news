import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@ai-news/db";
import type { PlanSlug } from "@ai-news/db";
import { getPlanLimits } from "@/lib/plan-limits";
import {
  validateMediaType,
  validateMediaSize,
  createPresignedUploadUrl,
} from "@/lib/upload";

const presignSchema = z.object({
  articleId: z.string().min(1),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  category: z.enum(["image", "video"]),
});

async function resolveUserPlan(userId: string): Promise<PlanSlug> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });

  return subscription?.status === "active" ||
    subscription?.status === "trialing"
    ? subscription.plan
    : "free";
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = presignSchema.parse(await request.json());

    // Verify user owns the article
    const article = await prisma.article.findUnique({
      where: { id: body.articleId },
      select: {
        id: true,
        authorId: true,
        media: { select: { type: true } },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 },
      );
    }

    if (article.authorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate mime type and size
    const typeValidation = validateMediaType(body.mimeType, body.category);
    if (!typeValidation.valid) {
      return NextResponse.json(
        { error: typeValidation.error },
        { status: 400 },
      );
    }

    const sizeValidation = validateMediaSize(body.sizeBytes, body.category);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 },
      );
    }

    // Check plan limits for media count
    const plan = await resolveUserPlan(userId);
    const limits = getPlanLimits(plan);

    const existingImages = article.media.filter(
      (m) => m.type === "image",
    ).length;
    const existingVideos = article.media.filter(
      (m) => m.type === "video",
    ).length;

    if (body.category === "image") {
      const maxImages = limits.max_images_per_article;
      if (maxImages !== -1 && existingImages >= maxImages) {
        return NextResponse.json(
          {
            error: `Maximum ${maxImages} images per article reached`,
          },
          { status: 403 },
        );
      }
    }

    if (body.category === "video") {
      const maxVideos = limits.max_videos_per_article;
      if (maxVideos !== -1 && existingVideos >= maxVideos) {
        return NextResponse.json(
          {
            error: `Maximum ${maxVideos} videos per article reached`,
          },
          { status: 403 },
        );
      }
    }

    // Generate presigned URL
    const result = await createPresignedUploadUrl(
      userId,
      body.articleId,
      body.filename,
      body.mimeType,
      body.sizeBytes,
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] presign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
