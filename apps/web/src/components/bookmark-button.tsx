"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";

export function BookmarkButton({
  articleId,
  initialBookmarked = false,
}: {
  articleId: string;
  initialBookmarked?: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      if (bookmarked) {
        await fetch(`/api/user/bookmarks/${articleId}`, { method: "DELETE" });
        setBookmarked(false);
      } else {
        await fetch("/api/user/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId }),
        });
        setBookmarked(true);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const Icon = loading ? Loader2 : bookmarked ? BookmarkCheck : Bookmark;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className="shrink-0 rounded-lg p-2 transition-colors"
      style={{
        color: bookmarked
          ? "var(--color-primary-400)"
          : "var(--text-muted)",
      }}
      disabled={loading}
    >
      <Icon size={16} className={loading ? "animate-spin" : ""} />
    </button>
  );
}
