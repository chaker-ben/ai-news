"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Crown,
  Loader2,
  AlertCircle,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/routing";

interface BillingPlan {
  id: string;
  slug: string;
  name: string;
  price: number;
}

interface Subscription {
  id: string;
  plan: string;
  status: string;
  billingCycle: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string | null;
  trialEndDate: string | null;
  cancelAtPeriodEnd: boolean;
  billingPlan: BillingPlan;
}

export default function BillingSettingsPage() {
  const t = useTranslations("billing");
  const tCommon = useTranslations("common");

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.data || null);
      } else if (res.status === 404) {
        setSubscription(null);
      } else {
        throw new Error("Failed to fetch subscription");
      }
    } catch (err) {
      console.error("[Billing] fetch error:", err);
      setError("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || undefined,
          cancelImmediately: false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Cancel failed");
      }

      setCancelSuccess(true);
      setCancelDialogOpen(false);
      await fetchSubscription();
    } catch (err) {
      console.error("[Billing] cancel error:", err);
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "active":
        return "rgb(16 185 129)";
      case "trialing":
        return "rgb(59 130 246)";
      case "cancelled":
        return "rgb(239 68 68)";
      default:
        return "var(--text-muted)";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "active":
        return t("active");
      case "trialing":
        return t("trialing");
      case "cancelled":
        return t("inactive");
      default:
        return t("inactive");
    }
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

  if (error && !subscription) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle size={40} style={{ color: "rgb(239 68 68)" }} />
        <p style={{ color: "var(--text-secondary)" }}>{error}</p>
        <button
          onClick={fetchSubscription}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--color-primary-600)" }}
        >
          {tCommon("retry")}
        </button>
      </div>
    );
  }

  const planName = subscription?.billingPlan?.name || subscription?.plan || "Free";
  const status2 = subscription?.status || "inactive";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>
      </div>

      {/* Cancel success message */}
      {cancelSuccess && (
        <div
          className="flex items-center gap-3 rounded-lg p-4"
          style={{
            background: "rgb(16 185 129 / 0.1)",
            border: "1px solid rgb(16 185 129 / 0.3)",
          }}
        >
          <AlertCircle size={20} style={{ color: "rgb(16 185 129)" }} />
          <p className="text-sm" style={{ color: "rgb(16 185 129)" }}>
            {t("cancelled")}
          </p>
        </div>
      )}

      {/* Current plan card */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{
                background: "color-mix(in srgb, var(--color-primary-400) 15%, transparent)",
                color: "var(--color-primary-400)",
              }}
            >
              <Crown size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {planName}
                </h2>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{
                    color: getStatusColor(status2),
                    background: `color-mix(in srgb, ${getStatusColor(status2)} 15%, transparent)`,
                  }}
                >
                  {getStatusLabel(status2)}
                </span>
              </div>
              {subscription && subscription.amount > 0 && (
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ${subscription.amount}/{subscription.billingCycle === "yearly" ? "yr" : "mo"}
                </p>
              )}
            </div>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "var(--color-primary-600)",
              color: "#fff",
            }}
          >
            {t("changePlan")}
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Details */}
        <div
          className="mt-6 grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {/* Status */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {t("status")}
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {getStatusLabel(status2)}
              {subscription?.cancelAtPeriodEnd && (
                <span className="ms-2 text-xs" style={{ color: "rgb(245 158 11)" }}>
                  (cancels at period end)
                </span>
              )}
            </p>
          </div>

          {/* Next billing */}
          {subscription?.currentPeriodEnd && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("nextBilling")}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <CalendarDays size={14} style={{ color: "var(--text-muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Trial end */}
          {subscription?.trialEndDate && status2 === "trialing" && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("trialEnds")}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <CalendarDays size={14} style={{ color: "rgb(59 130 246)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {new Date(subscription.trialEndDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel section */}
      {subscription && subscription.plan !== "free" && status2 !== "cancelled" && (
        <div
          className="rounded-xl p-6"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {t("cancelSubscription")}
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("cancelConfirm")}
              </p>
            </div>
            <button
              onClick={() => setCancelDialogOpen(true)}
              className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: "rgb(239 68 68 / 0.1)",
                color: "rgb(239 68 68)",
                border: "1px solid rgb(239 68 68 / 0.3)",
              }}
            >
              {t("cancelSubscription")}
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="mx-4 w-full max-w-md rounded-xl p-6"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
            }}
          >
            <h3
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("cancelSubscription")}
            </h3>
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("cancelConfirm")}
            </p>

            <div className="mt-4">
              <label
                className="mb-1 block text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("cancelReason")}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                }}
              />
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setCancelDialogOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "rgb(239 68 68)" }}
              >
                {cancelling && <Loader2 size={16} className="animate-spin" />}
                {tCommon("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
