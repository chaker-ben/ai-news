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
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ExternalLink, Trash2, Bookmark as BookmarkIcon } from "@/lib/icons";
import { apiClient, type Bookmark } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { EmptyState } from "@/components/ui/EmptyState";

function BookmarkCard({
  bookmark,
  onRemove,
  onPress,
}: {
  bookmark: Bookmark;
  onRemove: (articleId: string) => void;
  onPress: (articleId: string) => void;
}) {
  const { t } = useTranslation();
  const { article } = bookmark;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(article.id)}
      activeOpacity={0.7}
    >
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
      <Text style={styles.savedDate}>
        {t("bookmarks.saved")}{" "}
        {new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "short",
        }).format(new Date(bookmark.createdAt))}
      </Text>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => Linking.openURL(article.url)}
          style={styles.actionButton}
          accessibilityLabel={t("articles.openInBrowser")}
        >
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(t("bookmarks.remove"), t("bookmarks.removeConfirm"), [
              { text: t("common.cancel"), style: "cancel" },
              { text: t("common.delete"), style: "destructive", onPress: () => onRemove(bookmark.articleId) },
            ]);
          }}
          style={styles.actionButton}
          accessibilityLabel={t("bookmarks.remove")}
        >
          <Trash2 size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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

  const handleRemove = useCallback(async (articleId: string) => {
    try {
      await apiClient.removeBookmark(articleId);
      setBookmarks((prev) => prev.filter((b) => b.articleId !== articleId));
    } catch (error) {
      console.error("Failed to remove bookmark:", error);
    }
  }, []);

  const handlePress = useCallback((articleId: string) => {
    router.push(`/article/${articleId}`);
  }, [router]);

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
        <BookmarkCard bookmark={item} onRemove={handleRemove} onPress={handlePress} />
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
      contentContainerStyle={styles.list}
      style={styles.container}
      ListEmptyComponent={
        <EmptyState
          icon={<BookmarkIcon size={48} color={colors.textMuted} />}
          title={t("bookmarks.empty")}
          description={t("bookmarks.emptyDesc")}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600", lineHeight: 22 },
  cardSummary: { color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 20, marginTop: spacing.xs + 2 },
  savedDate: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.sm },
  cardActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.md, marginTop: spacing.md },
  actionButton: { padding: spacing.sm, borderRadius: radius.md },
});
