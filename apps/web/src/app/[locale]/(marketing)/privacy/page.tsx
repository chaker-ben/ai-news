"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const t = useTranslations("legal.privacy");

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "6rem 1.5rem 4rem",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ maxWidth: "720px", marginInline: "auto" }}>
        <Link
          href="/landing"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#3b82f6",
            textDecoration: "none",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            marginBlockEnd: "2rem",
          }}
        >
          <ArrowLeft size={16} />
          {t("backHome")}
        </Link>

        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: 700,
            marginBlockEnd: "0.5rem",
          }}
        >
          {t("title")}
        </h1>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            marginBlockEnd: "2.5rem",
          }}
        >
          {t("lastUpdated")}
        </p>

        {(["intro", "dataCollected", "usage", "sharing", "retention", "rights", "contact"] as const).map(
          (section) => (
            <section key={section} style={{ marginBlockEnd: "2rem" }}>
              <h2
                style={{
                  fontSize: "var(--text-xl)",
                  fontWeight: 600,
                  marginBlockEnd: "0.75rem",
                  color: "var(--text-primary)",
                }}
              >
                {t(`sections.${section}.title`)}
              </h2>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  lineHeight: 1.7,
                  color: "var(--text-secondary)",
                }}
              >
                {t(`sections.${section}.content`)}
              </p>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
