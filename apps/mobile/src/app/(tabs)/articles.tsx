import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Bookmark as BookmarkIcon, ExternalLink, Search, Filter } from "@/lib/icons";
import { apiClient, type Article } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { SourceBadge, SOURCE_COLORS } from "@/components/ui/SourceBadge";
import { EmptyState } from "@/components/ui/EmptyState";

const SOURCE_TYPES = ["all", "blog", "twitter", "youtube", "reddit", "arxiv"];

function ArticleCard({
  article,
  onBookmark,
  onPress,
}: {
  article: Article;
  onBookmark: (id: string) => void;
  onPress: (id: string) => void;
}) {
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
      {article.published_at ? (
        <Text style={[styles.cardDate, { writingDirection: "ltr" }]}>
          {new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(new Date(article.published_at))}
        </Text>
      ) : null}
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => Linking.openURL(article.url)}
          style={styles.actionButton}
          accessibilityLabel="Open article"
        >
          <ExternalLink size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onBookmark(article.id)}
          style={styles.actionButton}
          accessibilityLabel="Bookmark article"
        >
          <BookmarkIcon size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function ArticlesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchArticles = useCallback(
    async (reset = false) => {
      try {
        const skip = reset ? 0 : page * 30;
        const data = await apiClient.getArticles({
          limit: 30,
          skip,
          source_type: selectedSource === "all" ? undefined : selectedSource,
          search: searchQuery || undefined,
        });
        if (reset) {
          setArticles(data.articles);
          setPage(1);
        } else {
          setArticles((prev) => [...prev, ...data.articles]);
          setPage((prev) => prev + 1);
        }
        setHasMore(data.articles.length === 30);
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedSource, searchQuery, page],
  );

  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetchArticles(true);
  }, [selectedSource, searchQuery]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArticles(true);
  }, [fetchArticles]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchArticles(false);
    }
  }, [loading, hasMore, fetchArticles]);

  const handlePress = useCallback(
    (articleId: string) => {
      router.push(`/article/${articleId}`);
    },
    [router],
  );

  const handleBookmark = useCallback(async (articleId: string) => {
    try {
      await apiClient.addBookmark(articleId);
    } catch {
      // silent
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("articles.searchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={showFilters ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Source Filters */}
      {showFilters ? (
        <View style={styles.filtersRow}>
          {SOURCE_TYPES.map((type) => {
            const isSelected = selectedSource === type;
            const color = type === "all" ? colors.primary : (SOURCE_COLORS[type] || colors.textMuted);
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  isSelected && { backgroundColor: `${color}20`, borderColor: color },
                ]}
                onPress={() => setSelectedSource(type)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? color : colors.textMuted },
                  ]}
                >
                  {type === "all" ? t("articles.all") : type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* Article List */}
      {loading && articles.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onBookmark={handleBookmark}
              onPress={handlePress}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon={<Search size={48} color={colors.textMuted} />}
              title={t("articles.noArticles")}
              description={t("articles.noArticlesDesc")}
            />
          }
          ListFooterComponent={
            loading && articles.length > 0 ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ padding: spacing.lg }}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingTop: 0 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.base,
    paddingVertical: spacing.md,
  },
  filterButton: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: {
    borderColor: colors.primary,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
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
});
