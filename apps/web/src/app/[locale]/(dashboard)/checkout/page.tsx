"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Check,
  Zap,
  Crown,
  Users,
  Building2,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/routing";

interface CheckoutResponse {
  success: boolean;
  data: {
    type: string;
    subscription_id: string;
    client_secret: string;
    payment_intent_id: string;
    amount: number;
    currency: string;
    requires_payment: boolean;
    trial_end_date?: string;
    airwallex_customer_id: string;
  };
}

type CheckoutStatus = "idle" | "loading" | "payment" | "processing" | "success" | "error";

const PLAN_DETAILS: Record<
  string,
  {
    name: string;
    icon: React.ComponentType<{ size?: number }>;
    accent: string;
    features: string[];
  }
> = {
  pro: {
    name: "Pro",
    icon: Crown,
    accent: "var(--color-primary-400)",
    features: [
      "25 sources",
      "500 articles/day",
      "AI summaries",
      "WhatsApp + Email",
      "Priority support",
    ],
  },
  team: {
    name: "Team",
    icon: Users,
    accent: "var(--color-primary-600)",
    features: [
      "100 sources",
      "Unlimited articles",
      "Advanced AI scoring",
      "Team sharing",
      "Custom categories",
      "API access",
    ],
  },
  enterprise: {
    name: "Enterprise",
    icon: Building2,
    accent: "rgb(245 158 11)",
    features: [
      "Unlimited everything",
      "Custom AI models",
      "SSO / SAML",
      "Dedicated support",
      "SLA guarantee",
      "On-premise option",
    ],
  },
};

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  pro: { monthly: 9, yearly: 86 },
  team: { monthly: 29, yearly: 278 },
  enterprise: { monthly: 99, yearly: 950 },
};

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();

  const planSlug = searchParams.get("plan") || "pro";
  const cycle = (searchParams.get("cycle") || "monthly") as "monthly" | "yearly";

  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse["data"] | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const dropInRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const planInfo = PLAN_DETAILS[planSlug] || PLAN_DETAILS.pro;
  const prices = PLAN_PRICES[planSlug] || PLAN_PRICES.pro;
  const price = cycle === "yearly" ? prices.yearly : prices.monthly;
  const PlanIcon = planInfo.icon;

  const pollPaymentStatus = useCallback(
    async (intentId: string) => {
      try {
        const res = await fetch(`/api/billing/payment-status/${intentId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.data?.status === "SUCCEEDED" || data.data?.paymentStatus === "paid") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setStatus("success");
        }
      } catch (err) {
        console.error("[Checkout] poll error:", err);
      }
    },
    [],
  );

  const startCheckout = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug,
          billingCycle: cycle,
          currency: "USD",
          startTrial: false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Checkout failed");
      }

      const result: CheckoutResponse = await res.json();
      setCheckoutData(result.data);

      if (result.data.type === "free") {
        setStatus("success");
        return;
      }

      if (result.data.requires_payment) {
        setStatus("payment");

        // Initialize Airwallex Drop-in
        try {
          const { initAirwallex } = await import("@/lib/airwallex");
          await initAirwallex();

          const airwallex = await import("airwallex-payment-elements");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Airwallex types are imprecise for dropIn
          const dropIn = airwallex.createElement("dropIn", {
            intent_id: result.data.payment_intent_id,
            client_secret: result.data.client_secret,
            currency: result.data.currency.toLowerCase(),
            mode: "payment",
          } as any);

          if (dropInRef.current && dropIn) {
            dropIn.mount(dropInRef.current);
          }

          // Listen for success via the global event
          const handleSuccess = () => {
            setStatus("processing");
            pollIntervalRef.current = setInterval(
              () => pollPaymentStatus(result.data.payment_intent_id),
              2000,
            );
          };

          const handleError = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            console.error("[Checkout] payment error:", detail);
            setErrorMessage(t("error"));
            setStatus("error");
          };

          window.addEventListener("onSuccess", handleSuccess);
          window.addEventListener("onError", handleError);

          return () => {
            window.removeEventListener("onSuccess", handleSuccess);
            window.removeEventListener("onError", handleError);
          };
        } catch (airwallexErr) {
          console.error("[Checkout] Airwallex init error:", airwallexErr);
          // Airwallex SDK not available — stay in payment state with placeholder
          setStatus("payment");
        }
      }
    } catch (err) {
      console.error("[Checkout] error:", err);
      setErrorMessage(err instanceof Error ? err.message : t("error"));
      setStatus("error");
    }
  }, [planSlug, cycle, t, pollPaymentStatus]);

  // Auto-redirect countdown on success
  useEffect(() => {
    if (status !== "success") return;

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, router]);

  // Cleanup poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/pricing"
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
          style={{
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <ArrowLeft size={18} />
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>
      </div>

      {/* Success state */}
      {status === "success" && (
        <div
          className="flex flex-col items-center gap-4 rounded-xl p-12 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgb(16 185 129 / 0.15)" }}
          >
            <Check size={32} style={{ color: "rgb(16 185 129)" }} />
          </div>
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("success")}
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>{t("successDesc")}</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("redirecting")} ({redirectCountdown}s)
          </p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div
          className="flex flex-col items-center gap-4 rounded-xl p-12 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid rgb(239 68 68 / 0.3)",
          }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "rgb(239 68 68 / 0.15)" }}
          >
            <AlertCircle size={32} style={{ color: "rgb(239 68 68)" }} />
          </div>
          <p style={{ color: "var(--text-primary)" }}>
            {errorMessage || t("error")}
          </p>
          <button
            onClick={startCheckout}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--color-primary-600)" }}
          >
            {tCommon("retry")}
          </button>
        </div>
      )}

      {/* Main content — order summary + payment */}
      {status !== "success" && status !== "error" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Order summary */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <h2
              className="mb-6 text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("orderSummary")}
            </h2>

            {/* Plan card */}
            <div className="mb-6 flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg"
                style={{
                  background: `color-mix(in srgb, ${planInfo.accent} 15%, transparent)`,
                  color: planInfo.accent,
                }}
              >
                <PlanIcon size={24} />
              </div>
              <div>
                <h3
                  className="font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {planInfo.name}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {cycle === "yearly" ? "Annual" : "Monthly"} billing
                </p>
              </div>
            </div>

            {/* Features */}
            <ul className="mb-6 space-y-2">
              {planInfo.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Check
                    size={14}
                    className="shrink-0"
                    style={{ color: planInfo.accent }}
                  />
                  {feature}
                </li>
              ))}
            </ul>

            {/* Price summary */}
            <div
              className="border-t pt-4"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--text-secondary)" }}>
                  {planInfo.name} ({cycle})
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  ${price}
                </span>
              </div>
              {cycle === "yearly" && (
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  ${Math.round((price / 12) * 100) / 100}/mo equivalent
                </p>
              )}
            </div>
          </div>

          {/* Payment section */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <h2
              className="mb-6 text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("paymentDetails")}
            </h2>

            {status === "idle" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <button
                  onClick={startCheckout}
                  className="rounded-lg px-8 py-3 text-sm font-semibold text-white transition-colors"
                  style={{ background: "var(--color-primary-600)" }}
                >
                  {t("title")} - ${price}
                </button>
              </div>
            )}

            {status === "loading" && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2
                  size={32}
                  className="animate-spin"
                  style={{ color: "var(--color-primary-400)" }}
                />
                <p style={{ color: "var(--text-secondary)" }}>
                  {t("processing")}
                </p>
              </div>
            )}

            {status === "processing" && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2
                  size={32}
                  className="animate-spin"
                  style={{ color: "var(--color-primary-400)" }}
                />
                <p style={{ color: "var(--text-secondary)" }}>
                  {t("processing")}
                </p>
              </div>
            )}

            {status === "payment" && (
              <div>
                {/* Airwallex Drop-in mount point */}
                <div
                  ref={dropInRef}
                  id="airwallex-dropin"
                  className="min-h-[200px] rounded-lg p-4"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px dashed var(--border-default)",
                  }}
                >
                  {/* If Airwallex SDK loads, it mounts here.
                      Otherwise shows placeholder. */}
                  {!checkoutData && (
                    <div className="flex h-full items-center justify-center py-12">
                      <Loader2
                        size={24}
                        className="animate-spin"
                        style={{ color: "var(--color-primary-400)" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
