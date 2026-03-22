"use client";

import { useTranslations } from "next-intl";
import { Settings, Globe, Palette, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const currentLocale = pathname.startsWith("/en") ? "en" : "fr";

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(/^\/(fr|en)/, `/${newLocale}`);
    router.push(newPath);
  };

  const themeOptions = [
    { value: "dark", label: t("themeDark"), icon: Moon },
    { value: "light", label: t("themeLight"), icon: Sun },
    { value: "system", label: t("themeSystem"), icon: Monitor },
  ] as const;

  const languageOptions = [
    { value: "fr", label: "Francais" },
    { value: "en", label: "English" },
  ] as const;

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

      {/* Appearance */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Palette size={20} style={{ color: "var(--color-primary-400)" }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("appearance")}
          </h2>
        </div>

        {/* Theme selector */}
        <div className="mb-6">
          <label
            className="mb-3 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("theme")}
          </label>
          <div className="flex gap-3">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all"
                style={{
                  background:
                    theme === value
                      ? "var(--color-primary-600)"
                      : "var(--bg-elevated)",
                  color:
                    theme === value
                      ? "white"
                      : "var(--text-secondary)",
                  border: `1px solid ${theme === value ? "var(--color-primary-600)" : "var(--border-default)"}`,
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Language selector */}
        <div>
          <label
            className="mb-3 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            <Globe
              size={14}
              className="inline-block me-1"
              style={{ verticalAlign: "text-top" }}
            />
            {t("language")}
          </label>
          <div className="flex gap-3">
            {languageOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => switchLocale(value)}
                className="flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all"
                style={{
                  background:
                    currentLocale === value
                      ? "var(--color-primary-600)"
                      : "var(--bg-elevated)",
                  color:
                    currentLocale === value
                      ? "white"
                      : "var(--text-secondary)",
                  border: `1px solid ${currentLocale === value ? "var(--color-primary-600)" : "var(--border-default)"}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
