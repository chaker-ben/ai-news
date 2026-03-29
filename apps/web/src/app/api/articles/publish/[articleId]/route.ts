import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@ai-news/db";
import { deleteObject } from "@/lib/upload";

const updateArticleSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(50_000).optional(),
  originalUrl: z.string().url().nullable().optional(),
  language: z.enum(["fr", "en", "ar"]).optional(),
});

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;
    const body = updateArticleSchema.parse(await request.json());

    // Find article and verify ownership + draft status
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, authorId: true, status: true },
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

    if (article.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft articles can be edited" },
        { status: 400 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) {
      updateData.originalTitle = body.title;

      // Update the language-specific title if language is provided
      if (body.language) {
        switch (body.language) {
          case "fr":
            updateData.titleFr = body.title;
            break;
          case "en":
            updateData.titleEn = body.title;
            break;
          case "ar":
            updateData.titleAr = body.title;
            break;
        }
      }
    }

    if (body.content !== undefined) {
      updateData.originalContent = body.content;
    }

    if (body.originalUrl !== undefined) {
      updateData.originalUrl = body.originalUrl;
    }

    const updated = await prisma.article.update({
      where: { id: articleId },
      data: updateData,
      include: {
        media: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] update article error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;

    // Find article with media
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        authorId: true,
        status: true,
        media: { select: { key: true } },
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

    if (article.status !== "draft" && article.status !== "rejected") {
      return NextResponse.json(
        { error: "Only draft or rejected articles can be deleted" },
        { status: 400 },
      );
    }

    // Delete media files from R2
    const deletePromises = article.media.map((m) => deleteObject(m.key));
    await Promise.allSettled(deletePromises);

    // Delete article (cascades to ArticleMedia via onDelete: Cascade)
    await prisma.article.delete({
      where: { id: articleId },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[API] delete article error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
