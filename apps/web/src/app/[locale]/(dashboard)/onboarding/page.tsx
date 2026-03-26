"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Phone,
  Mail,
  Clock,
  Globe,
  Tag,
  Sparkles,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";

const DIGEST_TIME_OPTIONS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

const TIMEZONE_OPTIONS = [
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isRTL = locale === "ar";

  const { allCategories, isLoading, updatePreferences } = usePreferences();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Categories
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Step 2: Notifications
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [digestTime, setDigestTime] = useState("08:00");
  const [timezone, setTimezone] = useState("Europe/Paris");

  // Step 3: Saving
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentLocale = pathname.startsWith("/ar")
    ? "ar"
    : pathname.startsWith("/en")
      ? "en"
      : "fr";

  const getCategoryDisplayName = (category: {
    name: string;
    nameFr: string;
    nameAr: string | null;
  }): string => {
    if (currentLocale === "fr") return category.nameFr || category.name;
    if (currentLocale === "ar") return category.nameAr || category.name;
    return category.name;
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAll = () => {
    setSelectedCategoryIds(allCategories.map((c) => c.id));
  };

  const clearAll = () => {
    setSelectedCategoryIds([]);
  };

  const goNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await updatePreferences({
        categoryIds: selectedCategoryIds,
        whatsappNumber: whatsappNumber || null,
        telegramChatId: telegramChatId || null,
        emailNotifications,
        digestTime,
        timezone,
        digestEnabled: true,
      });

      const dashboardPath = pathname.replace(/\/onboarding$/, "");
      router.push(dashboardPath || `/${currentLocale}`);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save preferences"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedCategoryIds,
    whatsappNumber,
    telegramChatId,
    emailNotifications,
    digestTime,
    timezone,
    updatePreferences,
    router,
    pathname,
    currentLocale,
  ]);

  // Determine configured notification channels for the summary
  const getConfiguredChannels = (): string[] => {
    const channels: string[] = [];
    if (emailNotifications) channels.push("Email");
    if (whatsappNumber) channels.push("WhatsApp");
    if (telegramChatId) channels.push("Telegram");
    return channels;
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: "var(--color-primary-400)" }}
          />
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex min-h-[70vh] max-w-[600px] flex-col items-center px-4 py-8"
    >
      {/* Progress bar */}
      <div className="mb-8 w-full">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--bg-elevated)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              background: "var(--color-primary-600)",
              width: `${(currentStep / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>

        {/* Step indicator dots */}
        <div className="mt-4 flex items-center justify-center gap-3">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className="flex items-center gap-3"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300"
                style={{
                  background:
                    step <= currentStep
                      ? "var(--color-primary-600)"
                      : "var(--bg-elevated)",
                  color:
                    step <= currentStep
                      ? "white"
                      : "var(--text-muted)",
                  border: `2px solid ${
                    step <= currentStep
                      ? "var(--color-primary-600)"
                      : "var(--border-default)"
                  }`,
                }}
              >
                {step < currentStep ? (
                  <Check size={14} />
                ) : (
                  step
                )}
              </div>
              {step < TOTAL_STEPS && (
                <div
                  className="h-0.5 w-8"
                  style={{
                    background:
                      step < currentStep
                        ? "var(--color-primary-600)"
                        : "var(--border-default)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full rounded-2xl p-6 sm:p-8"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Step 1: Choose Categories */}
        {currentStep === 1 && (
          <div>
            <div className="mb-6 text-center">
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "var(--color-primary-600)" }}
              >
                <Tag size={24} className="text-white" />
              </div>
              <h1
                className="text-xl font-bold sm:text-2xl"
                style={{ color: "var(--text-primary)" }}
              >
                {t("step1Title")}
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("step1Subtitle")}
              </p>
            </div>

            {/* Select All / Clear All */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={selectAll}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--color-primary-400)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {t("selectAll")}
              </button>
              <button
                onClick={clearAll}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {t("clearAll")}
              </button>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allCategories.map((category) => {
                const isSelected = selectedCategoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className="flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-sm font-medium transition-all"
                    style={{
                      background: isSelected
                        ? "var(--color-primary-600)"
                        : "var(--bg-elevated)",
                      color: isSelected ? "white" : "var(--text-secondary)",
                      border: `2px solid ${
                        isSelected
                          ? "var(--color-primary-600)"
                          : "var(--border-default)"
                      }`,
                    }}
                  >
                    {category.icon && (
                      <span className="text-lg">{category.icon}</span>
                    )}
                    <span className="text-center leading-tight">
                      {getCategoryDisplayName(category)}
                    </span>
                    {isSelected && (
                      <Check size={16} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={goNext}
                disabled={selectedCategoryIds.length === 0}
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--color-primary-600)",
                  color: "white",
                }}
              >
                {t("next")}
                {isRTL ? (
                  <ArrowLeft size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Notification Setup */}
        {currentStep === 2 && (
          <div>
            <div className="mb-6 text-center">
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "var(--color-primary-600)" }}
              >
                <Mail size={24} className="text-white" />
              </div>
              <h1
                className="text-xl font-bold sm:text-2xl"
                style={{ color: "var(--text-primary)" }}
              >
                {t("step2Title")}
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("step2Subtitle")}
              </p>
            </div>

            <div className="space-y-5">
              {/* WhatsApp number */}
              <div>
                <label
                  className="mb-2 flex items-center gap-2 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Phone size={14} />
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

              {/* Email toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail
                    size={16}
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("emailNotifications")}
                  </span>
                </div>
                <button
                  onClick={() => setEmailNotifications((prev) => !prev)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors"
                  style={{
                    background: emailNotifications
                      ? "var(--color-primary-600)"
                      : "var(--bg-elevated)",
                    border: `1px solid ${
                      emailNotifications
                        ? "var(--color-primary-600)"
                        : "var(--border-default)"
                    }`,
                  }}
                  role="switch"
                  aria-checked={emailNotifications}
                  aria-label={t("emailNotifications")}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 rounded-full shadow-sm transition-transform"
                    style={{
                      background: "white",
                      transform: emailNotifications
                        ? "translateX(1.25rem)"
                        : "translateX(0)",
                    }}
                  />
                </button>
              </div>

              {/* Telegram chat ID */}
              <div>
                <label
                  className="mb-2 flex items-center gap-2 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <MessageSquare size={14} />
                  {t("telegramChatId")}
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder={t("telegramPlaceholder")}
                  dir="ltr"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-default)",
                  }}
                />
              </div>

              {/* Digest time + Timezone */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Clock size={14} />
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
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Globe size={14} />
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
            </div>

            {/* Navigation buttons */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {isRTL ? (
                  <ArrowRight size={16} />
                ) : (
                  <ArrowLeft size={16} />
                )}
                {t("back")}
              </button>
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all"
                style={{
                  background: "var(--color-primary-600)",
                  color: "white",
                }}
              >
                {t("next")}
                {isRTL ? (
                  <ArrowLeft size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <div>
            <div className="mb-6 text-center">
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "var(--color-primary-600)" }}
              >
                <Sparkles size={24} className="text-white" />
              </div>
              <h1
                className="text-xl font-bold sm:text-2xl"
                style={{ color: "var(--text-primary)" }}
              >
                {t("step3Title")}
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("step3Subtitle")}
              </p>
            </div>

            <div className="space-y-5">
              {/* Selected categories */}
              <div>
                <h3
                  className="mb-3 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Tag size={14} style={{ color: "var(--color-primary-400)" }} />
                  {t("selectedCategories")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCategoryIds.map((id) => {
                    const category = allCategories.find((c) => c.id === id);
                    if (!category) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                        style={{
                          background: "var(--color-primary-600)",
                          color: "white",
                        }}
                      >
                        {category.icon && (
                          <span>{category.icon}</span>
                        )}
                        {getCategoryDisplayName(category)}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Notification channels */}
              <div>
                <h3
                  className="mb-3 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Mail size={14} style={{ color: "var(--color-primary-400)" }} />
                  {t("notificationChannels")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {getConfiguredChannels().map((channel) => (
                    <span
                      key={channel}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{
                        background: "var(--bg-elevated)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <Check
                        size={12}
                        style={{ color: "var(--color-primary-400)" }}
                      />
                      {channel}
                    </span>
                  ))}
                  {getConfiguredChannels().length === 0 && (
                    <span
                      className="text-xs italic"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t("noChannelsConfigured")}
                    </span>
                  )}
                </div>
              </div>

              {/* Digest schedule */}
              <div>
                <h3
                  className="mb-3 flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Clock size={14} style={{ color: "var(--color-primary-400)" }} />
                  {t("digestSchedule")}
                </h3>
                <div
                  className="flex items-center gap-3 rounded-lg px-4 py-3"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <span
                    dir="ltr"
                    className="text-sm font-mono font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {digestTime}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    &mdash;
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {timezone.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Error message */}
            {saveError && (
              <div
                className="mt-4 rounded-lg px-4 py-3 text-sm"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "var(--color-error, #ef4444)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                {saveError}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={goBack}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {isRTL ? (
                  <ArrowRight size={16} />
                ) : (
                  <ArrowLeft size={16} />
                )}
                {t("back")}
              </button>
              <button
                onClick={handleFinish}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Check size={16} />
                    {t("finish")}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
