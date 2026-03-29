import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ExternalLink,
  Bookmark as BookmarkIcon,
  BookmarkCheck,
  MessageCircle,
  Send,
} from "@/lib/icons";
import { apiClient, type ArticleDetail } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { SourceBadge } from "@/components/ui/SourceBadge";

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const data = await apiClient.getArticle(id!);
        setArticle(data);
      } catch (error) {
        console.error("Failed to fetch article:", error);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchArticle();
  }, [id]);

  const handleBookmark = useCallback(async () => {
    if (!article || bookmarking) return;
    setBookmarking(true);
    try {
      if (isBookmarked) {
        await apiClient.removeBookmark(article.id);
        setIsBookmarked(false);
      } else {
        await apiClient.addBookmark(article.id);
        setIsBookmarked(true);
      }
    } catch {
      // silent
    } finally {
      setBookmarking(false);
    }
  }, [article, isBookmarked, bookmarking]);

  const handleShare = useCallback(async () => {
    if (!article) return;
    try {
      await Share.share({
        title: article.title_fr || article.original_title,
        url: article.url,
        message: article.url,
      });
    } catch {
      // cancelled
    }
  }, [article]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t("common.error")}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const title = article.title_fr || article.original_title;
  const summary = article.summary_fr || article.summary || "";
  const publishedDate = article.published_at
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(article.published_at))
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel={t("common.back")}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn} accessibilityLabel="Share">
            <Send size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(article.url)} style={styles.headerBtn} accessibilityLabel={t("articles.openInBrowser")}>
            <ExternalLink size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBookmark} style={styles.headerBtn} accessibilityLabel={t("articles.bookmark")}>
            {isBookmarked ? (
              <BookmarkCheck size={20} color={colors.primary} />
            ) : (
              <BookmarkIcon size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Meta */}
        <View style={styles.metaRow}>
          <SourceBadge type={article.source_type} />
          <ScoreBadge score={article.score} />
          {article.word_count ? (
            <Text style={[styles.wordCount, { writingDirection: "ltr" }]}>
              {article.word_count} words
            </Text>
          ) : null}
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Date */}
        {publishedDate ? (
          <Text style={[styles.date, { writingDirection: "ltr" }]}>{publishedDate}</Text>
        ) : null}

        {/* Summary FR */}
        {summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("articles.summary")}</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* Summary EN */}
        {article.summary_en ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("articles.summaryEn")}</Text>
            <Text style={styles.summaryText}>{article.summary_en}</Text>
          </View>
        ) : null}

        {/* Summary AR */}
        {article.summary_ar ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("articles.summaryAr")}</Text>
            <Text style={[styles.summaryText, { writingDirection: "rtl", textAlign: "right" }]}>
              {article.summary_ar}
            </Text>
          </View>
        ) : null}

        {/* Original title */}
        {article.original_title !== title ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("articles.originalTitle")}</Text>
            <Text style={styles.originalTitle}>{article.original_title}</Text>
          </View>
        ) : null}

        {/* Open button */}
        <TouchableOpacity style={styles.openButton} onPress={() => Linking.openURL(article.url)}>
          <ExternalLink size={18} color="#fff" />
          <Text style={styles.openButtonText}>{t("articles.readMore")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Chat FAB */}
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/article-chat",
            params: { articleId: article.id, articleTitle: title },
          })
        }
        style={styles.chatFab}
        accessibilityLabel={t("chat.title")}
      >
        <MessageCircle size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background,
  },
  errorText: { color: colors.textSecondary, fontSize: fontSize.xl, marginBottom: spacing.lg },
  backBtn: {
    backgroundColor: colors.surfaceLight, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md, borderRadius: radius.lg,
  },
  backBtnText: { color: colors.primary, fontSize: fontSize.base, fontWeight: "600" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: { padding: spacing.sm, borderRadius: radius.md },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  content: { padding: spacing.lg, paddingBottom: 40 },
  metaRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md,
  },
  wordCount: { color: colors.textMuted, fontSize: fontSize.xs },
  title: {
    color: colors.text, fontSize: fontSize.heading, fontWeight: "700",
    lineHeight: 32, marginBottom: spacing.sm,
  },
  date: { color: colors.textMuted, fontSize: fontSize.md, marginBottom: spacing.xl },
  section: {
    marginBottom: spacing.xl, backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  sectionLabel: {
    color: colors.primaryLight, fontSize: fontSize.sm, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  summaryText: { color: colors.textSecondary, fontSize: fontSize.base, lineHeight: 24 },
  originalTitle: { color: colors.textMuted, fontSize: fontSize.base, fontStyle: "italic" },
  openButton: {
    backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: spacing.lg,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, marginTop: spacing.md,
  },
  openButtonText: { color: "#fff", fontSize: fontSize.xl, fontWeight: "600" },
  chatFab: {
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
