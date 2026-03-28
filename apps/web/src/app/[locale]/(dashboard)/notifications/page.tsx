import { getTranslations } from "next-intl/server";
import { Bell, Clock, Info, Lock, MessageCircle, Send, Shield } from "lucide-react";

function ReadOnlyField({
  icon: Icon,
  label,
  value,
  tooltip,
}: Readonly<{
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  tooltip: string;
}>) {
  return (
    <div>
      <label
        className="mb-2 flex items-center gap-1 text-sm font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        <Icon
          size={14}
          className="inline-block"
          style={{ verticalAlign: "text-top" }}
        />
        {label}
        <span className="group relative ms-1 cursor-help">
          <Info size={14} style={{ color: "var(--text-muted)" }} />
          <span
            className="pointer-events-none absolute inset-s-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            {tooltip}
          </span>
        </span>
      </label>
      <div
        className="flex items-center justify-between rounded-lg px-4 py-3 text-sm"
        style={{
          background: "var(--bg-muted, var(--bg-elevated))",
          border: "1px solid var(--border-default)",
          color: "var(--text-muted)",
        }}
      >
        <span>{value}</span>
        <Lock size={14} style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );
}

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

      {/* Informational banner */}
      <div
        className="flex items-start gap-3 rounded-xl p-4"
        style={{
          background: "color-mix(in srgb, var(--color-primary) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
        }}
      >
        <MessageCircle
          size={20}
          className="mt-0.5 shrink-0"
          style={{ color: "var(--color-primary)" }}
        />
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {t("bannerTitle")}
          </p>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("bannerDescription")}
          </p>
        </div>
      </div>

      {/* WhatsApp Config */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Send size={20} style={{ color: "var(--color-success)" }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("whatsappConfig")}
            </h2>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background: "color-mix(in srgb, var(--text-muted) 10%, transparent)",
              color: "var(--text-muted)",
            }}
          >
            <Lock size={12} />
            {t("readOnly")}
          </span>
        </div>

        <div className="space-y-5">
          <ReadOnlyField
            icon={Clock}
            label={t("digestTime")}
            value="08:00"
            tooltip={t("adminConfigured")}
          />
          <ReadOnlyField
            icon={Shield}
            label={t("minScoreAlert")}
            value="9.0 / 10"
            tooltip={t("adminConfigured")}
          />
          <ReadOnlyField
            icon={Bell}
            label={t("maxArticles")}
            value="5"
            tooltip={t("adminConfigured")}
          />
        </div>
      </div>
    </div>
  );
}
