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
  Palette,
  Globe,
  Bell,
  Sliders,
  Layers,
  User,
  ExternalLink,
  Check,
  Mail,
  MessageCircle,
  Clock,
  PenLine,
  Star,
} from "@/lib/icons";
import { apiClient, type UserPreferences, type Category } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { SectionCard, SettingsRow, Separator } from "@/components/ui/SectionCard";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { useLanguage } from "@/contexts/LanguageContext";
import Constants from "expo-constants";

const DIGEST_TIMES = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6;
  return { label: `${String(hour).padStart(2, "0")}:00`, value: `${String(hour).padStart(2, "0")}:00` };
});

const TIMEZONES = [
  "UTC", "Europe/Paris", "Europe/London", "America/New_York",
  "America/Los_Angeles", "America/Chicago", "Asia/Tokyo",
  "Asia/Shanghai", "Asia/Dubai", "Asia/Riyadh", "Asia/Kolkata",
  "Australia/Sydney", "Africa/Cairo", "Africa/Casablanca",
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language, setLanguage, languages } = useLanguage();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDigestPicker, setShowDigestPicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [digestTime, setDigestTime] = useState("08:00");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [minScore, setMinScore] = useState(5);
  const [maxArticles, setMaxArticles] = useState(10);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [prefsRes, catsRes] = await Promise.all([
          apiClient.getPreferences().catch(() => null),
          apiClient.getCategories().catch(() => ({ data: [] })),
        ]);
        if (prefsRes?.data) {
          const p = prefsRes.data;
          setPrefs(p);
          setWhatsappNumber(p.whatsappNumber || "");
          setEmailNotifications(p.emailNotifications);
          setDigestEnabled(p.digestEnabled);
          setWeeklyDigest(p.weeklyDigestEnabled);
          setDigestTime(p.digestTime);
          setTimezone(p.timezone);
          setMinScore(p.minScoreAlert);
          setMaxArticles(p.maxArticlesDigest);
          setSelectedCategoryIds(p.selectedCategoryIds || []);
        }
        setCategories(catsRes.data);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await apiClient.updatePreferences({
        whatsappNumber: whatsappNumber || null,
        emailNotifications,
        digestEnabled,
        weeklyDigestEnabled: weeklyDigest,
        digestTime,
        timezone,
        minScoreAlert: minScore,
        maxArticlesDigest: maxArticles,
        selectedCategoryIds,
        language,
      });
      Alert.alert(t("settings.saved"));
    } catch (error) {
      console.error("Failed to save:", error);
      Alert.alert(t("common.error"));
    } finally {
      setSaving(false);
    }
  }, [
    whatsappNumber, emailNotifications, digestEnabled, weeklyDigest,
    digestTime, timezone, minScore, maxArticles, selectedCategoryIds, language, t,
  ]);

  const toggleCategory = useCallback((id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }, []);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <User size={28} color={colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>AI News</Text>
          <Text style={styles.profileEmail}>
            {prefs ? prefs.language.toUpperCase() : "FR"}
          </Text>
        </View>
      </View>

      {/* Appearance */}
      <SectionCard title={t("settings.appearance")} icon={<Palette size={18} color={colors.primary} />}>
        <SettingsRow
          icon={<Globe size={16} color={colors.textSecondary} />}
          label={t("settings.language")}
        />
        <View style={styles.langRow}>
          {(Object.keys(languages) as Array<keyof typeof languages>).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langButton, language === lang && styles.langButtonActive]}
              onPress={() => setLanguage(lang)}
            >
              <Text
                style={[
                  styles.langButtonText,
                  language === lang && styles.langButtonTextActive,
                ]}
              >
                {languages[lang].nativeLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title={t("settings.notifications")} icon={<Bell size={18} color={colors.success} />}>
        <SettingsRow
          icon={<MessageCircle size={16} color={colors.textSecondary} />}
          label={t("settings.whatsappNumber")}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={whatsappNumber}
            onChangeText={setWhatsappNumber}
            placeholder={t("settings.whatsappPlaceholder")}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>
        <Separator />
        <SettingsRow
          icon={<Mail size={16} color={colors.textSecondary} />}
          label={t("settings.emailNotifications")}
          right={<ToggleSwitch value={emailNotifications} onValueChange={setEmailNotifications} />}
        />
        <Separator />
        <SettingsRow
          icon={<Bell size={16} color={colors.textSecondary} />}
          label={t("settings.digestEnabled")}
          right={<ToggleSwitch value={digestEnabled} onValueChange={setDigestEnabled} />}
        />
        <Separator />
        <SettingsRow
          icon={<Bell size={16} color={colors.textSecondary} />}
          label={t("settings.weeklyDigest")}
          right={<ToggleSwitch value={weeklyDigest} onValueChange={setWeeklyDigest} />}
        />
        <Separator />
        <TouchableOpacity onPress={() => setShowDigestPicker(!showDigestPicker)}>
          <SettingsRow
            icon={<Clock size={16} color={colors.textSecondary} />}
            label={t("settings.digestTime")}
            value={digestTime}
          />
        </TouchableOpacity>
        {showDigestPicker ? (
          <View style={styles.pickerGrid}>
            {DIGEST_TIMES.map((dt) => (
              <TouchableOpacity
                key={dt.value}
                style={[styles.pickerItem, digestTime === dt.value && styles.pickerItemActive]}
                onPress={() => {
                  setDigestTime(dt.value);
                  setShowDigestPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    digestTime === dt.value && styles.pickerItemTextActive,
                    { writingDirection: "ltr" },
                  ]}
                >
                  {dt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <Separator />
        <TouchableOpacity onPress={() => setShowTimezonePicker(!showTimezonePicker)}>
          <SettingsRow
            icon={<Globe size={16} color={colors.textSecondary} />}
            label={t("settings.timezone")}
            value={timezone}
          />
        </TouchableOpacity>
        {showTimezonePicker ? (
          <View style={styles.pickerList}>
            {TIMEZONES.map((tz) => (
              <TouchableOpacity
                key={tz}
                style={[styles.pickerListItem, timezone === tz && styles.pickerItemActive]}
                onPress={() => {
                  setTimezone(tz);
                  setShowTimezonePicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, timezone === tz && styles.pickerItemTextActive]}>
                  {tz}
                </Text>
                {timezone === tz ? <Check size={16} color={colors.primary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </SectionCard>

      {/* Content Preferences */}
      <SectionCard title={t("settings.contentPrefs")} icon={<Sliders size={18} color={colors.warning} />}>
        <SettingsRow
          icon={<Star size={16} color={colors.textSecondary} />}
          label={t("settings.minScore")}
          value={minScore.toFixed(1)}
        />
        <View style={styles.sliderRow}>
          {[0, 2, 4, 5, 6, 7, 8].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.sliderDot, minScore === val && styles.sliderDotActive]}
              onPress={() => setMinScore(val)}
            >
              <Text
                style={[
                  styles.sliderDotText,
                  minScore === val && styles.sliderDotTextActive,
                  { writingDirection: "ltr" },
                ]}
              >
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Separator />
        <SettingsRow
          icon={<Layers size={16} color={colors.textSecondary} />}
          label={t("settings.maxArticles")}
          value={String(maxArticles)}
        />
        <View style={styles.sliderRow}>
          {[5, 10, 15, 20, 30, 50].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.sliderDot, maxArticles === val && styles.sliderDotActive]}
              onPress={() => setMaxArticles(val)}
            >
              <Text
                style={[
                  styles.sliderDotText,
                  maxArticles === val && styles.sliderDotTextActive,
                  { writingDirection: "ltr" },
                ]}
              >
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SectionCard>

      {/* Categories */}
      {categories.length > 0 ? (
        <SectionCard title={t("settings.categories")} icon={<Layers size={18} color={colors.purple} />}>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => {
              const selected = selectedCategoryIds.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, selected && styles.categoryChipActive]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  {selected ? <Check size={14} color={colors.primary} /> : null}
                  <Text
                    style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}
                  >
                    {language === "ar" && cat.nameAr ? cat.nameAr : cat.nameFr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>
      ) : null}

      {/* Navigation Links */}
      <SectionCard>
        <TouchableOpacity onPress={() => router.push("/my-articles")}>
          <SettingsRow
            icon={<PenLine size={16} color={colors.textSecondary} />}
            label={t("publish.myArticles")}
          />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity onPress={() => router.push("/alerts")}>
          <SettingsRow
            icon={<Bell size={16} color={colors.textSecondary} />}
            label={t("alerts.title")}
          />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity onPress={() => router.push("/sources")}>
          <SettingsRow
            icon={<Layers size={16} color={colors.textSecondary} />}
            label={t("sources.title")}
          />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity onPress={() => router.push("/team")}>
          <SettingsRow
            icon={<User size={16} color={colors.textSecondary} />}
            label={t("team.title")}
          />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity onPress={() => router.push("/pricing")}>
          <SettingsRow
            icon={<Star size={16} color={colors.textSecondary} />}
            label={t("pricing.title")}
          />
        </TouchableOpacity>
        <Separator />
        <TouchableOpacity onPress={() => router.push("/notifications-config")}>
          <SettingsRow
            icon={<Bell size={16} color={colors.textSecondary} />}
            label={t("notifications.title")}
          />
        </TouchableOpacity>
      </SectionCard>

      {/* About */}
      <SectionCard title={t("settings.about")} icon={<ExternalLink size={18} color={colors.textMuted} />}>
        <SettingsRow label={t("common.version")} value={`v${appVersion}`} />
      </SectionCard>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>{t("common.save")}</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  profileCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: { color: colors.text, fontSize: fontSize.xl, fontWeight: "600" },
  profileEmail: { color: colors.textMuted, fontSize: fontSize.md, marginTop: 2 },
  langRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  langButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  langButtonActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  langButtonText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: "500" },
  langButtonTextActive: { color: colors.primary },
  inputRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  pickerItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerItemActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  pickerItemText: { color: colors.textSecondary, fontSize: fontSize.sm },
  pickerItemTextActive: { color: colors.primary },
  pickerList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  pickerListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sliderRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    justifyContent: "space-around",
  },
  sliderDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderDotActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  sliderDotText: { color: colors.textMuted, fontSize: fontSize.sm },
  sliderDotTextActive: { color: colors.primary, fontWeight: "600" },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  categoryChipText: { color: colors.textSecondary, fontSize: fontSize.sm },
  categoryChipTextActive: { color: colors.primary },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: fontSize.xl, fontWeight: "600" },
});
