import { getTranslations } from "next-intl/server";
import {
  FileText,
  Bell,
  Radio,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getStats, getArticles } from "@/lib/api";
import { getLocalizedArticle, getIntlLocale } from "@/lib/article-i18n";
import { Link } from "@/i18n/routing";
import { ScoreBadgeServer } from "@/components/score-badge";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  trend,
  trendLabel,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ size?: number }>;
  accent?: string;
  trend?: number | null;
  trendLabel?: string;
}) {
  const hasTrend = trend !== undefined && trend !== null;
  const isPositive = hasTrend && trend >= 0;

  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg sm:h-10 sm:w-10"
          style={{ background: accent || "var(--bg-hover)" }}
        >
          <Icon size={20} />
        </div>
        {hasTrend && (
          <div
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              color: isPositive
                ? "var(--color-success, #22c55e)"
                : "var(--color-error, #ef4444)",
              background: isPositive
                ? "rgb(34 197 94 / 0.1)"
                : "rgb(239 68 68 / 0.1)",
            }}
          >
            {isPositive ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            <span className="ltr-nums">
              {isPositive ? "+" : ""}
              {trend}%
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 sm:mt-4">
        <p
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        {hasTrend && trendLabel && (
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}


function SourceTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    blog: "var(--color-primary-500)",
    twitter: "var(--color-info)",
    youtube: "var(--color-error)",
    reddit: "var(--color-warning)",
    arxiv: "var(--color-accent-500)",
  };

  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        color: colors[type] || "var(--text-muted)",
        background: `color-mix(in srgb, ${colors[type] || "var(--text-muted)"} 15%, transparent)`,
      }}
    >
      {type}
    </span>
  );
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const intlLocale = getIntlLocale(locale);

  let stats = null;
  let topArticles = null;

  try {
    stats = await getStats();
  } catch {
    // API not available yet — show placeholder
  }

  try {
    const response = await getArticles({ limit: 5, min_score: 0 });
    topArticles = response.articles;
  } catch {
    // API not available yet
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("todayDigest")}
          </p>
          {stats?.updated_at && (
            <p
              className="mt-1 text-xs ltr-nums"
              style={{ color: "var(--text-muted)" }}
            >
              {t("lastUpdated", {
                time: new Date(stats.updated_at).toLocaleTimeString(intlLocale, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={t("articlesCollected")}
          value={stats?.total_articles ?? "—"}
          icon={FileText}
          accent="rgb(59 130 246 / 0.15)"
          trend={stats?.trends?.articles}
          trendLabel={t("vsYesterday")}
        />
        <StatCard
          label={t("notificationsSent")}
          value={stats?.total_notifications ?? "—"}
          icon={Bell}
          accent="rgb(6 182 212 / 0.15)"
          trend={stats?.trends?.notifications}
          trendLabel={t("vsYesterday")}
        />
        <StatCard
          label={t("activeSources")}
          value={stats?.active_sources ?? "—"}
          icon={Radio}
          accent="rgb(16 185 129 / 0.15)"
        />
        <StatCard
          label={t("successfulDeliveries")}
          value={stats?.successful_notifications ?? "—"}
          icon={TrendingUp}
          accent="rgb(245 158 11 / 0.15)"
          trend={stats?.trends?.successful}
          trendLabel={t("vsYesterday")}
        />
      </div>

      {/* Top articles */}
      <div
        className="rounded-xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBlockEnd: "1px solid var(--border-subtle)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("topArticles")}
          </h2>
        </div>

        {topArticles && topArticles.length > 0 ? (
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {topArticles.map((article) => {
              const localized = getLocalizedArticle(article, locale);
              return (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="group flex items-start gap-4 px-6 py-4 transition-colors"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <SourceTypeBadge type={article.source_type} />
                    <ScoreBadgeServer score={article.score} />
                  </div>
                  <h3
                    className="mt-2 text-sm font-medium leading-snug group-hover:underline"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {localized.title}
                  </h3>
                  {localized.summary && (
                    <p
                      className="mt-1 line-clamp-2 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {localized.summary}
                    </p>
                  )}
                  <p
                    className="mt-2 text-xs ltr-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString(intlLocale, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
                <div
                  className="shrink-0 rounded-lg p-2 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: "var(--color-primary-400)" }}
                >
                  <ArrowUpRight size={16} />
                </div>
              </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <FileText
              size={40}
              className="mx-auto mb-3"
              style={{ color: "var(--text-muted)" }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("noArticles")}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {t("noArticlesCta")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
