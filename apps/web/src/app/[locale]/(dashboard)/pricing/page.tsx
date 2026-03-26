"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Check,
  Zap,
  Users,
  Building2,
  Crown,
  Loader2,
} from "lucide-react";

interface BillingPlan {
  id: string;
  slug: string;
  name: string;
  price: number;
  yearlyPrice: number | null;
  currency: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  trialDays: number | null;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  billingCycle: string;
}

const PLAN_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  free: Zap,
  pro: Crown,
  team: Users,
  enterprise: Building2,
};

const PLAN_ACCENTS: Record<string, string> = {
  free: "var(--text-muted)",
  pro: "var(--color-primary-400)",
  team: "var(--color-primary-600)",
  enterprise: "rgb(245 158 11)",
};

export default function PricingPage() {
  const t = useTranslations("pricing");
  const router = useRouter();

  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch("/api/billing/plans"),
        fetch("/api/user/subscription"),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.data || []);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.data || null);
      }
    } catch (err) {
      console.error("[Pricing] fetch error:", err);
      setError("Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPrice = (plan: BillingPlan): number => {
    if (billingCycle === "yearly" && plan.yearlyPrice !== null) {
      return plan.yearlyPrice;
    }
    return plan.price;
  };

  const getMonthlyEquivalent = (plan: BillingPlan): number => {
    if (billingCycle === "yearly" && plan.yearlyPrice !== null) {
      return Math.round((plan.yearlyPrice / 12) * 100) / 100;
    }
    return plan.price;
  };

  const getSavingsPercent = (plan: BillingPlan): number | null => {
    if (
      billingCycle === "yearly" &&
      plan.yearlyPrice !== null &&
      plan.price > 0
    ) {
      const yearlyTotal = plan.price * 12;
      const savings = ((yearlyTotal - plan.yearlyPrice) / yearlyTotal) * 100;
      return Math.round(savings);
    }
    return null;
  };

  const isCurrentPlan = (plan: BillingPlan): boolean => {
    if (!subscription) return plan.slug === "free";
    return subscription.plan === plan.slug;
  };

  const handlePlanAction = (plan: BillingPlan) => {
    if (plan.slug === "enterprise") {
      window.location.href = "mailto:contact@ainews.dev?subject=Enterprise Plan";
      return;
    }
    if (plan.slug === "free") {
      return;
    }
    router.push(`/checkout?plan=${plan.slug}&cycle=${billingCycle}`);
  };

  const getButtonLabel = (plan: BillingPlan): string => {
    if (isCurrentPlan(plan)) return t("currentPlan");
    if (plan.slug === "enterprise") return t("contactUs");
    if (plan.slug === "free") return t("downgrade");
    return t("upgrade");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--color-primary-400)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p style={{ color: "var(--text-secondary)" }}>{error}</p>
        <button
          onClick={fetchData}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--color-primary-600)" }}
        >
          {t("features")}
        </button>
      </div>
    );
  }

  // Fallback plans if API returns empty
  const displayPlans: BillingPlan[] =
    plans.length > 0
      ? plans
      : [
          {
            id: "free",
            slug: "free",
            name: "Free",
            price: 0,
            yearlyPrice: 0,
            currency: "USD",
            features: [
              "5 sources",
              "50 articles/day",
              "Basic summaries",
              "Email digest",
            ],
            isActive: true,
            sortOrder: 0,
            trialDays: null,
          },
          {
            id: "pro",
            slug: "pro",
            name: "Pro",
            price: 9,
            yearlyPrice: 86,
            currency: "USD",
            features: [
              "25 sources",
              "500 articles/day",
              "AI summaries",
              "WhatsApp + Email",
              "Priority support",
            ],
            isActive: true,
            sortOrder: 1,
            trialDays: 7,
          },
          {
            id: "team",
            slug: "team",
            name: "Team",
            price: 29,
            yearlyPrice: 278,
            currency: "USD",
            features: [
              "100 sources",
              "Unlimited articles",
              "Advanced AI scoring",
              "Team sharing",
              "Custom categories",
              "API access",
            ],
            isActive: true,
            sortOrder: 2,
            trialDays: 7,
          },
          {
            id: "enterprise",
            slug: "enterprise",
            name: "Enterprise",
            price: 99,
            yearlyPrice: 950,
            currency: "USD",
            features: [
              "Unlimited everything",
              "Custom AI models",
              "SSO / SAML",
              "Dedicated support",
              "SLA guarantee",
              "On-premise option",
            ],
            isActive: true,
            sortOrder: 3,
            trialDays: 14,
          },
        ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-2xl font-bold lg:text-3xl"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingCycle("monthly")}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background:
              billingCycle === "monthly"
                ? "var(--color-primary-600)"
                : "var(--bg-surface)",
            color:
              billingCycle === "monthly"
                ? "#fff"
                : "var(--text-secondary)",
            border:
              billingCycle === "monthly"
                ? "1px solid var(--color-primary-600)"
                : "1px solid var(--border-subtle)",
          }}
        >
          {t("monthly")}
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background:
              billingCycle === "yearly"
                ? "var(--color-primary-600)"
                : "var(--bg-surface)",
            color:
              billingCycle === "yearly"
                ? "#fff"
                : "var(--text-secondary)",
            border:
              billingCycle === "yearly"
                ? "1px solid var(--color-primary-600)"
                : "1px solid var(--border-subtle)",
          }}
        >
          {t("yearly")}
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {displayPlans.map((plan) => {
          const Icon = PLAN_ICONS[plan.slug] || Zap;
          const accent = PLAN_ACCENTS[plan.slug] || "var(--text-muted)";
          const current = isCurrentPlan(plan);
          const savings = getSavingsPercent(plan);
          const isPopular = plan.slug === "pro";
          const price = getPrice(plan);
          const monthlyEq = getMonthlyEquivalent(plan);

          return (
            <div
              key={plan.id}
              className="relative flex flex-col rounded-xl p-6"
              style={{
                background: "var(--bg-surface)",
                border: current
                  ? `2px solid var(--color-primary-400)`
                  : isPopular
                    ? `2px solid var(--color-primary-600)`
                    : "1px solid var(--border-subtle)",
              }}
            >
              {/* Popular badge */}
              {isPopular && (
                <div
                  className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                  style={{ background: "var(--color-primary-600)" }}
                >
                  {t("mostPopular")}
                </div>
              )}

              {/* Savings badge */}
              {savings !== null && savings > 0 && (
                <div
                  className="absolute -top-3 end-4 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    background: "rgb(16 185 129 / 0.15)",
                    color: "rgb(16 185 129)",
                  }}
                >
                  {t("save")} {savings}%
                </div>
              )}

              {/* Plan icon & name */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: `color-mix(in srgb, ${accent} 15%, transparent)`,
                    color: accent,
                  }}
                >
                  <Icon size={20} />
                </div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {plan.name}
                </h2>
              </div>

              {/* Price */}
              <div className="mb-6">
                {plan.price === 0 ? (
                  <div
                    className="text-3xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    $0
                    <span
                      className="text-sm font-normal"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {" "}
                      {t("perMonth")}
                    </span>
                  </div>
                ) : billingCycle === "yearly" ? (
                  <div>
                    <div
                      className="text-3xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      ${price}
                      <span
                        className="text-sm font-normal"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {" "}
                        {t("perYear")}
                      </span>
                    </div>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      ${monthlyEq}
                      {t("perMonth")}
                    </p>
                  </div>
                ) : (
                  <div
                    className="text-3xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ${price}
                    <span
                      className="text-sm font-normal"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {" "}
                      {t("perMonth")}
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="mb-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0"
                      style={{ color: accent }}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handlePlanAction(plan)}
                disabled={current}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: current
                    ? "var(--bg-elevated)"
                    : plan.slug === "enterprise"
                      ? "transparent"
                      : "var(--color-primary-600)",
                  color: current
                    ? "var(--text-muted)"
                    : plan.slug === "enterprise"
                      ? "var(--color-primary-400)"
                      : "#fff",
                  border:
                    plan.slug === "enterprise" && !current
                      ? "1px solid var(--color-primary-400)"
                      : "1px solid transparent",
                }}
              >
                {getButtonLabel(plan)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
