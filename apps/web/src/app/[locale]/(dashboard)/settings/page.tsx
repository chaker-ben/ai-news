"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import {
  Globe,
  Palette,
  Moon,
  Sun,
  Monitor,
  Phone,
  Mail,
  Clock,
  SlidersHorizontal,
  Tag,
  Save,
  Loader2,
  Bell,
  MessageSquare,
  Check,
  BookOpen,
  Database,
  RefreshCw,
  FileText,
  Radio,
} from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";

const DIGEST_TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
];

const TIMEZONE_OPTIONS = [
  "Europe/Paris", "Europe/London", "America/New_York",
  "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai", "Asia/Riyadh",
  "Africa/Cairo", "Africa/Casablanca", "Australia/Sydney", "Pacific/Auckland",
];

function ToggleSwitch({
  checked,
  onChange,
  label,
  icon: Icon,
}: Readonly<{
  checked: boolean;
  onChange: () => void;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}>) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color: "var(--text-secondary)" }} />
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
      </div>
      <button
        onClick={onChange}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors"
        style={{
          background: checked ? "var(--color-primary-600)" : "var(--bg-elevated)",
          border: `1px solid ${checked ? "var(--color-primary-600)" : "var(--border-default)"}`,
        }}
        role="switch"
        aria-checked={checked}
      >
        <span
          className="pointer-events-none inline-block h-5 w-5 rounded-full shadow-sm transition-transform"
          style={{
            background: "white",
            transform: checked ? "translateX(1.25rem)" : "translateX(0)",
          }}
        />
      </button>
    </div>
  );
}

function ThemePreview({ variant }: Readonly<{ variant: "dark" | "light" | "system" }>) {
  if (variant === "system") {
    return (
      <div className="flex h-6 w-10 overflow-hidden rounded" aria-hidden="true">
        <div className="w-1/2" style={{ background: "#1e293b" }}>
          <div className="mx-auto mt-1 h-1 w-4 rounded" style={{ background: "#475569" }} />
          <div className="mx-auto mt-0.5 h-1 w-3 rounded" style={{ background: "#334155" }} />
        </div>
        <div className="w-1/2" style={{ background: "#f1f5f9" }}>
          <div className="mx-auto mt-1 h-1 w-4 rounded" style={{ background: "#cbd5e1" }} />
          <div className="mx-auto mt-0.5 h-1 w-3 rounded" style={{ background: "#e2e8f0" }} />
        </div>
      </div>
    );
  }

  const isDark = variant === "dark";
  return (
    <div
      className="h-6 w-10 rounded"
      style={{ background: isDark ? "#1e293b" : "#f1f5f9" }}
      aria-hidden="true"
    >
      <div
        className="mx-auto pt-1"
      >
        <div
          className="mx-auto h-1 w-6 rounded"
          style={{ background: isDark ? "#475569" : "#cbd5e1" }}
        />
        <div
          className="mx-auto mt-0.5 h-1 w-4 rounded"
          style={{ background: isDark ? "#334155" : "#e2e8f0" }}
        />
      </div>
    </div>
  );
}

