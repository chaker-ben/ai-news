import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@ai-news/db";
import type { ArticleStatus } from "@ai-news/db";

const statusFilterSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "rejected",
]);

const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse pagination
    const pagination = paginationSchema.parse({
      skip: searchParams.get("skip") ?? 0,
      take: searchParams.get("take") ?? 20,
    });

    // Build filter
    const where: {
      authorId: string;
      isUserGenerated: boolean;
      status?: ArticleStatus;
    } = {
      authorId: userId,
      isUserGenerated: true,
    };

    const statusParam = searchParams.get("status");
    if (statusParam) {
      const parsed = statusFilterSchema.safeParse(statusParam);
      if (parsed.success) {
        where.status = parsed.data;
      }
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          media: {
            orderBy: { order: "asc" },
          },
          _count: {
            select: { media: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      data: articles,
      pagination: {
        total,
        skip: pagination.skip,
        take: pagination.take,
        hasMore: pagination.skip + pagination.take < total,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] my articles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
