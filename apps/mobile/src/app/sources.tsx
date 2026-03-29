import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Radio, CheckCircle, XCircle } from "@/lib/icons";
import { apiClient, type Source } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { SOURCE_COLORS } from "@/components/ui/SourceBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SourcesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      const res = await apiClient.getSources();
      setSources(res.data);
    } catch (error) {
      console.error("Failed to fetch sources:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

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
        <Text style={styles.headerTitle}>{t("sources.title")}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchSources(); }}
            tintColor={colors.primary}
          />
        }
      >
        {sources.length === 0 ? (
          <EmptyState
            icon={<Radio size={48} color={colors.textMuted} />}
            title={t("sources.empty")}
            description={t("sources.emptyDesc")}
          />
        ) : (
          <View style={styles.grid}>
            {sources.map((source) => {
              const typeColor = SOURCE_COLORS[source.type] || colors.textMuted;
              return (
                <View key={source.id} style={styles.sourceCard}>
                  <View style={[styles.typeIcon, { backgroundColor: `${typeColor}20` }]}>
                    <Text style={[styles.typeText, { color: typeColor }]}>
                      {source.type.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.sourceName} numberOfLines={1}>
                    {source.name}
                  </Text>
                  <Text style={styles.sourceType}>{source.type}</Text>
                  <View style={styles.statusRow}>
                    {source.active ? (
                      <CheckCircle size={14} color={colors.success} />
                    ) : (
                      <XCircle size={14} color={colors.error} />
                    )}
                    <Text
                      style={[
                        styles.statusText,
                        { color: source.active ? colors.success : colors.error },
                      ]}
                    >
                      {source.active ? t("sources.active") : t("sources.inactive")}
                    </Text>
                  </View>
                  <Text style={styles.lastCollected}>
                    {source.lastCollected
                      ? `${t("sources.lastCollected")}: ${new Intl.DateTimeFormat("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(source.lastCollected))}`
                      : t("sources.never")}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: { padding: spacing.sm, borderRadius: radius.md, width: 38 },
  headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "600" },
  content: { padding: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  sourceCard: {
    width: "47%",
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  typeText: { fontSize: fontSize.sm, fontWeight: "700" },
  sourceName: { color: colors.text, fontSize: fontSize.base, fontWeight: "600" },
  sourceType: { color: colors.textMuted, fontSize: fontSize.sm },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  statusText: { fontSize: fontSize.xs, fontWeight: "500" },
  lastCollected: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs },
});
