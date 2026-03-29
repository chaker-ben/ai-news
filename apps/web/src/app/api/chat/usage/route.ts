import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@ai-news/db";
import { getPlanLimits } from "@/lib/plan-limits";
import { getUserPlan } from "../_lib/get-user-plan";

interface UsageResponse {
  messages_today: number;
  messages_limit: number;
  tokens_this_month: number;
  tokens_limit: number;
  can_chat: boolean;
}

export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);

    // Start of today (UTC)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // First day of current month (UTC)
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [messagesToday, tokensThisMonth] = await Promise.all([
      // Count user messages sent today
      prisma.chatMessage.count({
        where: {
          role: "user",
          createdAt: { gte: todayStart },
          conversation: { userId },
        },
      }),
      // Sum tokens used this month
      prisma.aiCreditUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: monthStart },
        },
        _sum: { tokensUsed: true },
      }),
    ]);

    const tokensUsed = tokensThisMonth._sum.tokensUsed ?? 0;
    const messagesLimit = limits.chat_messages_per_day;
    const tokensLimit = limits.ai_tokens_per_month;

    // Can chat if within both limits (or unlimited = -1)
    const withinMessageLimit =
      messagesLimit === -1 || messagesToday < messagesLimit;
    const withinTokenLimit = tokensLimit === -1 || tokensUsed < tokensLimit;
    const canChat =
      limits.chat_messages_per_day !== 0 &&
      withinMessageLimit &&
      withinTokenLimit;

    const response: UsageResponse = {
      messages_today: messagesToday,
      messages_limit: messagesLimit,
      tokens_this_month: tokensUsed,
      tokens_limit: tokensLimit,
      can_chat: canChat,
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("[API] chat usage error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
