import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BarChart3 } from "lucide-react-native";
import { apiClient, AnalyticsData } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

const SOURCE_COLORS: Record<string, string> = {
  blog: colors.primary,
  twitter: colors.info,
  youtube: colors.error,
  reddit: colors.warning,
  arxiv: colors.purple,
};

function StatCard({
  label,
  value,
  color = colors.primary,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

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
            {
              backgroundColor: color,
              width: `${Math.max(widthPercent, 4)}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.sourceCount, { writingDirection: "ltr" }]}>
        {new Intl.NumberFormat("en-US").format(count)}
      </Text>
    </View>
  );
}

export default function AnalyticsScreen() {
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
      <View style={styles.center}>
        <BarChart3 size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>Analytics unavailable</Text>
        <Text style={styles.emptySubtext}>Pull to refresh</Text>
      </View>
    );
  }

  const sourceEntries = Object.entries(data.sourceDistribution);
  const maxCount = Math.max(...sourceEntries.map(([, c]) => c), 1);

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
      <View style={styles.statsGrid}>
        <StatCard
          label="Total Articles"
          value={new Intl.NumberFormat("en-US").format(data.totalArticles)}
          color={colors.primary}
        />
        <StatCard
          label="Avg. Score"
          value={data.averageScore.toFixed(1)}
          color={colors.warning}
        />
        <StatCard
          label="Today"
          value={String(data.articlesToday)}
          color={colors.success}
        />
        <StatCard
          label="Sources"
          value={String(sourceEntries.length)}
          color={colors.purple}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Source Distribution</Text>
        <View style={styles.sourceList}>
          {sourceEntries
            .sort(([, a], [, b]) => b - a)
            .map(([source, count]) => (
              <SourceBar
                key={source}
                source={source}
                count={count}
                maxCount={maxCount}
              />
            ))}
        </View>
      </View>

      {data.topSources.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Sources</Text>
          {data.topSources.slice(0, 5).map((item, index) => (
            <View key={item.source} style={styles.topSourceRow}>
              <Text style={styles.topSourceRank}>{index + 1}</Text>
              <Text style={styles.topSourceName}>{item.source}</Text>
              <Text style={[styles.topSourceCount, { writingDirection: "ltr" }]}>
                {new Intl.NumberFormat("en-US").format(item.count)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statValue: {
    fontSize: fontSize.heading,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  sourceList: {
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
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourceName: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
  sourceCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    width: 40,
    textAlign: "right",
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
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.xl,
    fontWeight: "500",
    marginTop: spacing.lg,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});
