import { getTranslations } from "next-intl/server";
import { ArrowUpRight, FileText, CheckCircle2, Clock } from "lucide-react";
import { getArticles } from "@/lib/api";
import { Link } from "@/i18n/routing";

function ScoreBadge({ score }: { score: number }) {
  let color = "var(--color-neutral-500)";
  let bg = "var(--bg-elevated)";
  if (score >= 9) {
    color = "var(--color-error)";
    bg = "rgb(239 68 68 / 0.1)";
  } else if (score >= 7) {
    color = "var(--color-warning)";
    bg = "rgb(245 158 11 / 0.1)";
  } else if (score >= 5) {
    color = "var(--color-primary-500)";
    bg = "rgb(59 130 246 / 0.1)";
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ color, background: bg }}
    >
      {score.toFixed(1)}
    </span>
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
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
      style={{
        color: colors[type] || "var(--text-muted)",
        background: `color-mix(in srgb, ${colors[type] || "var(--text-muted)"} 12%, transparent)`,
      }}
    >
      {type}
    </span>
  );
}

export default async function ArticlesPage() {
  const t = await getTranslations("articles");

  let articles = null;
  let total = 0;

  try {
    const response = await getArticles({ limit: 30 });
    articles = response.articles;
    total = response.total;
  } catch {
    // API not available
  }

  return (
    <div className="space-y-6">
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
            {total > 0 ? `${total} ${t("title").toLowerCase()}` : ""}
          </p>
        </div>
      </div>

      {/* Articles list */}
      {articles && articles.length > 0 ? (
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.id}`}
              className="group block rounded-xl p-5 transition-all duration-200"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceTypeBadge type={article.source_type} />
                    <ScoreBadge score={article.score} />
                    {article.notified ? (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--color-success)" }}>
                        <CheckCircle2 size={12} />
                        {t("notified")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <Clock size={12} />
                        {t("pending")}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className="mt-2 text-sm font-semibold leading-snug"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {article.title}
                  </h3>

                  {/* Summary */}
                  {article.summary && (
                    <p
                      className="mt-2 line-clamp-2 text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {article.summary}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    {article.published_at && (
                      <time>
                        {new Date(article.published_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div
                  className="shrink-0 rounded-lg p-2 opacity-0 transition-all group-hover:opacity-100"
                  style={{ color: "var(--color-primary-400)" }}
                >
                  <ArrowUpRight size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl px-6 py-16 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <FileText
            size={48}
            className="mx-auto mb-4"
            style={{ color: "var(--text-muted)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("empty")}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {t("emptyCta")}
          </p>
        </div>
      )}
    </div>
  );
}
