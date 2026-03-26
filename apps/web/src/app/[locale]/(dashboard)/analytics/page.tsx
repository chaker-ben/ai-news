"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Activity,
  PieChart,
  Loader2,
  FileText,
} from "lucide-react";

interface AnalyticsData {
  totalArticles: number;
  averageScore: number;
  articlesToday: number;
  activeSources: number;
  sourceDistribution: Array<{ type: string; count: number }>;
  dailyActivity: Array<{ date: string; count: number; avgScore: number }>;
  scoreBuckets: Array<{ label: string; count: number }>;
  topSources: Array<{ type: string; count: number; avgScore: number }>;
  notificationStats: Array<{ type: string; count: number }>;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number }>;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: accent || "var(--bg-hover)" }}
        >
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-4">
        <p
          className="text-2xl font-bold ltr-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </p>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

const SOURCE_COLORS: Record<string, string> = {
  blog: "var(--color-primary-500)",
  twitter: "var(--color-info)",
  youtube: "var(--color-error)",
  reddit: "var(--color-warning)",
  arxiv: "var(--color-accent-500)",
  linkedin: "rgb(0, 119, 181)",
  tiktok: "rgb(255, 0, 80)",
};

const SCORE_COLORS = [
  "var(--color-neutral-500)",
  "var(--color-primary-600)",
  "var(--color-primary-500)",
  "var(--color-warning)",
  "var(--color-error)",
];

