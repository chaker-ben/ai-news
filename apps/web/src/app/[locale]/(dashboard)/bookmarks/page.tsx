"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import {
  Bookmark,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";

interface BookmarkItem {
  id: string;
  articleId: string;
  createdAt: string;
  article: {
    id: string;
    originalTitle: string;
    titleFr: string | null;
    titleEn?: string | null;
    titleAr?: string | null;
    summaryFr: string | null;
    url: string;
    sourceType: string;
    score: number;
    publishedAt: string | null;
  };
}

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
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ltr-nums"
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

function getLocalizedTitle(
  article: BookmarkItem["article"],
  locale: string,
): string {
  switch (locale) {
    case "ar":
      return article.titleAr || article.titleFr || article.originalTitle;
    case "en":
      return article.titleEn || article.originalTitle;
    case "fr":
    default:
      return article.titleFr || article.originalTitle;
  }
}

const LOCALE_MAP: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-SA",
};

export default function BookmarksPage() {
  const t = useTranslations("bookmarks");
  const locale = useLocale();
  const intlLocale = LOCALE_MAP[locale] || "fr-FR";

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    try {
      const res = await fetch("/api/user/bookmarks");
      const json = await res.json();
      if (json.data) setBookmarks(json.data);
    } catch {
      // silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleRemove = async (articleId: string) => {
    setRemovingId(articleId);
    try {
      await fetch(`/api/user/bookmarks/${articleId}`, { method: "DELETE" });
      setBookmarks((prev) => prev.filter((b) => b.articleId !== articleId));
    } catch {
      // silently handle remove errors
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "var(--text-muted)" }}
          />
        </div>
      )}

      {/* Bookmarks list */}
      {!loading && bookmarks.length > 0 && (
        <div className="space-y-3">
          {bookmarks.map((bookmark) => {
            const { article } = bookmark;
            const title = getLocalizedTitle(article, locale);
            const isRemoving = removingId === bookmark.articleId;

            return (
              <div
                key={bookmark.id}
                className="rounded-xl p-5 transition-all duration-200"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceTypeBadge type={article.sourceType} />
                      <ScoreBadge score={article.score} />
                    </div>

                    {/* Title */}
                    <h3
                      className="mt-2 text-sm font-semibold leading-snug"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {title}
                    </h3>

                    {/* Date */}
                    {article.publishedAt && (
                      <time
                        className="mt-2 block text-xs ltr-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {new Date(article.publishedAt).toLocaleDateString(intlLocale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 transition-colors"
                      style={{ color: "var(--color-primary-400)" }}
                      title={t("viewOriginal")}
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => handleRemove(bookmark.articleId)}
                      disabled={isRemoving}
                      className="rounded-lg p-2 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      title={t("remove")}
                    >
                      {isRemoving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && bookmarks.length === 0 && (
        <div
          className="rounded-xl px-6 py-16 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Bookmark
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
