import type { z } from "zod";
import type { articleSchema, articleDetailSchema } from "./api";

type Article = z.infer<typeof articleSchema>;
type ArticleDetail = z.infer<typeof articleDetailSchema>;
type AnyArticle = Article | ArticleDetail;

interface LocalizedArticle {
  title: string;
  summary: string | null;
}

const LOCALE_MAP: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-SA",
};

function getTitleFr(article: AnyArticle): string | null {
  if ("title_fr" in article) return article.title_fr;
  if ("title" in article) return article.title;
  return null;
}

function getSummaryFr(article: AnyArticle): string | null {
  if ("summary_fr" in article) return article.summary_fr ?? null;
  if ("summary" in article) return article.summary;
  return null;
}

/**
 * Get the localized title and summary for an article based on the current locale.
 * Fallback chain: requested locale -> fr -> original_title
 */
export function getLocalizedArticle(
  article: AnyArticle,
  locale: string,
): LocalizedArticle {
  const titleFr = getTitleFr(article);
  const summaryFr = getSummaryFr(article);

  switch (locale) {
    case "ar":
      return {
        title: article.title_ar || titleFr || article.original_title,
        summary: article.summary_ar || summaryFr || null,
      };
    case "en":
      return {
        title: article.title_en || article.original_title,
        summary: article.summary_en || summaryFr || null,
      };
    case "fr":
    default:
      return {
        title: titleFr || article.original_title,
        summary: summaryFr || null,
      };
  }
}

/**
 * Get the Intl locale string for date/number formatting.
 */
export function getIntlLocale(locale: string): string {
  return LOCALE_MAP[locale] || "fr-FR";
}
