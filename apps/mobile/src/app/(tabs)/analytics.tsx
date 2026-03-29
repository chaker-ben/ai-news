import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "@/lib/icons";
import { apiClient, type AnalyticsData } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { StatCard } from "@/components/ui/StatCard";
import { SOURCE_COLORS } from "@/components/ui/SourceBadge";
import { EmptyState } from "@/components/ui/EmptyState";

function SourceBar({
  source,
  count,
  maxCount,
}: {
  source: string;
  count: number;
  maxCount: number;
}) {
  const color = SOURCE_COLORS[source] || colors.textMuted;
  const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <View style={styles.sourceRow}>
      <View style={styles.sourceLabel}>
        <View style={[styles.sourceDot, { backgroundColor: color }]} />
        <Text style={styles.sourceName}>{source}</Text>
      </View>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            { backgroundColor: color, width: `${Math.max(widthPercent, 4)}%` },
          ]}
        />
      </View>
      <Text style={[styles.sourceCount, { writingDirection: "ltr" }]}>
        {new Intl.NumberFormat("en-US").format(count)}
      </Text>
    </View>
  );
}

function ScoreBucket({
  label,
  count,
  maxCount,
}: {
  label: string;
  count: number;
  maxCount: number;
}) {
  const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <View style={styles.sourceRow}>
      <Text style={[styles.bucketLabel, { writingDirection: "ltr" }]}>{label}</Text>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            { backgroundColor: colors.primary, width: `${Math.max(widthPercent, 4)}%` },
          ]}
        />
      </View>
      <Text style={[styles.sourceCount, { writingDirection: "ltr" }]}>{count}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const result = await apiClient.getAnalytics();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centerContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <EmptyState
          icon={<BarChart3 size={48} color={colors.textMuted} />}
          title={t("analytics.unavailable")}
          description={t("common.pullToRefresh")}
        />
      </ScrollView>
    );
  }

  const sourceEntries = Object.entries(data.sourceDistribution);
  const maxSourceCount = Math.max(...sourceEntries.map(([, c]) => c), 1);
  const maxBucketCount = data.scoreBuckets
    ? Math.max(...data.scoreBuckets.map((b) => b.count), 1)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label={t("analytics.totalArticles")}
          value={new Intl.NumberFormat("en-US").format(data.totalArticles)}
          color={colors.primary}
        />
        <StatCard
          label={t("analytics.avgScore")}
          value={data.averageScore.toFixed(1)}
          color={colors.warning}
        />
        <StatCard
          label={t("analytics.today")}
          value={String(data.articlesToday)}
          color={colors.success}
        />
        <StatCard
          label={t("analytics.sources")}
          value={String(sourceEntries.length)}
          color={colors.purple}
        />
      </View>

      {/* Daily Activity */}
      {data.dailyActivity && data.dailyActivity.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("analytics.dailyActivity")}</Text>
          <View style={styles.chartCard}>
            <View style={styles.dailyChart}>
              {data.dailyActivity.map((day) => {
                const maxDay = Math.max(...data.dailyActivity!.map((d) => d.count), 1);
                const heightPercent = (day.count / maxDay) * 100;
                return (
                  <View key={day.date} style={styles.dailyBarCol}>
                    <View style={styles.dailyBarTrack}>
                      <View
                        style={[
                          styles.dailyBar,
                          { height: `${Math.max(heightPercent, 4)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.dailyLabel}>
                      {new Date(day.date).getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}

      {/* Source Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("analytics.sourceDistribution")}</Text>
        <View style={styles.chartCard}>
          {sourceEntries
            .sort(([, a], [, b]) => b - a)
            .map(([source, count]) => (
              <SourceBar key={source} source={source} count={count} maxCount={maxSourceCount} />
            ))}
        </View>
      </View>

      {/* Score Distribution */}
      {data.scoreBuckets && data.scoreBuckets.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("analytics.scoreDistribution")}</Text>
          <View style={styles.chartCard}>
            {data.scoreBuckets.map((bucket) => (
              <ScoreBucket
                key={bucket.label}
                label={bucket.label}
                count={bucket.count}
                maxCount={maxBucketCount}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Top Sources */}
      {data.topSources.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("analytics.topSources")}</Text>
          {data.topSources.slice(0, 5).map((item, index) => (
            <View key={item.source} style={styles.topSourceRow}>
              <Text style={[styles.topSourceRank, { writingDirection: "ltr" }]}>{index + 1}</Text>
              <Text style={styles.topSourceName}>{item.source}</Text>
              <Text style={[styles.topSourceCount, { writingDirection: "ltr" }]}>
                {new Intl.NumberFormat("en-US").format(item.count)}
              </Text>
              {item.avgScore ? (
                <Text style={[styles.topSourceScore, { writingDirection: "ltr" }]}>
                  {item.avgScore.toFixed(1)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  centerContent: { flexGrow: 1 },
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
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  chartCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sourceLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    width: 80,
  },
  sourceDot: { width: 8, height: 8, borderRadius: 4 },
  sourceName: { color: colors.textSecondary, fontSize: fontSize.md },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: { height: "100%", borderRadius: 4 },
  sourceCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    width: 40,
    textAlign: "right",
  },
  bucketLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    width: 50,
  },
  dailyChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 2,
  },
  dailyBarCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  dailyBarTrack: {
    flex: 1,
    width: "80%",
    justifyContent: "flex-end",
  },
  dailyBar: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
    minHeight: 2,
  },
  dailyLabel: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 4,
  },
  topSourceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topSourceRank: {
    color: colors.primaryLight,
    fontSize: fontSize.lg,
    fontWeight: "700",
    width: 28,
  },
  topSourceName: {
    color: colors.text,
    fontSize: fontSize.base,
    flex: 1,
  },
  topSourceCount: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginEnd: spacing.sm,
  },
  topSourceScore: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
