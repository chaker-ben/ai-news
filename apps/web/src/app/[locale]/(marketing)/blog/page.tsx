"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";

export default function BlogPage() {
  const t = useTranslations("comingSoon");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: 700,
            marginBlockEnd: "1rem",
          }}
        >
          {t("title")}
        </h1>
        <p
          style={{
            fontSize: "var(--text-base)",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBlockEnd: "2rem",
          }}
        >
          {t("description")}
        </p>
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
          }}
        >
          <ArrowLeft size={16} />
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
