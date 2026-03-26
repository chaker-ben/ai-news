import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { AdjacentArticles } from "@/lib/api";

interface ArticleNavigationProps {
  adjacent: AdjacentArticles;
  prevLabel: string;
  nextLabel: string;
}

export function ArticleNavigation({
  adjacent,
  prevLabel,
  nextLabel,
}: ArticleNavigationProps) {
  if (!adjacent.prev && !adjacent.next) return null;

  return (
    <nav
      className="grid gap-3"
      style={{
        gridTemplateColumns: adjacent.prev && adjacent.next ? "1fr 1fr" : "1fr",
      }}
    >
      {adjacent.prev && (
        <Link
          href={`/articles/${adjacent.prev.id}`}
          className="group flex items-start gap-3 rounded-xl p-4 transition-all duration-200"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <ChevronLeft
            size={20}
            className="mt-0.5 shrink-0 transition-transform group-hover:-translate-x-0.5"
            style={{ color: "var(--color-primary-400)" }}
          />
          <div className="min-w-0">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {prevLabel}
            </span>
            <p
              className="mt-1 line-clamp-2 text-sm font-medium leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {adjacent.prev.title}
            </p>
          </div>
        </Link>
      )}

      {adjacent.next && (
        <Link
          href={`/articles/${adjacent.next.id}`}
          className="group flex items-start gap-3 rounded-xl p-4 text-end transition-all duration-200"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            gridColumn: !adjacent.prev ? "1" : undefined,
          }}
        >
          <div className="min-w-0 flex-1">
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {nextLabel}
            </span>
            <p
              className="mt-1 line-clamp-2 text-sm font-medium leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {adjacent.next.title}
            </p>
          </div>
          <ChevronRight
            size={20}
            className="mt-0.5 shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ color: "var(--color-primary-400)" }}
          />
        </Link>
      )}
    </nav>
  );
}
