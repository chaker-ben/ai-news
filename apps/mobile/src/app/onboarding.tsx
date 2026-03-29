import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
  Bell,
  Mail,
  MessageCircle,
  Send,
  Clock,
  Globe,
} from "@/lib/icons";
import { apiClient, type Category } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { KeywordPill } from "@/components/ui/KeywordPill";

const DIGEST_TIMES = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6;
  return `${String(hour).padStart(2, "0")}:00`;
});

const TIMEZONES = [
  "UTC", "Europe/Paris", "Europe/London", "America/New_York",
  "Asia/Riyadh", "Asia/Dubai", "Asia/Tokyo",
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [digestTime, setDigestTime] = useState("08:00");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.getCategories();
        setCategories(res.data);
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      await apiClient.updatePreferences({
        selectedCategoryIds,
        whatsappNumber: whatsappNumber || null,
        emailNotifications,
        telegramChatId: telegramChatId || null,
        digestTime,
        timezone,
      });
      router.replace("/(tabs)/");
    } catch (error) {
      console.error("Save onboarding error:", error);
      Alert.alert(t("common.error"));
    } finally {
      setSaving(false);
    }
  }, [selectedCategoryIds, whatsappNumber, emailNotifications, telegramChatId, digestTime, timezone, router, t]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.headerBtn}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <Text style={styles.headerTitle}>{t("onboarding.title")}</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
      </View>
      <View style={styles.steps}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              s <= step && styles.stepDotActive,
              s < step && styles.stepDotCompleted,
            ]}
          >
            {s < step ? (
              <Check size={12} color="#fff" />
            ) : (
              <Text style={[styles.stepNumber, s <= step && { color: "#fff" }]}>
                {s}
              </Text>
            )}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Step 1: Categories */}
        {step === 1 ? (
          <View>
            <Text style={styles.stepTitle}>{t("onboarding.step1Title")}</Text>
            <Text style={styles.stepDesc}>{t("onboarding.step1Desc")}</Text>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => setSelectedCategoryIds(categories.map((c) => c.id))}
              >
                <Text style={styles.quickBtnText}>{t("common.selectAll")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => setSelectedCategoryIds([])}
              >
                <Text style={styles.quickBtnText}>{t("common.clearAll")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const selected = selectedCategoryIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryCard, selected && styles.categoryCardActive]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    {selected ? <Check size={16} color={colors.primary} /> : null}
                    <Text style={[styles.categoryName, selected && { color: colors.primary }]}>
                      {cat.nameFr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Step 2: Notifications */}
        {step === 2 ? (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("onboarding.step2Title")}</Text>
            <Text style={styles.stepDesc}>{t("onboarding.step2Desc")}</Text>

            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <MessageCircle size={16} color={colors.textSecondary} />
                <Text style={styles.fieldLabelText}>{t("settings.whatsappNumber")}</Text>
              </View>
              <TextInput
                style={styles.input}
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                placeholder={t("settings.whatsappPlaceholder")}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <Mail size={16} color={colors.textSecondary} />
                <Text style={styles.fieldLabelText}>{t("settings.emailNotifications")}</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleChip, emailNotifications && styles.toggleChipActive]}
                onPress={() => setEmailNotifications(!emailNotifications)}
              >
                <Text style={[styles.toggleChipText, emailNotifications && { color: colors.primary }]}>
                  {emailNotifications ? t("alerts.active") : t("alerts.inactive")}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <Send size={16} color={colors.textSecondary} />
                <Text style={styles.fieldLabelText}>Telegram Chat ID</Text>
              </View>
              <TextInput
                style={styles.input}
                value={telegramChatId}
                onChangeText={setTelegramChatId}
                placeholder="123456789"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <Clock size={16} color={colors.textSecondary} />
                <Text style={styles.fieldLabelText}>{t("settings.digestTime")}</Text>
              </View>
              <View style={styles.timeGrid}>
                {DIGEST_TIMES.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeChip, digestTime === time && styles.timeChipActive]}
                    onPress={() => setDigestTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        digestTime === time && { color: colors.primary },
                        { writingDirection: "ltr" },
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <Globe size={16} color={colors.textSecondary} />
                <Text style={styles.fieldLabelText}>{t("settings.timezone")}</Text>
              </View>
              <View style={styles.timeGrid}>
                {TIMEZONES.map((tz) => (
                  <TouchableOpacity
                    key={tz}
                    style={[styles.timeChip, timezone === tz && styles.timeChipActive]}
                    onPress={() => setTimezone(tz)}
                  >
                    <Text style={[styles.timeChipText, timezone === tz && { color: colors.primary }]}>
                      {tz.split("/").pop()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {/* Step 3: Summary */}
        {step === 3 ? (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("onboarding.step3Title")}</Text>
            <Text style={styles.stepDesc}>{t("onboarding.step3Desc")}</Text>

            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>{t("onboarding.selectedCategories")}</Text>
              <View style={styles.summaryTags}>
                {selectedCategoryIds.map((id) => {
                  const cat = categories.find((c) => c.id === id);
                  return cat ? (
                    <KeywordPill key={id} keyword={cat.nameFr} color={colors.primary} />
                  ) : null;
                })}
                {selectedCategoryIds.length === 0 ? (
                  <Text style={styles.summaryEmpty}>-</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>{t("onboarding.notificationChannels")}</Text>
              <View style={styles.summaryTags}>
                {whatsappNumber ? <KeywordPill keyword="WhatsApp" color={colors.success} /> : null}
                {emailNotifications ? <KeywordPill keyword="Email" color={colors.primary} /> : null}
                {telegramChatId ? <KeywordPill keyword="Telegram" color={colors.info} /> : null}
              </View>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>{t("onboarding.digestSchedule")}</Text>
              <Text style={[styles.summaryValue, { writingDirection: "ltr" }]}>
                {digestTime} · {timezone}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.footer}>
        {step < 3 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(step + 1)}>
            <Text style={styles.nextBtnText}>{t("common.next")}</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, saving && { opacity: 0.6 }]}
            onPress={handleFinish}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>{t("onboarding.letsGo")}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  headerBtn: { padding: spacing.sm, borderRadius: radius.md, width: 38 },
  headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "600" },
  progress: {
    height: 4, backgroundColor: colors.surfaceLight, marginHorizontal: spacing.lg,
  },
  progressBar: { height: "100%", backgroundColor: colors.primary, borderRadius: 2 },
  steps: {
    flexDirection: "row", justifyContent: "center", gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  stepDotActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  stepDotCompleted: { backgroundColor: colors.success, borderColor: colors.success },
  stepNumber: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600" },
  content: { padding: spacing.lg, paddingBottom: 100 },
  stepContent: { gap: spacing.lg },
  stepTitle: { color: colors.text, fontSize: fontSize.heading, fontWeight: "700" },
  stepDesc: { color: colors.textMuted, fontSize: fontSize.base, lineHeight: 22, marginBottom: spacing.md },
  quickActions: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  quickBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  quickBtnText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "500" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  categoryCard: {
    width: "47%", backgroundColor: colors.surfaceLight, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
  },
  categoryCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  categoryName: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: "500", flex: 1 },
  field: { gap: spacing.sm },
  fieldLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  fieldLabelText: { color: colors.textSecondary, fontSize: fontSize.base },
  input: {
    backgroundColor: colors.surfaceLight, borderRadius: radius.md, padding: spacing.md,
    color: colors.text, fontSize: fontSize.base, borderWidth: 1, borderColor: colors.border,
  },
  toggleChip: {
    alignSelf: "flex-start", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  toggleChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  toggleChipText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: "500" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  timeChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  timeChipText: { color: colors.textMuted, fontSize: fontSize.sm },
  summarySection: {
    backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm },
  summaryTags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  summaryEmpty: { color: colors.textMuted, fontSize: fontSize.md },
  summaryValue: { color: colors.text, fontSize: fontSize.lg, fontWeight: "500" },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: spacing.lg, paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  nextBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
  },
  nextBtnText: { color: "#fff", fontSize: fontSize.xl, fontWeight: "600" },
});
