import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";
import { isFeatureAllowed } from "@/lib/plan-limits";
import { getUserPlan } from "../_lib/get-user-plan";

const createConversationSchema = z.object({
  articleId: z.string().min(1),
});

const listQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { skip, take } = listQuerySchema.parse(searchParams);

    const [conversations, total] = await Promise.all([
      prisma.chatConversation.findMany({
        where: { userId },
        include: {
          article: {
            select: {
              id: true,
              originalTitle: true,
              titleFr: true,
              titleEn: true,
              thumbnailUrl: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
      prisma.chatConversation.count({ where: { userId } }),
    ]);

    return NextResponse.json({ data: conversations, total, skip, take });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] chat conversations list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = createConversationSchema.parse(await request.json());

    // Check plan allows chat
    const plan = await getUserPlan(userId);
    if (!isFeatureAllowed(plan, "ai_chat")) {
      return NextResponse.json(
        { error: "AI Chat is not available on your current plan" },
        { status: 403 },
      );
    }

    // Check article exists
    const article = await prisma.article.findUnique({
      where: { id: body.articleId },
      select: { id: true, originalTitle: true, titleFr: true },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 },
      );
    }

    const conversation = await prisma.chatConversation.create({
      data: {
        userId,
        articleId: body.articleId,
        title: article.titleFr ?? article.originalTitle,
      },
      include: {
        article: {
          select: {
            id: true,
            originalTitle: true,
            titleFr: true,
            titleEn: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ data: conversation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] chat conversation create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
