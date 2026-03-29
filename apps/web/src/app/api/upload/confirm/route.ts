import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@ai-news/db";

const confirmSchema = z.object({
  articleId: z.string().min(1),
  key: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  type: z.enum(["image", "video"]),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = confirmSchema.parse(await request.json());

    // Verify user owns the article
    const article = await prisma.article.findUnique({
      where: { id: body.articleId },
      select: { id: true, authorId: true },
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

    // Determine order: count existing media for this article
    const existingCount = await prisma.articleMedia.count({
      where: { articleId: body.articleId },
    });

    const media = await prisma.articleMedia.create({
      data: {
        articleId: body.articleId,
        type: body.type,
        url: body.url,
        key: body.key,
        size: body.sizeBytes,
        mimeType: body.mimeType,
        order: existingCount + 1,
      },
    });

    return NextResponse.json({ data: media }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] upload confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
