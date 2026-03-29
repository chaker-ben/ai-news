import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bell, MessageCircle, Clock, Star, Layers, Lock, Info } from "@/lib/icons";
import { apiClient, type UserPreferences } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { SectionCard, SettingsRow, Separator } from "@/components/ui/SectionCard";

export default function NotificationsConfigScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.getPreferences();
        setPrefs(res.data);
      } catch (error) {
        console.error("Failed to load prefs:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notifications.title")}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Banner */}
        <View style={styles.banner}>
          <Info size={18} color={colors.primary} />
          <Text style={styles.bannerText}>{t("notifications.configDesc")}</Text>
        </View>

        {/* WhatsApp Config */}
        <SectionCard
          title={t("notifications.whatsappConfig")}
          icon={<MessageCircle size={18} color={colors.success} />}
        >
          <SettingsRow
            icon={<MessageCircle size={16} color={colors.textSecondary} />}
            label="WhatsApp"
            value={prefs?.whatsappNumber || "-"}
            right={<Lock size={14} color={colors.textMuted} />}
          />
          <Separator />
          <SettingsRow
            icon={<Clock size={16} color={colors.textSecondary} />}
            label={t("notifications.digestTime")}
            value={prefs?.digestTime || "08:00"}
            right={<Lock size={14} color={colors.textMuted} />}
          />
          <Separator />
          <SettingsRow
            icon={<Star size={16} color={colors.textSecondary} />}
            label={t("notifications.minScore")}
            value={prefs ? String(prefs.minScoreAlert) : "-"}
            right={<Lock size={14} color={colors.textMuted} />}
          />
          <Separator />
          <SettingsRow
            icon={<Layers size={16} color={colors.textSecondary} />}
            label={t("notifications.maxArticles")}
            value={prefs ? String(prefs.maxArticlesDigest) : "-"}
            right={<Lock size={14} color={colors.textMuted} />}
          />
        </SectionCard>

        <View style={styles.readOnlyBadge}>
          <Lock size={12} color={colors.textMuted} />
          <Text style={styles.readOnlyText}>{t("notifications.readOnly")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: { padding: spacing.sm, borderRadius: radius.md, width: 38 },
  headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "600" },
  content: { padding: spacing.lg },
  banner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: `${colors.primary}15`, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: `${colors.primary}30`,
  },
  bannerText: { color: colors.textSecondary, fontSize: fontSize.md, flex: 1, lineHeight: 20 },
  readOnlyBadge: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    justifyContent: "center", paddingTop: spacing.lg,
  },
  readOnlyText: { color: colors.textMuted, fontSize: fontSize.sm },
});
