"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";

interface LandingArticle {
  id: string;
  title: string;
  summary: string | null;
  source_type: string;
  score: number;
  published_at: string | null;
  thumbnail_url?: string | null;
}

interface LandingArticlesProps {
  articles: LandingArticle[];
  title: string;
  cta: string;
  locale: string;
}

function SourceBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    blog: "#3b82f6",
    twitter: "#1DA1F2",
    youtube: "#FF0000",
    reddit: "#FF4500",
    arxiv: "#06b6d4",
  };
  const color = colors[type] || "#64748b";

  return (
    <span
      className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      {type}
    </span>
  );
}

export function LandingArticles({ articles, title, cta, locale }: LandingArticlesProps) {
  if (!articles.length) return null;

  return (
    <section
      className="relative py-20"
      style={{ background: "var(--bg-secondary, #0f172a)" }}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "rgb(59 130 246 / 0.15)" }}
          >
            <Sparkles size={24} style={{ color: "#3b82f6" }} />
          </div>
          <h2
            className="text-2xl font-bold lg:text-3xl"
            style={{ color: "var(--text-primary, #f8fafc)" }}
          >
            {title}
          </h2>
        </div>

        {/* Articles grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.slice(0, 6).map((article) => (
            <article
              key={article.id}
              className="group rounded-xl p-5 transition-all duration-200"
              style={{
                background: "var(--bg-surface, #1e293b)",
                border: "1px solid var(--border-subtle, #1e293b)",
              }}
            >
              {/* Thumbnail */}
              {article.thumbnail_url && (
                <div className="mb-3 overflow-hidden rounded-lg" style={{ height: "140px" }}>
                  <img
                    src={article.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <SourceBadge type={article.source_type} />
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{
                    color: article.score >= 7 ? "#f59e0b" : "#3b82f6",
                    background:
                      article.score >= 7
                        ? "rgb(245 158 11 / 0.1)"
                        : "rgb(59 130 246 / 0.1)",
                  }}
                >
                  {article.score.toFixed(1)}
                </span>
              </div>

              <h3
                className="mt-3 text-sm font-semibold leading-snug"
                style={{ color: "var(--text-primary, #f8fafc)" }}
              >
                {article.title}
              </h3>

              {article.summary && (
                <p
                  className="mt-2 line-clamp-2 text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary, #94a3b8)" }}
                >
                  {article.summary}
                </p>
              )}

              {article.published_at && (
                <p
                  className="mt-3 text-xs"
                  style={{ color: "var(--text-muted, #64748b)" }}
                >
                  {new Date(article.published_at).toLocaleDateString(
                    locale === "ar" ? "ar-SA" : locale === "en" ? "en-US" : "fr-FR",
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                </p>
              )}
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all duration-200"
            style={{
              background: "#3b82f6",
              color: "white",
              boxShadow: "0 0 20px rgb(59 130 246 / 0.3)",
            }}
          >
            {cta}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
