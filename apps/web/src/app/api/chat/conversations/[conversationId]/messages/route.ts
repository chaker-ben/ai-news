import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";
import { env } from "@/lib/env";
import { getPlanLimits } from "@/lib/plan-limits";
import { getUserPlan } from "../../../_lib/get-user-plan";

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

const listQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(50),
});

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;

    // Verify conversation belongs to user
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (conversation.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { skip, take } = listQuerySchema.parse(searchParams);

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        skip,
        take,
      }),
      prisma.chatMessage.count({ where: { conversationId } }),
    ]);

    return NextResponse.json({ data: messages, total, skip, take });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] chat messages list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    const body = sendMessageSchema.parse(await request.json());

    // Verify conversation belongs to user and fetch article data
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        article: {
          select: {
            originalTitle: true,
            titleFr: true,
            titleEn: true,
            originalContent: true,
            summaryFr: true,
            summaryEn: true,
            url: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (conversation.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check rate limits
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [messagesToday, tokensThisMonth] = await Promise.all([
      prisma.chatMessage.count({
        where: {
          role: "user",
          createdAt: { gte: todayStart },
          conversation: { userId },
        },
      }),
      prisma.aiCreditUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: monthStart },
        },
        _sum: { tokensUsed: true },
      }),
    ]);

    const messagesLimit = limits.chat_messages_per_day;
    const tokensLimit = limits.ai_tokens_per_month;
    const tokensUsed = tokensThisMonth._sum.tokensUsed ?? 0;

    if (messagesLimit !== -1 && messagesToday >= messagesLimit) {
      return NextResponse.json(
        { error: "Daily message limit reached" },
        { status: 429 },
      );
    }

    if (tokensLimit !== -1 && tokensUsed >= tokensLimit) {
      return NextResponse.json(
        { error: "Monthly token limit reached" },
        { status: 429 },
      );
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: "user",
        content: body.content,
        tokensUsed: 0,
      },
    });

    // Build article context
    const article = conversation.article;
    const articleTitle =
      article.titleFr ?? article.titleEn ?? article.originalTitle;
    const articleContent =
      article.summaryFr ??
      article.summaryEn ??
      article.originalContent ??
      "No content available.";

    const systemPrompt = `You are an AI assistant helping a user understand and discuss an AI news article.
Article title: ${articleTitle}
Article content: ${articleContent}
Article source: ${article.url ?? "Unknown"}

Answer questions about this article. Be concise and informative. If the user asks about topics not related to this article, politely redirect them to the article's content.
Respond in the same language the user writes in.`;

    // Fetch recent conversation history (last 20 messages)
    const recentMessages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { role: true, content: true },
    });

    const conversationMessages: Anthropic.MessageParam[] = recentMessages.map(
      (msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }),
    );

    // Stream response via SSE
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: systemPrompt,
            messages: conversationMessages,
            stream: true,
          });

          let fullContent = "";
          let inputTokens = 0;
          let outputTokens = 0;

          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullContent += event.delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`,
                ),
              );
            }
            if (event.type === "message_start") {
              inputTokens = event.message.usage.input_tokens;
            }
            if (event.type === "message_delta") {
              outputTokens = event.usage.output_tokens;
            }
          }

          // Save assistant message and update usage
          const totalTokens = inputTokens + outputTokens;

          await prisma.$transaction([
            prisma.chatMessage.create({
              data: {
                conversationId,
                role: "assistant",
                content: fullContent,
                tokensUsed: totalTokens,
              },
            }),
            prisma.chatConversation.update({
              where: { id: conversationId },
              data: {
                tokenCount: { increment: totalTokens },
                messageCount: { increment: 2 },
              },
            }),
            prisma.aiCreditUsage.create({
              data: {
                userId,
                action: "chat",
                tokensUsed: totalTokens,
                conversationId,
              },
            }),
          ]);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", tokens_used: totalTokens })}\n\n`,
            ),
          );
          controller.close();
        } catch (error) {
          console.error("[API] chat stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "AI response failed" })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] chat message send error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
