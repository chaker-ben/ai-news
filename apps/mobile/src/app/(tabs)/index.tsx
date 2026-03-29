import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { FileText, Bell, Radio, TrendingUp } from "@/lib/icons";
import { apiClient, type Article, type AnalyticsData } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { StatCard } from "@/components/ui/StatCard";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, articlesData] = await Promise.all([
        apiClient.getAnalytics().catch(() => null),
        apiClient.getArticles({ limit: 5, min_score: 0 }).catch(() => ({ articles: [], total: 0 })),
      ]);
      if (statsData) setStats(statsData);
      setArticles(articlesData.articles);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const sourceCount = stats ? Object.keys(stats.sourceDistribution).length : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon={<FileText size={18} color={colors.primary} />}
          label={t("home.articlesCollected")}
          value={stats ? new Intl.NumberFormat("en-US").format(stats.totalArticles) : "0"}
          color={colors.primary}
        />
        <StatCard
          icon={<Bell size={18} color={colors.success} />}
          label={t("home.notificationsSent")}
          value={stats ? String(stats.articlesToday) : "0"}
          color={colors.success}
        />
        <StatCard
          icon={<Radio size={18} color={colors.purple} />}
          label={t("home.activeSources")}
          value={String(sourceCount)}
          color={colors.purple}
        />
        <StatCard
          icon={<TrendingUp size={18} color={colors.warning} />}
          label={t("analytics.avgScore")}
          value={stats ? stats.averageScore.toFixed(1) : "0"}
          color={colors.warning}
        />
      </View>

      {/* Top Articles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("home.topArticles")}</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/articles")}>
            <Text style={styles.seeAll}>{t("articles.all")}</Text>
          </TouchableOpacity>
        </View>

        {articles.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} color={colors.textMuted} />}
            title={t("home.noArticles")}
            description={t("home.noArticlesDesc")}
          />
        ) : (
          articles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleRow}
              onPress={() => router.push(`/article/${article.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.articleMeta}>
                <SourceBadge type={article.source_type} />
                <ScoreBadge score={article.score} />
              </View>
              <Text style={styles.articleTitle} numberOfLines={2}>
                {article.title}
              </Text>
              {article.summary ? (
                <Text style={styles.articleSummary} numberOfLines={2}>
                  {article.summary}
                </Text>
              ) : null}
              {article.published_at ? (
                <Text style={[styles.articleDate, { writingDirection: "ltr" }]}>
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(article.published_at))}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </View>
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "600",
  },
  seeAll: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  articleRow: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  articleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  articleTitle: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: "600",
    lineHeight: 20,
  },
  articleSummary: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  articleDate: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
