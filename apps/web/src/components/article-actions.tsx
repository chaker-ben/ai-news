"use client";

import { useState, useCallback } from "react";
import { Link2, Check, BookmarkCheck, Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";

export function CopyLinkButton() {
  const t = useTranslations("articles");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
      style={{
        color: copied ? "var(--color-success, #22c55e)" : "var(--text-muted)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
      }}
      title={t("copyLink")}
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
      {copied ? t("linkCopied") : t("copyLink")}
    </button>
  );
}

export function MarkAsReadButton({ articleId }: Readonly<{ articleId: string }>) {
  const t = useTranslations("articles");
  const [read, setRead] = useState(false);

  const toggle = useCallback(() => {
    setRead((prev) => !prev);
    // Persist read status via API if needed in the future
    void articleId;
  }, [articleId]);

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
      style={{
        color: read ? "var(--color-success, #22c55e)" : "var(--text-muted)",
        background: read
          ? "rgb(34 197 94 / 0.1)"
          : "var(--bg-elevated)",
        border: `1px solid ${read ? "rgb(34 197 94 / 0.25)" : "var(--border-default)"}`,
      }}
    >
      {read ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
      {read ? t("markedAsRead") : t("markAsRead")}
    </button>
  );
}
