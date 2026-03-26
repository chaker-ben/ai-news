import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@ai-news/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Articles by source type
    const sourceDistribution = await prisma.article.groupBy({
      by: ["sourceType"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Articles per day (last 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentArticles = await prisma.article.findMany({
      where: { publishedAt: { gte: fourteenDaysAgo } },
      select: { publishedAt: true, score: true, sourceType: true },
      orderBy: { publishedAt: "asc" },
    });

    // Group by day
    const dailyCounts: Record<string, number> = {};
    const dailyScores: Record<string, number[]> = {};

    for (const article of recentArticles) {
      const day = article.publishedAt.toISOString().split("T")[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      if (!dailyScores[day]) dailyScores[day] = [];
      dailyScores[day].push(article.score);
    }

    const dailyActivity = Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count,
      avgScore:
        dailyScores[date].length > 0
          ? Number(
              (
                dailyScores[date].reduce((a, b) => a + b, 0) /
                dailyScores[date].length
              ).toFixed(1),
            )
          : 0,
    }));

    // Score distribution (buckets: 0-2, 2-4, 4-6, 6-8, 8-10)
    const allScores = await prisma.article.findMany({
      select: { score: true },
      where: { score: { gt: 0 } },
    });

    const scoreBuckets = [
      { label: "0-2", min: 0, max: 2, count: 0 },
      { label: "2-4", min: 2, max: 4, count: 0 },
      { label: "4-6", min: 4, max: 6, count: 0 },
      { label: "6-8", min: 6, max: 8, count: 0 },
      { label: "8-10", min: 8, max: 10, count: 0 },
    ];

    for (const { score } of allScores) {
      const bucket = scoreBuckets.find((b) => score >= b.min && score < b.max);
      if (bucket) bucket.count++;
      else if (score === 10) scoreBuckets[4].count++;
    }

    // Top sources by article count
    const topSources = await prisma.article.groupBy({
      by: ["sourceType"],
      _count: { id: true },
      _avg: { score: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    // Notification stats
    const notificationStats = await prisma.notificationLog.groupBy({
      by: ["type"],
      _count: { id: true },
      where: { success: true },
    });

    // Total articles count
    const totalArticles = await prisma.article.count();

    // Average score
    const avgScoreResult = await prisma.article.aggregate({
      _avg: { score: true },
      where: { score: { gt: 0 } },
    });

    // Articles today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const articlesToday = await prisma.article.count({
      where: { publishedAt: { gte: todayStart } },
    });

    // Active sources count
    const activeSources = await prisma.source.count({
      where: { active: true },
    });

    return NextResponse.json({
      data: {
        totalArticles,
        averageScore: avgScoreResult._avg.score
          ? Number(avgScoreResult._avg.score.toFixed(1))
          : 0,
        articlesToday,
        activeSources,
        sourceDistribution: sourceDistribution.map((s) => ({
          type: s.sourceType,
          count: s._count.id,
        })),
        dailyActivity,
        scoreBuckets: scoreBuckets.map((b) => ({
          label: b.label,
          count: b.count,
        })),
        topSources: topSources.map((s) => ({
          type: s.sourceType,
          count: s._count.id,
          avgScore: s._avg.score ? Number(s._avg.score.toFixed(1)) : 0,
        })),
        notificationStats: notificationStats.map((n) => ({
          type: n.type,
          count: n._count.id,
        })),
      },
    });
  } catch (error) {
    console.error("[API] Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
