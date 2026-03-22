/**
 * Safe async wrapper — returns { data, error } instead of throwing.
 */
export type Result<T> = { data: T; error: null } | { data: null; error: Error };

export async function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { data: await fn(), error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Format a date for display.
 */
export function formatDate(date: Date, locale: string = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Generate a score badge color based on score value.
 */
export function getScoreColor(score: number): string {
  if (score >= 9) return "text-red-500";
  if (score >= 7) return "text-amber-500";
  if (score >= 5) return "text-blue-500";
  return "text-slate-500";
}
