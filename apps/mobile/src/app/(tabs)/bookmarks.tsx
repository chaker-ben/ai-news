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
  Alert,
} from "react-native";
import { ExternalLink, Trash2, Bookmark as BookmarkIcon } from "lucide-react-native";
import { apiClient, Bookmark } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

function BookmarkCard({
  bookmark,
  onRemove,
}: {
  bookmark: Bookmark;
  onRemove: (articleId: string) => void;
}) {
  const { article } = bookmark;

  const handleOpenUrl = useCallback(() => {
    Linking.openURL(article.url);
  }, [article.url]);

  const handleRemove = useCallback(() => {
    Alert.alert(
      "Remove Bookmark",
      "Are you sure you want to remove this bookmark?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onRemove(bookmark.articleId),
        },
      ],
    );
  }, [bookmark.articleId, onRemove]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.sourceBadge, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.sourceBadgeText, { color: colors.primary }]}>
            {article.source_type}
          </Text>
        </View>
        <View style={[styles.badge, { borderColor: colors.primary }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {article.score.toFixed(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{article.title}</Text>
      {article.summary ? (
        <Text style={styles.cardSummary} numberOfLines={3}>
          {article.summary}
        </Text>
      ) : null}
      <Text style={styles.savedDate}>
        Saved {new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "short",
        }).format(new Date(bookmark.createdAt))}
      </Text>
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
          onPress={handleRemove}
          style={styles.actionButton}
          accessibilityLabel="Remove bookmark"
          accessibilityRole="button"
        >
          <Trash2 size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    try {
      const data = await apiClient.getBookmarks();
      setBookmarks(data.data);
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleRemove = useCallback(
    async (articleId: string) => {
      try {
        await apiClient.removeBookmark(articleId);
        setBookmarks((prev) =>
          prev.filter((b) => b.articleId !== articleId),
        );
      } catch (error) {
        console.error("Failed to remove bookmark:", error);
      }
    },
    [],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={bookmarks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <BookmarkCard bookmark={item} onRemove={handleRemove} />
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
          <BookmarkIcon size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No bookmarks yet</Text>
          <Text style={styles.emptySubtext}>
            Save articles from the feed to read later
          </Text>
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
  savedDate: {
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
    gap: spacing.sm,
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
