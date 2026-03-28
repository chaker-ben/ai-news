import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ExternalLink, Bookmark as BookmarkIcon } from "lucide-react-native";
import { api } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

interface ArticleDetail {
  id: string;
  original_title: string;
  title_fr: string | null;
  title_en: string | null;
  title_ar: string | null;
  original_content: string | null;
  summary_fr: string | null;
  summary_en: string | null;
  summary_ar: string | null;
  url: string;
  source_type: string;
  score: number;
  published_at: string | null;
  collected_at: string | null;
  content_hash: string;
}

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

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const data = await api<ArticleDetail>(`/articles/${id}`, { auth: false });
        setArticle(data);
      } catch (error) {
        console.error("Failed to fetch article:", error);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchArticle();
  }, [id]);

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
        <Text style={styles.errorText}>Article not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const title = article.title_fr || article.original_title;
  const summary = article.summary_fr || "";
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => Linking.openURL(article.url)}
            style={styles.headerBtn}
            accessibilityLabel="Open in browser"
          >
            <ExternalLink size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} accessibilityLabel="Bookmark">
            <BookmarkIcon size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Meta */}
        <View style={styles.metaRow}>
          <SourceBadge type={article.source_type} />
          <ScoreBadge score={article.score} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Date */}
        {publishedDate ? (
          <Text style={styles.date}>{publishedDate}</Text>
        ) : null}

        {/* Summary FR */}
        {summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Résumé</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {/* Summary EN */}
        {article.summary_en ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Summary (EN)</Text>
            <Text style={styles.summaryText}>{article.summary_en}</Text>
          </View>
        ) : null}

        {/* Summary AR */}
        {article.summary_ar ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>الملخص (AR)</Text>
            <Text style={[styles.summaryText, { writingDirection: "rtl", textAlign: "right" }]}>
              {article.summary_ar}
            </Text>
          </View>
        ) : null}

        {/* Original title */}
        {article.original_title !== title ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Original Title</Text>
            <Text style={styles.originalTitle}>{article.original_title}</Text>
          </View>
        ) : null}

        {/* Open button */}
        <TouchableOpacity
          style={styles.openButton}
          onPress={() => Linking.openURL(article.url)}
        >
          <ExternalLink size={18} color="#fff" />
          <Text style={styles.openButtonText}>Read Full Article</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  errorText: { color: colors.textSecondary, fontSize: fontSize.xl, marginBottom: spacing.lg },
  backBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  backBtnText: { color: colors.primary, fontSize: fontSize.base, fontWeight: "600" },
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
  headerBtn: { padding: spacing.sm, borderRadius: radius.md },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  content: { padding: spacing.lg, paddingBottom: 40 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: spacing.sm,
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 24,
  },
  originalTitle: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontStyle: "italic",
  },
  openButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  openButtonText: { color: "#fff", fontSize: fontSize.xl, fontWeight: "600" },
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: "600" },
  sourceBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  sourceBadgeText: { fontSize: fontSize.xs, fontWeight: "500" },
});
