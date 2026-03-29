import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@ai-news/db";
import type { PlanSlug, ArticleStatus } from "@ai-news/db";
import { getPlanLimits, isFeatureAllowed } from "@/lib/plan-limits";

const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().max(50_000).optional(),
  originalUrl: z.string().url().optional(),
  language: z.enum(["fr", "en", "ar"]).default("fr"),
});

const statusFilterSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "rejected",
]);

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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const where: {
      authorId: string;
      isUserGenerated: boolean;
      status?: ArticleStatus;
    } = {
      authorId: userId,
      isUserGenerated: true,
    };

    if (statusParam) {
      const parsed = statusFilterSchema.safeParse(statusParam);
      if (parsed.success) {
        where.status = parsed.data;
      }
    }

    const articles = await prisma.article.findMany({
      where,
      include: {
        media: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: articles });
  } catch (error) {
    console.error("[API] list drafts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = createArticleSchema.parse(await request.json());

    // Check plan allows publishing
    const plan = await resolveUserPlan(userId);
    if (!isFeatureAllowed(plan, "publish_article")) {
      return NextResponse.json(
        {
          error:
            "Your plan does not allow publishing articles. Please upgrade.",
        },
        { status: 403 },
      );
    }

    // Check monthly article limit
    const limits = getPlanLimits(plan);
    if (limits.published_articles_per_month !== -1) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const articlesThisMonth = await prisma.article.count({
        where: {
          authorId: userId,
          isUserGenerated: true,
          createdAt: { gte: startOfMonth },
        },
      });

      if (articlesThisMonth >= limits.published_articles_per_month) {
        return NextResponse.json(
          {
            error: `Monthly article limit reached (${limits.published_articles_per_month}). Please upgrade your plan.`,
          },
          { status: 403 },
        );
      }
    }

    // Build title fields based on language
    const titleFields: Record<string, string> = {};
    switch (body.language) {
      case "fr":
        titleFields.titleFr = body.title;
        break;
      case "en":
        titleFields.titleEn = body.title;
        break;
      case "ar":
        titleFields.titleAr = body.title;
        break;
    }

    const article = await prisma.article.create({
      data: {
        authorId: userId,
        isUserGenerated: true,
        status: "draft",
        originalTitle: body.title,
        originalContent: body.content ?? null,
        originalUrl: body.originalUrl ?? null,
        ...titleFields,
      },
      include: {
        media: true,
      },
    });

    return NextResponse.json({ data: article }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] create article error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
