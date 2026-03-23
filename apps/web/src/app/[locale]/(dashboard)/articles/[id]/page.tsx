import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getLocalizedArticle, getIntlLocale } from "@/lib/article-i18n";
import {
  ArrowUpRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  Calendar,
  Globe,
  Hash,
} from "lucide-react";
import { getArticle } from "@/lib/api";
import { Link } from "@/i18n/routing";

function ScoreBadge({ score }: { score: number }) {
  let color = "var(--color-neutral-500)";
  let bg = "var(--bg-elevated)";
  let label = "Mineur";
  if (score >= 9) {
    color = "var(--color-error)";
    bg = "rgb(239 68 68 / 0.1)";
    label = "Breaking";
  } else if (score >= 7) {
    color = "var(--color-warning)";
    bg = "rgb(245 158 11 / 0.1)";
    label = "Important";
  } else if (score >= 5) {
    color = "var(--color-primary-500)";
    bg = "rgb(59 130 246 / 0.1)";
    label = "Intéressant";
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold"
        style={{ color, background: bg }}
      >
        {score.toFixed(1)} / 10
      </span>
      <span className="text-sm" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

function SourceTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    blog: "var(--color-primary-500)",
    twitter: "#1DA1F2",
    youtube: "#FF0000",
    reddit: "#FF4500",
    arxiv: "var(--color-accent-500)",
  };

  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
      style={{
        color: colors[type] || "var(--text-muted)",
        background: `color-mix(in srgb, ${colors[type] || "var(--text-muted)"} 12%, transparent)`,
      }}
    >
      {type}
    </span>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} />
      <span style={{ color: "var(--text-muted)" }}>{label} :</span>
      <span style={{ color: "var(--text-secondary)" }}>{value}</span>
    </div>
  );
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("articles");

  let article;
  try {
    article = await getArticle(id);
  } catch {
    notFound();
  }

  const { locale } = await params;
  const intlLocale = getIntlLocale(locale);
  const localized = getLocalizedArticle(article, locale);
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString(intlLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const collectedDate = article.collected_at
    ? new Date(article.collected_at).toLocaleDateString(intlLocale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/articles"
        className="inline-flex items-center gap-1 text-sm transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <ChevronLeft size={16} />
        {t("title")}
      </Link>

      {/* Header card */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <SourceTypeBadge type={article.source_type} />
          {article.notified ? (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--color-success)" }}
            >
              <CheckCircle2 size={12} />
              {t("notified")}
            </span>
          ) : (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <Clock size={12} />
              {t("pending")}
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          className="mt-4 text-xl font-bold leading-snug lg:text-2xl"
          style={{ color: "var(--text-primary)" }}
        >
          {localized.title}
        </h1>

        {/* Original title */}
        {localized.title !== article.original_title && (
          <p
            className="mt-2 text-sm italic"
            style={{ color: "var(--text-muted)" }}
          >
            {article.original_title}
          </p>
        )}

        {/* Score */}
        <div className="mt-4">
          <ScoreBadge score={article.score} />
        </div>

        {/* Meta */}
        <div
          className="mt-5 space-y-2 pt-5"
          style={{ borderBlockStart: "1px solid var(--border-subtle)" }}
        >
          <MetaItem icon={Calendar} label={t("publishedAt")} value={publishedDate} />
          <MetaItem icon={Clock} label={t("collectedAt")} value={collectedDate} />
          <MetaItem icon={Globe} label={t("source")} value={article.source_type} />
          <MetaItem
            icon={Hash}
            label="Hash"
            value={article.content_hash.slice(0, 12) + "..."}
          />
        </div>

        {/* Link to original */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
          style={{
            background: "var(--color-primary-600)",
            color: "white",
          }}
        >
          {t("viewOriginal")}
          <ArrowUpRight size={16} />
        </a>
      </div>

      {/* Summary */}
      {localized.summary && (
        <div
          className="rounded-xl p-6"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("summary")}
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {localized.summary}
          </p>
        </div>
      )}

      {/* Original content */}
      {article.original_content && (
        <div
          className="rounded-xl p-6"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("originalTitle")}
          </h2>
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            {article.original_content.split("\n").map((line, i) => (
              <p key={i} className="mb-2">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
