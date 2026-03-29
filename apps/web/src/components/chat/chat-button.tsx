"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChatPanel } from "./chat-panel";

interface ChatButtonProps {
  articleId: string;
  articleTitle: string;
}

export function ChatButton({ articleId, articleTitle }: ChatButtonProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("chat");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg p-2 transition-all duration-200"
        style={{
          color: "var(--text-muted)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--color-primary-400)";
          e.currentTarget.style.boxShadow = "var(--shadow-glow-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.boxShadow = "none";
        }}
        aria-label={t("openChat")}
      >
        <MessageCircle size={16} />
      </button>

      {open && (
        <ChatPanel
          articleId={articleId}
          articleTitle={articleTitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
