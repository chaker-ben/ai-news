import { getTranslations } from "next-intl/server";
import { Bell, Clock, Send, Shield } from "lucide-react";

export default async function NotificationsPage() {
  const t = await getTranslations("notifications");

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>
      </div>

      {/* WhatsApp Config */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Send size={20} style={{ color: "var(--color-success)" }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("whatsappConfig")}
          </h2>
        </div>

        <div className="space-y-5">
          {/* Digest time */}
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <Clock size={14} className="inline-block me-1" style={{ verticalAlign: "text-top" }} />
              {t("digestTime")}
            </label>
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              08:00
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Configure via DIGEST_TIME dans .env
            </p>
          </div>

          {/* Min score */}
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <Shield size={14} className="inline-block me-1" style={{ verticalAlign: "text-top" }} />
              {t("minScoreAlert")}
            </label>
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              9.0 / 10
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Configure via MIN_SCORE_ALERT dans .env
            </p>
          </div>

          {/* Max articles */}
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <Bell size={14} className="inline-block me-1" style={{ verticalAlign: "text-top" }} />
              {t("maxArticles")}
            </label>
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              5
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Configure via MAX_ARTICLES_DIGEST dans .env
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
