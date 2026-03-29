import type { PlanSlug } from "@ai-news/db";
import { prisma } from "@ai-news/db";

export async function getUserPlan(userId: string): Promise<PlanSlug> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });

  if (
    subscription?.status === "active" ||
    subscription?.status === "trialing"
  ) {
    return subscription.plan;
  }

  return "free" as PlanSlug;
}
