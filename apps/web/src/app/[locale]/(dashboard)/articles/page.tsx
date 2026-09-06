import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";
import { getArticles } from "@/lib/api";
import { getLocalizedArticle, getIntlLocale } from "@/lib/article-i18n";
import { ArticlesFilterList } from "@/components/articles/articles-filter-list";
import { ScoreLegend } from "@/components/score-badge";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: string | undefined): string | undefined {
  return value && DATE_RE.test(value) ? value : undefined;
}

function parseTzOffset(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= 840 ? Math.trunc(n) : 0;
}

export default async function ArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; tz?: string }>;
}) {
  const { locale } = await params;
  const { from, to, tz } = await searchParams;
  const intlLocale = getIntlLocale(locale);
  const t = await getTranslations("articles");

  // Day filter: inclusive local dates from the URL, resolved server-side so the
  // whole day is returned instead of only the 30 top-scored articles.
  const dateFrom = parseDateParam(from);
  const dateTo = parseDateParam(to) ?? dateFrom;
  const dateFilter =
    dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null;

  let articles = null;

  try {
    const response = dateFilter
      ? await getArticles({
          limit: 100,
          date_from: dateFilter.from,
          date_to: dateFilter.to,
          tz_offset: parseTzOffset(tz),
          sort: "date",
        })
      : await getArticles({ limit: 30 });
    articles = response.articles;
  } catch {
    // API not available
  }

  if (!dateFilter && (!articles || articles.length === 0)) {
    return (
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("title")}
          </h1>
        </div>
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
      </div>
    );
  }

  const localizedArticles = (articles ?? []).map((article) => {
    const localized = getLocalizedArticle(article, locale);
    return {
      id: article.id,
      title: localized.title,
      summary: localized.summary,
      article,
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("scoreLegendTitle")}:
          </span>
          <ScoreLegend />
        </div>
      </div>

      <ArticlesFilterList
        localizedArticles={localizedArticles}
        intlLocale={intlLocale}
        dateFilter={dateFilter}
      />
    </div>
  );
}
