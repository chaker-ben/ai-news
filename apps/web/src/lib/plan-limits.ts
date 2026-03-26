import type { PlanSlug } from "@ai-news/db";

export interface PlanLimits {
  articles_per_day: number;
  max_categories: number;
  max_sources: number;
  max_alerts: number;
  channels: string[];
  api_requests_per_day: number;
  max_team_members: number;
}

export const PLAN_LIMITS: Record<PlanSlug, PlanLimits> = {
  free: {
    articles_per_day: 5,
    max_categories: 3,
    max_sources: 5,
    max_alerts: 0,
    channels: ["email"],
    api_requests_per_day: 0,
    max_team_members: 1,
  },
  pro: {
    articles_per_day: -1, // unlimited
    max_categories: -1,
    max_sources: -1,
    max_alerts: 10,
    channels: ["email", "whatsapp", "telegram"],
    api_requests_per_day: 0,
    max_team_members: 1,
  },
  team: {
    articles_per_day: -1,
    max_categories: -1,
    max_sources: -1,
    max_alerts: 50,
    channels: ["email", "whatsapp", "telegram"],
    api_requests_per_day: 1000,
    max_team_members: 5,
  },
  enterprise: {
    articles_per_day: -1,
    max_categories: -1,
    max_sources: -1,
    max_alerts: -1,
    channels: ["email", "whatsapp", "telegram", "push"],
    api_requests_per_day: -1,
    max_team_members: -1,
  },
};

export function getPlanLimits(plan: PlanSlug): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export function isFeatureAllowed(plan: PlanSlug, feature: string): boolean {
  const limits = getPlanLimits(plan);

  switch (feature) {
    case "whatsapp":
      return limits.channels.includes("whatsapp");
    case "telegram":
      return limits.channels.includes("telegram");
    case "custom_alerts":
      return limits.max_alerts !== 0;
    case "api_access":
      return limits.api_requests_per_day !== 0;
    case "pdf_report":
      return plan !== "free";
    default:
      return true;
  }
}

export function isWithinLimit(
  plan: PlanSlug,
  key: keyof PlanLimits,
  currentCount: number,
): boolean {
  const limits = getPlanLimits(plan);
  const limit = limits[key];
  if (typeof limit === "number" && limit === -1) return true; // unlimited
  if (typeof limit === "number") return currentCount < limit;
  return true;
}