export default function AnalyticsPage() {
  const t = useTranslations("analytics");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/analytics");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json() as { data: AnalyticsData };
        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--color-primary-500)" }}
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <BarChart3
          size={40}
          style={{ color: "var(--text-muted)" }}
        />
        <p
          className="text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {error || "Failed to load analytics"}
        </p>
      </div>
    );
  }

  const maxDailyCount = Math.max(...data.dailyActivity.map((d) => d.count), 1);
  const maxSourceCount = Math.max(
    ...data.sourceDistribution.map((s) => s.count),
    1,
  );
  const maxScoreBucket = Math.max(
    ...data.scoreBuckets.map((b) => b.count),
    1,
  );

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
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("description")}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("totalArticles")}
          value={data.totalArticles}
          icon={FileText}
          accent="rgb(59 130 246 / 0.15)"
        />
        <StatCard
          label={t("averageScore")}
          value={data.averageScore}
          icon={TrendingUp}
          accent="rgb(245 158 11 / 0.15)"
        />
        <StatCard
          label={t("articlesToday")}
          value={data.articlesToday}
          icon={Activity}
          accent="rgb(16 185 129 / 0.15)"
        />
        <StatCard
          label={t("activeSources")}
          value={data.activeSources}
          icon={PieChart}
          accent="rgb(6 182 212 / 0.15)"
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Activity Chart */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="mb-6 flex items-center gap-2">
            <BarChart3 size={18} style={{ color: "var(--color-primary-500)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("dailyActivity")}
            </h2>
          </div>

          {data.dailyActivity.length > 0 ? (
            <div className="flex items-end gap-1.5" style={{ height: "180px" }}>
              {data.dailyActivity.map((day) => {
                const heightPercent = (day.count / maxDailyCount) * 100;
                const dateLabel = new Date(day.date).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" },
                );
                return (
                  <div
                    key={day.date}
                    className="group relative flex flex-1 flex-col items-center"
                    style={{ height: "100%" }}
                  >
                    {/* Tooltip */}
                    <div
                      className="pointer-events-none absolute -top-10 z-10 hidden rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap group-hover:block"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {day.count} {t("articles")} / {t("avgScore")}: {day.avgScore}
                    </div>
                    {/* Bar */}
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-[32px] rounded-t-sm transition-all duration-200 group-hover:opacity-80"
                        style={{
                          height: `${Math.max(heightPercent, 4)}%`,
                          background: "var(--color-primary-500)",
                        }}
                      />
                    </div>
                    {/* Date label */}
                    <span
                      className="mt-2 text-[10px] ltr-nums"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {dateLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyChart message={t("articles")} />
          )}
        </div>

        {/* Source Distribution */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="mb-6 flex items-center gap-2">
            <PieChart size={18} style={{ color: "var(--color-primary-500)" }} />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("sourceDistribution")}
            </h2>
          </div>

          {data.sourceDistribution.length > 0 ? (
            <div className="space-y-3">
              {data.sourceDistribution.map((source) => {
                const widthPercent = (source.count / maxSourceCount) * 100;
                const color =
                  SOURCE_COLORS[source.type] || "var(--color-neutral-500)";
                return (
                  <div key={source.type}>
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className="text-xs font-medium capitalize"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {source.type}
                      </span>
                      <span
                        className="text-xs font-semibold ltr-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {source.count}
                      </span>
                    </div>
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full"
                      style={{ background: "var(--bg-hover)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${widthPercent}%`,
                          background: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyChart message={t("sourceDistribution")} />
          )}
        </div>

        {/* Score Distribution */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="mb-6 flex items-center gap-2">
            <TrendingUp
              size={18}
              style={{ color: "var(--color-primary-500)" }}
            />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("scoreDistribution")}
            </h2>
          </div>

          {data.scoreBuckets.some((b) => b.count > 0) ? (
            <div
              className="flex items-end justify-around gap-3"
              style={{ height: "180px" }}
            >
              {data.scoreBuckets.map((bucket, index) => {
                const heightPercent = (bucket.count / maxScoreBucket) * 100;
                return (
                  <div
                    key={bucket.label}
                    className="group relative flex flex-1 flex-col items-center"
                    style={{ height: "100%" }}
                  >
                    {/* Tooltip */}
                    <div
                      className="pointer-events-none absolute -top-8 z-10 hidden rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap group-hover:block"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {bucket.count} {t("articles")}
                    </div>
                    {/* Bar */}
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-[48px] rounded-t-sm transition-all duration-200 group-hover:opacity-80"
                        style={{
                          height: `${Math.max(heightPercent, 4)}%`,
                          background: SCORE_COLORS[index],
                        }}
                      />
                    </div>
                    {/* Label */}
                    <span
                      className="mt-2 text-xs font-medium ltr-nums"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {bucket.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyChart message={t("scoreDistribution")} />
          )}
        </div>

        {/* Top Sources Table */}
        <div
          className="rounded-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="flex items-center gap-2 px-6 py-4"
            style={{ borderBlockEnd: "1px solid var(--border-subtle)" }}
          >
            <Activity
              size={18}
              style={{ color: "var(--color-primary-500)" }}
            />
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("topSources")}
            </h2>
          </div>

          {data.topSources.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      borderBlockEnd: "1px solid var(--border-subtle)",
                    }}
                  >
                    <th
                      className="px-6 py-3 text-start text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Source
                    </th>
                    <th
                      className="px-6 py-3 text-start text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t("articles")}
                    </th>
                    <th
                      className="px-6 py-3 text-start text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t("avgScore")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSources.map((source) => {
                    const color =
                      SOURCE_COLORS[source.type] || "var(--color-neutral-500)";
                    return (
                      <tr
                        key={source.type}
                        style={{
                          borderBlockEnd: "1px solid var(--border-subtle)",
                        }}
                      >
                        <td className="px-6 py-3">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize"
                            style={{
                              color,
                              background: `color-mix(in srgb, ${color} 15%, transparent)`,
                            }}
                          >
                            {source.type}
                          </span>
                        </td>
                        <td
                          className="px-6 py-3 text-sm font-medium ltr-nums"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {source.count}
                        </td>
                        <td
                          className="px-6 py-3 text-sm font-medium ltr-nums"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {source.avgScore}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {t("topSources")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {message}
      </p>
    </div>
  );
}
