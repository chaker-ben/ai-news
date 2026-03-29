"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { X, Send, Sparkles, Loader2, Crown } from "lucide-react";
import { Link } from "@/i18n/routing";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface ChatUsage {
  messages_today: number;
  messages_limit: number;
  tokens_this_month: number;
  tokens_limit: number;
  can_chat: boolean;
}

interface ChatPanelProps {
  articleId: string;
  articleTitle: string;
  onClose: () => void;
}

export function ChatPanel({ articleId, articleTitle, onClose }: ChatPanelProps) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Lock body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Initialize: fetch usage + create/get conversation + load messages
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        setError(null);

        // Fetch usage
        const usageRes = await fetch("/api/chat/usage");
        if (!usageRes.ok) throw new Error("Failed to fetch usage");
        const usageData = await usageRes.json();
        if (cancelled) return;
        setUsage(usageData.data);

        if (!usageData.data.can_chat) {
          setLoading(false);
          return;
        }

        // Create or get conversation
        const convRes = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId }),
        });
        if (!convRes.ok) throw new Error("Failed to create conversation");
        const convData = await convRes.json();
        if (cancelled) return;
        setConversationId(convData.data.id);

        // Load existing messages
        const msgsRes = await fetch(
          `/api/chat/conversations/${convData.data.id}/messages?skip=0&take=50`
        );
        if (!msgsRes.ok) throw new Error("Failed to load messages");
        const msgsData = await msgsRes.json();
        if (cancelled) return;

        setMessages(
          msgsData.data.map(
            (msg: { id: string; role: string; content: string; created_at?: string }) => ({
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              createdAt: msg.created_at,
            })
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || sending || streaming) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    const assistantMessage: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setSending(true);
    setStreaming(true);
    setError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: userMessage.content }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + data.text,
                  };
                }
                return updated;
              });
            } else if (data.type === "done") {
              // Update usage after completion
              if (data.tokens_used && usage) {
                setUsage((prev) =>
                  prev
                    ? {
                        ...prev,
                        messages_today: prev.messages_today + 1,
                        tokens_this_month:
                          prev.tokens_this_month + (data.tokens_used as number),
                      }
                    : prev
                );
              }
            } else if (data.type === "error") {
              setError(data.message || "Stream error");
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove the empty assistant message on error
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          updated.pop();
        }
        return updated;
      });
    } finally {
      setSending(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const remainingMessages = usage
    ? Math.max(0, usage.messages_limit - usage.messages_today)
    : null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-50 cursor-default"
        style={{ background: "rgb(0 0 0 / 0.5)" }}
        onClick={onClose}
        aria-label={t("close")}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 z-50 flex w-full flex-col sm:w-[400px]"
        style={{
          insetInlineEnd: 0,
          background: "var(--bg-secondary)",
          borderInlineStart: "1px solid var(--border-subtle)",
          boxShadow: "-8px 0 32px rgb(0 0 0 / 0.3)",
        }}
        role="dialog"
        aria-label={t("title")}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBlockEnd: "1px solid var(--border-subtle)" }}
        >
          <div className="flex-1 min-w-0">
            <h2
              className="truncate text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {articleTitle}
            </h2>
            {remainingMessages !== null && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {t("creditsRemaining", { count: remainingMessages })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label={t("close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "var(--color-primary-400)" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {t("loading")}
              </p>
            </div>
          ) : error && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <p
                className="text-sm text-center"
                style={{ color: "var(--text-muted)" }}
              >
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {t("retry")}
              </button>
            </div>
          ) : usage && !usage.can_chat ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <Crown
                size={32}
                style={{ color: "var(--color-primary-400)" }}
              />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("upgradeTitle")}
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("upgradeDescription")}
                </p>
              </div>
              <Link
                href="/pricing"
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                style={{
                  background: "var(--color-primary-600)",
                  color: "white",
                  boxShadow: "var(--shadow-glow-primary)",
                }}
              >
                {t("upgradeCta")}
              </Link>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Sparkles
                size={32}
                style={{ color: "var(--color-primary-400)" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {t("emptyState")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm"
                    style={{
                      background:
                        msg.role === "user"
                          ? "var(--color-primary-600)"
                          : "var(--bg-surface)",
                      color:
                        msg.role === "user"
                          ? "white"
                          : "var(--text-secondary)",
                      border:
                        msg.role === "assistant"
                          ? "1px solid var(--border-subtle)"
                          : "none",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.content}
                    {msg.role === "assistant" &&
                      !msg.content &&
                      streaming && (
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
                            style={{
                              background: "var(--text-muted)",
                              animationDelay: "0ms",
                            }}
                          />
                          <span
                            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
                            style={{
                              background: "var(--text-muted)",
                              animationDelay: "150ms",
                            }}
                          />
                          <span
                            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full"
                            style={{
                              background: "var(--text-muted)",
                              animationDelay: "300ms",
                            }}
                          />
                        </span>
                      )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && messages.length > 0 && (
          <div
            className="mx-4 mb-2 rounded-lg px-3 py-2 text-xs"
            style={{
              background: "color-mix(in srgb, var(--color-error, #ef4444) 12%, transparent)",
              color: "var(--color-error, #ef4444)",
            }}
          >
            {error}
          </div>
        )}

        {/* Input area */}
        {usage?.can_chat !== false && !loading && (
          <div
            className="px-4 py-3"
            style={{ borderBlockStart: "1px solid var(--border-subtle)" }}
          >
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={t("inputPlaceholder")}
                rows={1}
                disabled={sending}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:opacity-50"
                style={{
                  color: "var(--text-primary)",
                  maxHeight: "120px",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending || streaming}
                className="shrink-0 rounded-lg p-2 transition-all"
                style={{
                  color:
                    input.trim() && !sending
                      ? "var(--color-primary-400)"
                      : "var(--text-muted)",
                  opacity: input.trim() && !sending ? 1 : 0.5,
                }}
                aria-label={t("send")}
              >
                {sending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
