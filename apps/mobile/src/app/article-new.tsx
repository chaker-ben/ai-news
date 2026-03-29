import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image as RNImage,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Image,
  Link2,
  Trash2,
  Send,
  FileEdit,
  Globe,
} from "@/lib/icons";
import {
  apiClient,
  type PublishedArticle,
  type ArticleMedia,
} from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

const LANGUAGES = [
  { code: "fr", label: "Francais" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

interface PickedImage {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export default function ArticleNewScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [language, setLanguage] = useState("fr");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<ArticleMedia[]>([]);
  const [draft, setDraft] = useState<PublishedArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - images.length,
      });

      if (result.canceled || result.assets.length === 0) return;

      const newImages: PickedImage[] = result.assets.map((asset: ImagePicker.ImagePickerAsset) => ({
        uri: asset.uri,
        fileName: asset.fileName ?? `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileSize: asset.fileSize ?? 0,
      }));

      setImages((prev) => [...prev, ...newImages].slice(0, 5));
    } catch (error) {
      console.error("Image picker error:", error);
    }
  }, [images.length]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadImages = useCallback(
    async (articleId: string, imagesToUpload: PickedImage[]) => {
      const uploaded: ArticleMedia[] = [];

      for (const img of imagesToUpload) {
        try {
          const presignRes = await apiClient.getPresignedUrl({
            articleId,
            filename: img.fileName,
            mimeType: img.mimeType,
            sizeBytes: img.fileSize,
            category: "article-images",
          });

          const { uploadUrl, key, publicUrl } = presignRes.data;

          const response = await fetch(img.uri);
          const blob = await response.blob();
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": img.mimeType },
            body: blob,
          });

          const confirmRes = await apiClient.confirmUpload({
            articleId,
            key,
            url: publicUrl,
            mimeType: img.mimeType,
            sizeBytes: img.fileSize,
            type: "image",
          });

          uploaded.push(confirmRes.data);
        } catch (error) {
          console.error("Upload failed for image:", img.fileName, error);
        }
      }

      return uploaded;
    },
    [],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert(t("publish.titleRequired"));
      return;
    }

    setSaving(true);
    setStatusMessage("");

    try {
      let article: PublishedArticle;

      if (draft) {
        const res = await apiClient.updateArticle(draft.id, {
          title: title.trim(),
          content: content.trim() || undefined,
          originalUrl: originalUrl.trim() || undefined,
        });
        article = res.data;
      } else {
        const res = await apiClient.createArticle({
          title: title.trim(),
          content: content.trim() || undefined,
          originalUrl: originalUrl.trim() || undefined,
          language,
        });
        article = res.data;
      }

      setDraft(article);

      // Upload new images
      if (images.length > 0) {
        const newMedia = await uploadImages(article.id, images);
        setUploadedMedia((prev) => [...prev, ...newMedia]);
        setImages([]);
      }

      setStatusMessage(t("publish.draftSaved"));
    } catch (error) {
      console.error("Failed to save draft:", error);
      Alert.alert(t("common.error"));
    } finally {
      setSaving(false);
    }
  }, [title, content, originalUrl, language, draft, images, uploadImages, t]);

  const handleSubmit = useCallback(async () => {
    if (!draft) {
      await handleSaveDraft();
      return;
    }

    setSubmitting(true);
    setStatusMessage("");

    try {
      const res = await apiClient.submitArticle(draft.id);
      setDraft(res.data);
      setStatusMessage(t("publish.submitted"));
      Alert.alert(t("publish.submitted"), t("publish.submittedDesc"), [
        {
          text: t("common.confirm"),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Failed to submit:", error);
      Alert.alert(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }, [draft, handleSaveDraft, router, t]);

  const isSubmitted =
    draft?.status === "pending_review" || draft?.status === "published";

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
          <Text style={styles.headerTitle}>{t("publish.newArticle")}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.label}>{t("publish.title")}</Text>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder={t("publish.titlePlaceholder")}
          placeholderTextColor={colors.textMuted}
          maxLength={200}
          editable={!isSubmitted}
        />

        {/* Content */}
        <Text style={styles.label}>{t("publish.content")}</Text>
        <TextInput
          style={styles.contentInput}
          value={content}
          onChangeText={setContent}
          placeholder={t("publish.contentPlaceholder")}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          editable={!isSubmitted}
        />

        {/* Original URL */}
        <Text style={styles.label}>
          <Link2 size={14} color={colors.textSecondary} />{" "}
          {t("publish.originalUrl")}
        </Text>
        <TextInput
          style={styles.urlInput}
          value={originalUrl}
          onChangeText={setOriginalUrl}
          placeholder="https://"
          placeholderTextColor={colors.textMuted}
          keyboardType="url"
          autoCapitalize="none"
          editable={!isSubmitted}
        />

        {/* Language picker */}
        <Text style={styles.label}>
          <Globe size={14} color={colors.textSecondary} />{" "}
          {t("publish.language")}
        </Text>
        <View style={styles.langRow}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langChip,
                language === lang.code && styles.langChipActive,
              ]}
              onPress={() => setLanguage(lang.code)}
              disabled={isSubmitted}
            >
              <Text
                style={[
                  styles.langChipText,
                  language === lang.code && styles.langChipTextActive,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Image picker */}
        {!isSubmitted ? (
          <>
            <Text style={styles.label}>
              <Image size={14} color={colors.textSecondary} />{" "}
              {t("publish.images")}
            </Text>
            <TouchableOpacity
              style={styles.imagePickerBtn}
              onPress={pickImage}
              disabled={images.length + uploadedMedia.length >= 5}
            >
              <Image size={20} color={colors.primary} />
              <Text style={styles.imagePickerText}>
                {t("publish.addImages")}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        {/* Image thumbnails */}
        {(images.length > 0 || uploadedMedia.length > 0) ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageThumbs}
            contentContainerStyle={styles.imageThumbsContent}
          >
            {uploadedMedia.map((media) => (
              <View key={media.id} style={styles.thumbContainer}>
                <RNImage source={{ uri: media.url }} style={styles.thumb} />
              </View>
            ))}
            {images.map((img, index) => (
              <View key={img.uri} style={styles.thumbContainer}>
                <RNImage source={{ uri: img.uri }} style={styles.thumb} />
                <TouchableOpacity
                  style={styles.thumbRemove}
                  onPress={() => removeImage(index)}
                >
                  <Trash2 size={14} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {/* Status message */}
        {statusMessage ? (
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        ) : null}

        {/* Action buttons */}
        {!isSubmitted ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.draftBtn, saving && styles.btnDisabled]}
              onPress={handleSaveDraft}
              disabled={saving || submitting}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <FileEdit size={18} color={colors.primary} />
                  <Text style={styles.draftBtnText}>
                    {t("publish.saveDraft")}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={saving || submitting || !title.trim()}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {t("publish.submit")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.submittedBanner}>
            <Text style={styles.submittedText}>
              {t("publish.alreadySubmitted")}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  content: {
    padding: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  titleInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    color: colors.text,
    fontSize: fontSize.base,
    lineHeight: 24,
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urlInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  langChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  langChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  langChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  langChipTextActive: {
    color: colors.primary,
  },
  imagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.surfaceLight,
  },
  imagePickerText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: "500",
  },
  imageThumbs: {
    marginTop: spacing.md,
  },
  imageThumbsContent: {
    gap: spacing.sm,
  },
  thumbContainer: {
    position: "relative",
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLight,
  },
  thumbRemove: {
    position: "absolute",
    top: -6,
    end: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  statusMessage: {
    color: colors.success,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  draftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  draftBtnText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submittedBanner: {
    marginTop: spacing.xl,
    backgroundColor: `${colors.success}15`,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
    alignItems: "center",
  },
  submittedText: {
    color: colors.success,
    fontSize: fontSize.base,
    fontWeight: "500",
  },
});
