import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  PenLine,
  Plus,
  Clock,
  Eye,
  AlertCircle,
  Check,
  Image,
} from "@/lib/icons";
import { apiClient, type PublishedArticle } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { EmptyState } from "@/components/ui/EmptyState";

type StatusFilter = "all" | "draft" | "pending_review" | "published" | "rejected";

const STATUS_COLORS: Record<PublishedArticle["status"], string> = {
  draft: colors.textMuted,
  pending_review: colors.warning,
  published: colors.success,
  rejected: colors.error,
};

const STATUS_ICONS: Record<PublishedArticle["status"], typeof Clock> = {
  draft: PenLine,
  pending_review: Clock,
  published: Check,
  rejected: AlertCircle,
};

export default function MyArticlesScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const fetchArticles = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const statusParam = filter === "all" ? undefined : filter;
        const res = await apiClient.getMyArticles({
          take: 50,
          status: statusParam,
        });
        setArticles(res.data);
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    setLoading(true);
    fetchArticles();
  }, [fetchArticles]);

  const handleArticlePress = useCallback(
    (article: PublishedArticle) => {
      if (article.status === "draft") {
        // Navigate to edit (reuse article-new with draft data)
        router.push({
          pathname: "/article-new",
          params: { draftId: article.id },
        });
      } else {
        router.push({
          pathname: "/article/[id]",
          params: { id: article.id },
        });
      }
    },
    [router],
  );

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: t("publish.filterAll") },
    { key: "draft", label: t("publish.filterDraft") },
    { key: "pending_review", label: t("publish.filterPending") },
    { key: "published", label: t("publish.filterPublished") },
  ];

  const renderArticle = useCallback(
    ({ item }: { item: PublishedArticle }) => {
      const statusColor = STATUS_COLORS[item.status];
      const StatusIcon = STATUS_ICONS[item.status];
      const date = new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(item.createdAt));

      return (
        <TouchableOpacity
          style={styles.articleCard}
          onPress={() => handleArticlePress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.articleHeader}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}40` },
              ]}
            >
              <StatusIcon size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {t(`publish.status_${item.status}`)}
              </Text>
            </View>
            {item.media.length > 0 ? (
              <View style={styles.mediaCount}>
                <Image size={12} color={colors.textMuted} />
                <Text
                  style={[styles.mediaCountText, { writingDirection: "ltr" }]}
                >
                  {item.media.length}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.articleTitle} numberOfLines={2}>
            {item.originalTitle}
          </Text>

          <Text style={[styles.articleDate, { writingDirection: "ltr" }]}>
            {date}
          </Text>
        </TouchableOpacity>
      );
    },
    [handleArticlePress, t],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel={t("common.back")}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleArea}>
          <Text style={styles.headerTitle}>{t("publish.myArticles")}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              filter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<PenLine size={48} color={colors.textMuted} />}
          title={t("publish.emptyTitle")}
          description={t("publish.emptyDesc")}
          actionLabel={t("publish.writeFirst")}
          onAction={() => router.push("/article-new")}
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchArticles(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/article-new")}
        accessibilityLabel={t("publish.newArticle")}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerBtn: {
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  headerTitleArea: {
    flex: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "600",
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: 100,
  },
  articleCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  articleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  mediaCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  mediaCountText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  articleTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  articleDate: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    end: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