function SaveToast({ visible, message }: Readonly<{ visible: boolean; message: string }>) {
  return (
    <div
      className={`
        fixed bottom-6 inset-ie-6 z-50 flex items-center gap-2 rounded-xl px-5 py-3
        text-sm font-medium shadow-lg transition-all duration-300
        ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}
      `}
      style={{
        background: "var(--color-success, #16a34a)",
        color: "white",
      }}
      role="status"
      aria-live="polite"
    >
      <Check size={16} />
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { preferences, allCategories, isLoading, updatePreferences } =
    usePreferences();

  const currentLocale = pathname.startsWith("/ar")
    ? "ar"
    : pathname.startsWith("/en")
      ? "en"
      : "fr";

  // Local form state
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState("08:00");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [minScoreAlert, setMinScoreAlert] = useState(5);
  const [maxArticlesDigest, setMaxArticlesDigest] = useState(10);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Reading preferences (local-only for now)
  const [fullscreenArticles, setFullscreenArticles] = useState(false);
  const [autoAudioReader, setAutoAudioReader] = useState(false);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime] = useState<Date>(new Date());

  // Sync local state when preferences load
  useEffect(() => {
    if (preferences) {
      setWhatsappNumber(preferences.whatsappNumber ?? "");
      setEmailNotifications(preferences.emailNotifications);
      setDigestEnabled(preferences.digestEnabled);
      setWeeklyDigestEnabled(preferences.weeklyDigestEnabled);
      setDigestTime(preferences.digestTime);
      setTimezone(preferences.timezone);
      setMinScoreAlert(preferences.minScoreAlert);
      setMaxArticlesDigest(preferences.maxArticlesDigest);
      setSelectedCategoryIds(
        preferences.categories.map((c) => c.category.id),
      );
    }
  }, [preferences]);

  const switchLocale = useCallback(
    (newLocale: string) => {
      const newPath = pathname.replace(/^\/(fr|en|ar)/, `/${newLocale}`);
      router.push(newPath);
    },
    [pathname, router],
  );

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const getCategoryDisplayName = (category: {
    name: string;
    nameFr: string;
    nameAr: string | null;
  }): string => {
    if (currentLocale === "fr") return category.nameFr || category.name;
    if (currentLocale === "ar") return category.nameAr || category.name;
    return category.name;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await updatePreferences({
        whatsappNumber: whatsappNumber || null,
        emailNotifications,
        digestEnabled,
        weeklyDigestEnabled,
        digestTime,
        timezone,
        minScoreAlert,
        maxArticlesDigest,
        categoryIds: selectedCategoryIds,
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save preferences",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    // Simulate sync — replace with real API call when available
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSyncing(false);
  };

  const themeOptions = [
    { value: "dark" as const, label: t("themeDark"), icon: Moon },
    { value: "light" as const, label: t("themeLight"), icon: Sun },
    { value: "system" as const, label: t("themeSystem"), icon: Monitor },
  ];

  const languageOptions = [
    { value: "fr", label: "Fran\u00e7ais" },
    { value: "en", label: "English" },
    { value: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  ] as const;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div
            className="h-8 w-48 animate-pulse rounded-lg"
            style={{ background: "var(--bg-elevated)" }}
          />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl p-6"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              className="mb-4 h-6 w-36 animate-pulse rounded"
              style={{ background: "var(--bg-elevated)" }}
            />
            <div className="space-y-3">
              <div
                className="h-10 animate-pulse rounded-lg"
                style={{ background: "var(--bg-elevated)" }}
              />
              <div
                className="h-10 animate-pulse rounded-lg"
                style={{ background: "var(--bg-elevated)" }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

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

      {/* ─── Appearance ─── */}
      <section
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Palette size={20} style={{ color: "var(--color-primary-400)" }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("appearance")}
          </h2>
        </div>
        <p
          className="text-sm mb-6 ms-8"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("appearanceDesc")}
        </p>

        {/* Theme selector with previews */}
        <div className="mb-6">
          <label
            className="mb-3 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("theme")}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const isSelected = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className="flex flex-col items-center gap-2.5 rounded-xl px-4 py-4 text-sm font-medium transition-all"
                  style={{
                    background: isSelected
                      ? "var(--color-primary-600)"
                      : "var(--bg-elevated)",
                    color: isSelected ? "white" : "var(--text-secondary)",
                    border: `2px solid ${isSelected ? "var(--color-primary-400)" : "var(--border-default)"}`,
                  }}
                >
                  <ThemePreview variant={value} />
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} />
                    {label}
                  </div>
                </button>
              );
            })}
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
      </section>

      {/* ─── Notifications ─── */}
      <section
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Bell size={20} style={{ color: "var(--color-primary-400)" }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("notifications")}
          </h2>
        </div>
        <p
          className="text-sm mb-6 ms-8"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("notificationsDesc")}
        </p>

        {/* WhatsApp number */}
        <div className="mb-5">
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            <Phone
              size={14}
              className="inline-block me-1"
              style={{ verticalAlign: "text-top" }}
            />
            {t("whatsappNumber")}
          </label>
          <input
            type="tel"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder={t("whatsappPlaceholder")}
            dir="ltr"
            className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all focus:ring-2"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
            }}
          />
        </div>

        {/* Toggle rows */}
        <div className="space-y-4">
          <ToggleSwitch
            checked={emailNotifications}
            onChange={() => setEmailNotifications((prev) => !prev)}
            label={t("emailNotifications")}
            icon={Mail}
          />
          <ToggleSwitch
            checked={digestEnabled}
            onChange={() => setDigestEnabled((prev) => !prev)}
            label={t("digestEnabled")}
            icon={MessageSquare}
          />
          <ToggleSwitch
            checked={weeklyDigestEnabled}
            onChange={() => setWeeklyDigestEnabled((prev) => !prev)}
            label={t("weeklyDigest")}
            icon={Bell}
          />
        </div>

        {/* Digest time + Timezone */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <Clock
                size={14}
                className="inline-block me-1"
                style={{ verticalAlign: "text-top" }}
              />
              {t("digestTime")}
            </label>
            <select
              value={digestTime}
              onChange={(e) => setDigestTime(e.target.value)}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
              }}
            >
              {DIGEST_TIME_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              <Globe
                size={14}
                className="inline-block me-1"
                style={{ verticalAlign: "text-top" }}
              />
              {t("timezone")}
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
              }}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─── Reading Preferences ─── */}
      <section
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={20} style={{ color: "var(--color-primary-400)" }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("readingPreferences")}
          </h2>
        </div>
        <p
          className="text-sm mb-6 ms-8"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("readingPreferencesDesc")}
        </p>

        <div className="space-y-4">
          <ToggleSwitch
            checked={fullscreenArticles}
            onChange={() => setFullscreenArticles((prev) => !prev)}
            label={t("fullscreenArticles")}
            icon={FileText}
          />
          <ToggleSwitch
            checked={autoAudioReader}
            onChange={() => setAutoAudioReader((prev) => !prev)}
            label={t("autoAudioReader")}
            icon={MessageSquare}
          />
        </div>
      </section>

      {/* ─── Content Preferences ─── */}
      <section
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <SlidersHorizontal
            size={20}
            style={{ color: "var(--color-primary-400)" }}
          />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("contentPreferences")}
          </h2>
        </div>
        <p
          className="text-sm mb-6 ms-8"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("contentPreferencesDesc")}
        </p>

        {/* Min score slider */}
        <div className="mb-5">
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("minScore")}
            <span
              className="ms-2 font-mono text-xs"
              dir="ltr"
              style={{ color: "var(--color-primary-400)" }}
            >
              {minScoreAlert.toFixed(1)}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={minScoreAlert}
            onChange={(e) => setMinScoreAlert(Number.parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--color-primary-600)" }}
          />
          <div
            className="mt-1 flex justify-between text-xs"
            dir="ltr"
            style={{ color: "var(--text-secondary)" }}
          >
            <span>0</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Max articles */}
        <div className="mb-6">
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("maxArticles")}
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={maxArticlesDigest}
            onChange={(e) => {
              const val = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(val) && val >= 1 && val <= 50) {
                setMaxArticlesDigest(val);
              }
            }}
            dir="ltr"
            className="w-32 rounded-lg px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
            }}
          />
        </div>

        {/* Categories */}
        <div>
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            <Tag
              size={14}
              className="inline-block me-1"
              style={{ verticalAlign: "text-top" }}
            />
            {t("categories")}
          </label>
          <p
            className="text-xs mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("categoriesDesc")}
          </p>

          {allCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allCategories.map((category) => {
                const isSelected = selectedCategoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all"
                    style={{
                      background: isSelected
                        ? "var(--color-primary-600)"
                        : "var(--bg-elevated)",
                      color: isSelected ? "white" : "var(--text-secondary)",
                      border: `1px solid ${isSelected ? "var(--color-primary-600)" : "var(--border-default)"}`,
                    }}
                  >
                    {isSelected && <Check size={14} />}
                    {getCategoryDisplayName(category)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p
              className="text-sm italic"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("noCategoriesAvailable")}
            </p>
          )}
        </div>
      </section>

      {/* ─── Data ─── */}
      <section
        className="rounded-xl p-6"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Database size={20} style={{ color: "var(--color-primary-400)" }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("dataSection")}
          </h2>
        </div>
        <p
          className="text-sm mb-6 ms-8"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("dataSectionDesc")}
        </p>

        {/* Last sync + Sync button */}
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div>
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("lastSync")} :{" "}
            </span>
            <span
              className="text-sm font-medium ltr-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {lastSyncTime.toLocaleDateString(currentLocale === "ar" ? "ar-SA" : currentLocale, {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? t("syncing") : t("syncNow")}
          </button>
        </div>

        {/* Stats summary */}
        <div className="flex flex-wrap gap-3">
          <div
            className="flex items-center gap-2 rounded-lg px-4 py-2.5"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <FileText size={14} style={{ color: "var(--color-primary-400)" }} />
            <span
              className="text-sm font-medium ltr-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {t("statsArticles", { count: 65 })}
            </span>
          </div>
          <div
            className="flex items-center gap-2 rounded-lg px-4 py-2.5"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Radio size={14} style={{ color: "var(--color-primary-400)" }} />
            <span
              className="text-sm font-medium ltr-nums"
              style={{ color: "var(--text-primary)" }}
            >
              {t("statsSources", { count: 13 })}
            </span>
          </div>
        </div>
      </section>

      {/* ─── Save button ─── */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--color-primary-600)",
            color: "white",
          }}
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Save size={16} />
              {t("save")}
            </>
          )}
        </button>

        {saveError && (
          <span className="text-sm" style={{ color: "var(--color-error, #ef4444)" }}>
            {saveError}
          </span>
        )}
      </div>

      {/* Save toast */}
      <SaveToast visible={showToast} message={t("settingsSavedToast")} />
    </div>
  );
}
