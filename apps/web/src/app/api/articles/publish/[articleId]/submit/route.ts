import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@ai-news/db";
import type { PlanSlug } from "@ai-news/db";

interface RouteParams {
  params: Promise<{ articleId: string }>;
}

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

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { articleId } = await params;

    // Find article and verify ownership
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        authorId: true,
        status: true,
        originalTitle: true,
        originalContent: true,
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

    if (article.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft articles can be submitted" },
        { status: 400 },
      );
    }

    // Validate article has required content
    if (!article.originalTitle || article.originalTitle.trim().length === 0) {
      return NextResponse.json(
        { error: "Article must have a title before submitting" },
        { status: 400 },
      );
    }

    if (
      !article.originalContent ||
      article.originalContent.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Article must have content before submitting" },
        { status: 400 },
      );
    }

    // Determine status based on plan
    const plan = await resolveUserPlan(userId);

    const isAutoPublish = plan === "team" || plan === "enterprise";
    const newStatus = isAutoPublish ? "published" : "pending_review";

    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (isAutoPublish) {
      updateData.publishedAt = new Date();
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
    console.error("[API] submit article error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
