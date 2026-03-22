import { getTranslations } from "next-intl/server";
import { Radio, CheckCircle2, XCircle } from "lucide-react";
import { getSources } from "@/lib/api";

function SourceTypeIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    blog: "var(--color-primary-500)",
    twitter: "#1DA1F2",
    youtube: "#FF0000",
    reddit: "#FF4500",
    arxiv: "var(--color-accent-500)",
  };

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold uppercase"
      style={{
        color: colors[type] || "var(--text-muted)",
        background: `color-mix(in srgb, ${colors[type] || "var(--text-muted)"} 12%, transparent)`,
      }}
    >
      {type.slice(0, 2)}
    </div>
  );
}

export default async function SourcesPage() {
  const t = await getTranslations("sources");

  let sources = null;

  try {
    const response = await getSources();
    sources = response.sources;
  } catch {
    // API not available
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {sources ? `${sources.length} ${t("title").toLowerCase()}` : ""}
          </p>
        </div>
      </div>

      {/* Sources grid */}
      {sources && sources.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="rounded-xl p-5"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-start gap-3">
                <SourceTypeIcon type={source.type} />
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {source.name}
                  </h3>
                  <p
                    className="mt-0.5 text-xs uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {source.type}
                  </p>
                </div>
                {source.active ? (
                  <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} />
                ) : (
                  <XCircle size={16} style={{ color: "var(--color-error)" }} />
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>{t("status")}</span>
                  <span
                    style={{
                      color: source.active
                        ? "var(--color-success)"
                        : "var(--color-error)",
                    }}
                  >
                    {source.active ? t("active") : t("inactive")}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>{t("lastCollected")}</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {source.last_collected
                      ? new Date(source.last_collected).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl px-6 py-16 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Radio
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
      )}
    </div>
  );
}
