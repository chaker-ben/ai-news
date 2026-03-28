"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Search,
  X,
  FileText,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ArrowDownWideNarrow,
  RotateCcw,
  SearchX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BookmarkButton } from "@/components/bookmark-button";
import { ScoreBadge } from "@/components/score-badge";
import type { Article } from "@/lib/api";

type SourceFilter = "all" | "blog" | "arxiv" | "twitter" | "youtube";
type StatusFilter = "all" | "pending" | "notified";
type SortOption = "score_desc" | "date_desc" | "date_asc";

interface LocalizedArticle {
  id: string;
  title: string;
  summary: string | null;
  article: Article;
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}


function SourceTypeBadge({ type }: Readonly<{ type: string }>) {
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

function FilterChip({
  label,
  active,
  onClick,
}: Readonly<{
  label: string;
  active: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active
          ? "var(--color-primary-500)"
          : "var(--bg-elevated)",
        color: active ? "#fff" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--color-primary-500)" : "var(--border-default)"}`,
      }}
    >
      {label}
    </button>
  );
}

function SortChip({
  label,
  arrow,
  active,
  onClick,
}: Readonly<{
  label: string;
  arrow: string;
  active: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active
          ? "color-mix(in srgb, var(--color-primary-500) 15%, transparent)"
          : "var(--bg-elevated)",
        color: active ? "var(--color-primary-500)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--color-primary-500)" : "var(--border-default)"}`,
      }}
    >
      {label} <span className="text-[10px]">{arrow}</span>
    </button>
  );
}

export function ArticlesFilterList({
  localizedArticles,
  intlLocale,
}: Readonly<{
  localizedArticles: LocalizedArticle[];
  intlLocale: string;
}>) {
  const t = useTranslations("articles");

  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("score_desc");
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  const hasActiveFilters =
    debouncedQuery !== "" ||
    sourceFilter !== "all" ||
    statusFilter !== "all" ||
    sortOption !== "score_desc";

  const resetFilters = useCallback(() => {
    setQuery("");
    setSourceFilter("all");
    setStatusFilter("all");
    setSortOption("score_desc");
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    let result = localizedArticles;

    // Search by title
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.article.original_title.toLowerCase().includes(q),
      );
    }

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter(
        (item) => item.article.source_type === sourceFilter,
      );
    }

    // Status filter
    if (statusFilter === "notified") {
      result = result.filter((item) => item.article.notified);
    } else if (statusFilter === "pending") {
      result = result.filter((item) => !item.article.notified);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case "score_desc":
          return b.article.score - a.article.score;
        case "date_desc": {
          const dateA = a.article.published_at
            ? new Date(a.article.published_at).getTime()
            : 0;
          const dateB = b.article.published_at
            ? new Date(b.article.published_at).getTime()
            : 0;
          return dateB - dateA;
        }
        case "date_asc": {
          const dateA2 = a.article.published_at
            ? new Date(a.article.published_at).getTime()
            : 0;
          const dateB2 = b.article.published_at
            ? new Date(b.article.published_at).getTime()
            : 0;
          return dateA2 - dateB2;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [localizedArticles, debouncedQuery, sourceFilter, statusFilter, sortOption]);

  return (
    <>
      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute inset-is-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-xl py-3 ps-10 pe-10 text-sm outline-none transition-colors placeholder:text-[var(--text-muted)]"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-ie-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="space-y-3">
        {/* Source filters */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label={t("all")}
            active={sourceFilter === "all" && statusFilter === "all"}
            onClick={() => {
              setSourceFilter("all");
              setStatusFilter("all");
            }}
          />

          <span
            className="mx-1 h-4 w-px"
            style={{ background: "var(--border-default)" }}
          />

          {(["blog", "arxiv", "twitter", "youtube"] as const).map((src) => (
            <FilterChip
              key={src}
              label={t(src)}
              active={sourceFilter === src}
              onClick={() =>
                setSourceFilter(sourceFilter === src ? "all" : src)
              }
            />
          ))}

          <span
            className="mx-1 h-4 w-px"
            style={{ background: "var(--border-default)" }}
          />

          <FilterChip
            label={t("statusPending")}
            active={statusFilter === "pending"}
            onClick={() =>
              setStatusFilter(statusFilter === "pending" ? "all" : "pending")
            }
          />
          <FilterChip
            label={t("statusNotified")}
            active={statusFilter === "notified"}
            onClick={() =>
              setStatusFilter(
                statusFilter === "notified" ? "all" : "notified",
              )
            }
          />
        </div>

        {/* Sort options */}
        <div className="flex flex-wrap items-center gap-2">
          <ArrowDownWideNarrow
            size={14}
            style={{ color: "var(--text-muted)" }}
          />
          <SortChip
            label={t("sortScoreDesc")}
            arrow={"\u2193"}
            active={sortOption === "score_desc"}
            onClick={() => setSortOption("score_desc")}
          />
          <SortChip
            label={t("sortDateDesc")}
            arrow={"\u2193"}
            active={sortOption === "date_desc"}
            onClick={() => setSortOption("date_desc")}
          />
          <SortChip
            label={t("sortDateAsc")}
            arrow={"\u2191"}
            active={sortOption === "date_asc"}
            onClick={() => setSortOption("date_asc")}
          />
        </div>
      </div>

      {/* Result count */}
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {t("resultsCount", { count: filtered.length })}
      </p>

      {/* Article list or empty state */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(({ id, title, summary, article }) => (
            <Link
              key={id}
              href={`/articles/${id}`}
              className="group block rounded-xl p-5 transition-all duration-200"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-start gap-4">
                {article.thumbnail_url && (
                  <div
                    className="hidden shrink-0 overflow-hidden rounded-lg sm:block"
                    style={{
                      width: 96,
                      height: 64,
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <img
                      src={article.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceTypeBadge type={article.source_type} />
                    <ScoreBadge score={article.score} />
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
                  <h3
                    className="mt-2 text-sm font-semibold leading-snug"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {title}
                  </h3>

                  {/* Summary */}
                  {summary && (
                    <p
                      className="mt-2 line-clamp-2 text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {summary}
                    </p>
                  )}

                  {/* Meta */}
                  <div
                    className="mt-3 flex items-center gap-4 text-xs ltr-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {article.published_at && (
                      <time>
                        {new Date(article.published_at).toLocaleDateString(
                          intlLocale,
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </time>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <BookmarkButton articleId={id} />
                  <div
                    className="rounded-lg p-2 opacity-0 transition-all group-hover:opacity-100"
                    style={{ color: "var(--color-primary-400)" }}
                  >
                    <ArrowUpRight size={18} />
                  </div>
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
          {hasActiveFilters ? (
            <>
              <SearchX
                size={48}
                className="mx-auto mb-4"
                style={{ color: "var(--text-muted)" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("noFilterResults")}
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {t("noFilterResultsCta")}
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: "var(--color-primary-500)",
                  color: "#fff",
                }}
              >
                <RotateCcw size={14} />
                {t("resetFilters")}
              </button>
            </>
          ) : (
            <>
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
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {t("emptyCta")}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
