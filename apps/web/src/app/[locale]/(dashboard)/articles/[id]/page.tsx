import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getLocalizedArticle, getIntlLocale } from "@/lib/article-i18n";
import {
  ArrowUpRight,
  ChevronLeft,
  Clock,
  Calendar,
} from "lucide-react";
import { getArticle, getAdjacentArticles, getSimilarArticles } from "@/lib/api";
import { Link } from "@/i18n/routing";
import { ArticleReader } from "@/components/article-reader";
import { ArticleNavigation } from "@/components/article-navigation";
import { BookmarkButton } from "@/components/bookmark-button";
import { ScoreBadgeServer } from "@/components/score-badge";
import { ReadingProgressBar } from "@/components/reading-progress-bar";
import { CopyLinkButton, MarkAsReadButton } from "@/components/article-actions";

function SourceIcon({ type }: Readonly<{ type: string }>) {
  const colors: Record<string, string> = {
    blog: "var(--color-primary-500)",
    twitter: "#1DA1F2",
    youtube: "#FF0000",
    reddit: "#FF4500",
    arxiv: "var(--color-accent-500)",
  };

  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
      style={{
        color: colors[type] || "var(--text-muted)",
        background: `color-mix(in srgb, ${colors[type] || "var(--text-muted)"} 12%, transparent)`,
      }}
    >
      {type}
    </span>
  );
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const t = await getTranslations("articles");

  let article;
  try {
    article = await getArticle(id);
  } catch {
    notFound();
  }

  const intlLocale = getIntlLocale(locale);
  const localized = getLocalizedArticle(article, locale);

  const [adjacent, similarArticles] = await Promise.all([
    getAdjacentArticles(id),
    getSimilarArticles(id, article.source_type),
  ]);

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString(intlLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const publishedTime = article.published_at
    ? new Date(article.published_at).toLocaleTimeString(intlLocale, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const wordCount = (localized.summary || "").split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Build the full text for TTS
  const ttsText = [localized.title, localized.summary].filter(Boolean).join(". ");

  return (
    <>
      <ReadingProgressBar />

      <article className="mx-auto max-w-3xl pb-12">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/articles"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
            style={{
              color: "var(--text-muted)",
              background: "transparent",
            }}
          >
            <ChevronLeft size={16} />
            {t("backToArticles")}
          </Link>

          <div className="flex items-center gap-2">
            <BookmarkButton articleId={article.id} />
          </div>
        </div>

        {/* Hero media */}
        {article.video_url && (
          <div
            className="mb-8 overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--border-subtle)" }}
          >
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={article.video_url}
                title={localized.title}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {!article.video_url && article.thumbnail_url && (
          <div
            className="mb-8 overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--border-subtle)" }}
          >
            <img
              src={article.thumbnail_url}
              alt=""
              className="w-full object-cover"
              style={{ maxHeight: "360px" }}
              loading="eager"
            />
          </div>
        )}

        {/* Reading column — constrained for readability */}
        <div className="mx-auto" style={{ maxWidth: "680px" }}>
          {/* Title */}
          <h1
            className="text-2xl font-bold leading-tight tracking-tight lg:text-3xl"
            style={{ color: "var(--text-primary)" }}
          >
            {localized.title}
          </h1>

          {/* Original title (if different) */}
          {localized.title !== article.original_title && (
            <p
              className="mt-3 text-sm italic"
              style={{ color: "var(--text-muted)" }}
            >
              {article.original_title}
            </p>
          )}

          {/* Meta info bar */}
          <div
            className="mt-5 flex flex-wrap items-center gap-2.5 rounded-xl px-4 py-3"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <SourceIcon type={article.source_type} />
            <ScoreBadgeServer score={article.score} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {readingTime} {t("readingTime")}
            </span>

            {/* Separator */}
            <span
              className="mx-1 hidden h-4 w-px sm:block"
              style={{ background: "var(--border-default)" }}
            />

            <div className="flex items-center gap-2">
              <CopyLinkButton />
              <MarkAsReadButton articleId={article.id} />
            </div>
          </div>

          {/* Date + source */}
          <div
            className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            {publishedDate && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} />
                <time>{publishedDate}</time>
                {publishedTime && (
                  <span className="text-xs opacity-60">{publishedTime}</span>
                )}
              </span>
            )}
            {article.collected_at && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} />
                {t("collectedAt")} :{" "}
                {new Date(article.collected_at).toLocaleDateString(intlLocale, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          {/* Divider */}
          <div
            className="my-8"
            style={{
              height: "1px",
              background:
                "linear-gradient(to right, transparent, var(--border-subtle), transparent)",
            }}
          />

          {/* Audio reader */}
          {ttsText.length > 20 && (
            <div className="mb-8">
              <ArticleReader
                text={ttsText}
                locale={locale}
                label={t("listenArticle")}
              />
            </div>
          )}

          {/* Summary — optimized for reading */}
          {localized.summary && (
            <div className="mb-8">
              <p
                className="text-base lg:text-[17px]"
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: "1.75",
                }}
              >
                {localized.summary}
              </p>
            </div>
          )}

          {/* Original content */}
          {article.original_content && (
            <div
              className="mb-8 rounded-xl p-6"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <h2
                className="mb-4 text-sm font-semibold tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                {t("originalContentLabel")}
              </h2>
              <div
                className="space-y-3 text-sm"
                style={{ color: "var(--text-secondary)", lineHeight: "1.75" }}
              >
                {article.original_content.split("\n").map((line, i) =>
                  line.trim() ? (
                    <p key={i}>{line}</p>
                  ) : null,
                )}
              </div>
            </div>
          )}

          {/* CTA original article — left-aligned */}
          <div className="mb-10">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200"
              style={{
                background: "var(--color-primary-600)",
                color: "white",
                boxShadow: "var(--shadow-glow-primary)",
              }}
            >
              {t("viewOriginal")}
              <ArrowUpRight size={16} />
            </a>
          </div>
        </div>

        {/* Similar articles */}
        {similarArticles.length > 0 && (
          <div className="mx-auto" style={{ maxWidth: "680px" }}>
            <div
              className="my-8"
              style={{
                height: "1px",
                background:
                  "linear-gradient(to right, transparent, var(--border-subtle), transparent)",
              }}
            />

            <h2
              className="mb-5 text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("similarArticles")}
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              {similarArticles.map((similar) => {
                const simLocalized = getLocalizedArticle(similar, locale);
                return (
                  <Link
                    key={similar.id}
                    href={`/articles/${similar.id}`}
                    className="group rounded-xl p-4 transition-all duration-200"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {similar.thumbnail_url && (
                      <div
                        className="mb-3 overflow-hidden rounded-lg"
                        style={{
                          height: "96px",
                          background: "var(--bg-elevated)",
                        }}
                      >
                        <img
                          src={similar.thumbnail_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="mb-2 flex items-center gap-2">
                      <SourceIcon type={similar.source_type} />
                      <ScoreBadgeServer score={similar.score} />
                    </div>
                    <h3
                      className="line-clamp-2 text-sm font-medium leading-snug group-hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {simLocalized.title}
                    </h3>
                    {similar.published_at && (
                      <p
                        className="mt-2 text-xs ltr-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {new Date(similar.published_at).toLocaleDateString(intlLocale, {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider before navigation */}
        <div className="mx-auto" style={{ maxWidth: "680px" }}>
          <div
            className="my-8"
            style={{
              height: "1px",
              background:
                "linear-gradient(to right, transparent, var(--border-subtle), transparent)",
            }}
          />

          {/* Article navigation */}
          <ArticleNavigation
            adjacent={adjacent}
            prevLabel={t("previousArticle")}
            nextLabel={t("nextArticle")}
          />
        </div>
      </article>
    </>
  );
}
