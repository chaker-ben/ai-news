import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Bookmark as BookmarkIcon, ExternalLink } from "lucide-react-native";
import { apiClient, Article } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

function ScoreBadge({ score }: { score: number }) {
  let color: string = colors.textMuted;
  if (score >= 9) color = colors.error;
  else if (score >= 7) color = colors.warning;
  else if (score >= 5) color = colors.primary;

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{score.toFixed(1)}</Text>
    </View>
  );
}

function SourceBadge({ type }: { type: string }) {
  const sourceColors: Record<string, string> = {
    blog: colors.primary,
    twitter: colors.info,
    youtube: colors.error,
    reddit: colors.warning,
    arxiv: colors.purple,
  };
  const color = sourceColors[type] || colors.textMuted;

  return (
    <View style={[styles.sourceBadge, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.sourceBadgeText, { color }]}>{type}</Text>
    </View>
  );
}

function ArticleCard({
  article,
  onBookmark,
  onPress,
}: {
  article: Article;
  onBookmark: (id: string) => void;
  onPress: (id: string) => void;
}) {
  const handleOpenUrl = useCallback(() => {
    Linking.openURL(article.url);
  }, [article.url]);

  const handleBookmark = useCallback(() => {
    onBookmark(article.id);
  }, [article.id, onBookmark]);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(article.id)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <SourceBadge type={article.source_type} />
        <ScoreBadge score={article.score} />
      </View>
      <Text style={styles.cardTitle}>{article.title}</Text>
      {article.summary ? (
        <Text style={styles.cardSummary} numberOfLines={3}>
          {article.summary}
        </Text>
      ) : null}
      {article.published_at ? (
        <Text style={styles.cardDate}>
          {new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(article.published_at))}
        </Text>
      ) : null}
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={handleOpenUrl}
          style={styles.actionButton}
          accessibilityLabel="Open article"
          accessibilityRole="link"
        >
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleBookmark}
          style={styles.actionButton}
          accessibilityLabel="Bookmark article"
          accessibilityRole="button"
        >
          <BookmarkIcon size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function ArticlesScreen() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchArticles = useCallback(async () => {
    try {
      const data = await apiClient.getArticles({ limit: 30 });
      setArticles(data.articles);
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArticles();
  }, [fetchArticles]);

  const handlePress = useCallback((articleId: string) => {
    router.push(`/article/${articleId}`);
  }, [router]);

  const handleBookmark = useCallback(async (articleId: string) => {
    try {
      await apiClient.addBookmark(articleId);
    } catch {
      // Already bookmarked or error — silent fail for now
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={articles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ArticleCard article={item} onBookmark={handleBookmark} onPress={handlePress} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={styles.list}
      style={styles.container}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No articles yet</Text>
          <Text style={styles.emptySubtext}>Pull to refresh</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "600",
    lineHeight: 22,
  },
  cardSummary: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 20,
    marginTop: spacing.xs + 2,
  },
  cardDate: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  sourceBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  sourceBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: "500",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.xl,
    fontWeight: "500",
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
});
