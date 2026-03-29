import { getTranslations } from "next-intl/server";
import { FileEdit, PenLine, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "@/i18n/routing";

interface PublishedArticle {
  id: string;
  title: string;
  status: string;
  language: string;
  media_count?: number;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  data: PublishedArticle[];
  pagination: {
    total: number;
    hasMore: boolean;
  };
}

async function fetchMyArticles(
  status?: string
): Promise<PaginatedResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const params = new URLSearchParams({ skip: "0", take: "50" });
  if (status && status !== "all") {
    params.set("status", status);
  }

  try {
    const res = await fetch(
      `${baseUrl}/api/articles/my?${params.toString()}`,
      {
        cache: "no-store",
      }
    );
    if (!res.ok) return { data: [], pagination: { total: 0, hasMore: false } };
    return res.json();
  } catch {
    return { data: [], pagination: { total: 0, hasMore: false } };
  }
}

function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const config: Record<string, { color: string; bg: string }> = {
    draft: {
      color: "var(--text-muted)",
      bg: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
    },
    pending: {
      color: "var(--color-warning, #f59e0b)",
      bg: "color-mix(in srgb, var(--color-warning, #f59e0b) 12%, transparent)",
    },
    published: {
      color: "var(--color-success, #22c55e)",
      bg: "color-mix(in srgb, var(--color-success, #22c55e) 12%, transparent)",
    },
    rejected: {
      color: "var(--color-error, #ef4444)",
      bg: "color-mix(in srgb, var(--color-error, #ef4444) 12%, transparent)",
    },
  };

  const { color, bg } = config[status] || config.draft;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color, background: bg }}
    >
      {status === "draft" && <FileEdit size={10} />}
      {status === "pending" && <Clock size={10} />}
      {status === "published" && <CheckCircle2 size={10} />}
      {status === "rejected" && <AlertCircle size={10} />}
      {t(`status_${status}`)}
    </span>
  );
}

export default async function MyArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const t = await getTranslations("publish");
  const { data: articles, pagination } = await fetchMyArticles(statusFilter);

  const tabs = ["all", "draft", "pending", "published"] as const;
  const currentTab = statusFilter || "all";

  return (
    <div className="mx-auto max-w-3xl pb-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("myArticles")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {t("myArticlesCount", { count: pagination.total })}
          </p>
        </div>
        <Link
          href="/articles/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
          style={{
            background: "var(--color-primary-600)",
            color: "white",
            boxShadow: "var(--shadow-glow-primary)",
          }}
        >
          <PenLine size={16} />
          {t("writeNew")}
        </Link>
      </div>

      {/* Status filter tabs */}
      <div
        className="mb-6 flex gap-1 rounded-xl p-1"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={`/articles/my${tab === "all" ? "" : `?status=${tab}`}`}
            className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-all"
            style={{
              color:
                currentTab === tab
                  ? "var(--color-primary-400)"
                  : "var(--text-muted)",
              background:
                currentTab === tab ? "var(--bg-hover)" : "transparent",
            }}
          >
            {t(`tab_${tab}`)}
          </Link>
        ))}
      </div>

      {/* Articles list */}
      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              background:
                "color-mix(in srgb, var(--text-muted) 12%, transparent)",
            }}
          >
            <PenLine size={24} style={{ color: "var(--text-muted)" }} />
          </div>
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {t("emptyTitle")}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {t("emptyDescription")}
            </p>
          </div>
          <Link
            href="/articles/new"
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-all"
            style={{
              background: "var(--color-primary-600)",
              color: "white",
              boxShadow: "var(--shadow-glow-primary)",
            }}
          >
            {t("writeFirst")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={
                article.status === "draft"
                  ? `/articles/new?draft=${article.id}`
                  : `/articles/${article.id}`
              }
              className="group block rounded-xl p-4 transition-all duration-200"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3
                    className="truncate text-sm font-semibold group-hover:underline"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {article.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={article.status} t={t} />
                    {article.media_count != null && article.media_count > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t("mediaCount", { count: article.media_count })}
                      </span>
                    )}
                    <span
                      className="text-xs ltr-nums"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {new Date(article.updated_at).toLocaleDateString(
                        undefined,
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
