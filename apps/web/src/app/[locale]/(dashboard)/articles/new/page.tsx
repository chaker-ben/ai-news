"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Save,
  Send,
  Loader2,
  Upload,
  X,
  ImageIcon,
  ChevronDown,
  Check,
} from "lucide-react";
import { Link } from "@/i18n/routing";

interface UploadedImage {
  key: string;
  url: string;
  filename: string;
}

const LANGUAGES = [
  { code: "fr", label: "Francais" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

export default function NewArticlePage() {
  const t = useTranslations("publish");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("fr");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const [articleId, setArticleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(e.target as Node)
      ) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      if (!articleId) {
        // Create new draft
        const res = await fetch("/api/articles/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim() || undefined,
            originalUrl: originalUrl.trim() || undefined,
            language,
          }),
        });
        if (!res.ok) throw new Error("Failed to create draft");
        const data = await res.json();
        setArticleId(data.data.id);
      } else {
        // Update existing draft
        const res = await fetch(`/api/articles/publish/${articleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim() || undefined,
            originalUrl: originalUrl.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed to save draft");
      }
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [title, content, originalUrl, language, articleId]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!title.trim()) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, originalUrl, saveDraft]);

  const handleSubmit = async () => {
    if (!articleId) {
      // Save first, then submit
      await saveDraft();
    }

    if (!articleId && !title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Ensure draft is saved first
      let currentId = articleId;
      if (!currentId) {
        const res = await fetch("/api/articles/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim() || undefined,
            originalUrl: originalUrl.trim() || undefined,
            language,
          }),
        });
        if (!res.ok) throw new Error("Failed to create draft");
        const data = await res.json();
        currentId = data.data.id;
        setArticleId(currentId);
      }

      const res = await fetch(`/api/articles/publish/${currentId}/submit`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to submit article");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Ensure we have an article ID first
    let currentId = articleId;
    if (!currentId && title.trim()) {
      setSaving(true);
      try {
        const res = await fetch("/api/articles/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim() || undefined,
            originalUrl: originalUrl.trim() || undefined,
            language,
          }),
        });
        if (!res.ok) throw new Error("Failed to create draft");
        const data = await res.json();
        currentId = data.data.id;
        setArticleId(currentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save draft for upload");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (!currentId) {
      setError(t("titleRequiredForUpload"));
      return;
    }

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        // 1. Get presigned URL
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: currentId,
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            category: "image",
          }),
        });
        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const presignData = await presignRes.json();

        // 2. Upload to R2
        await fetch(presignData.data.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        // 3. Confirm
        await fetch("/api/upload/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: currentId,
            key: presignData.data.key,
            url: presignData.data.publicUrl,
            mimeType: file.type,
            sizeBytes: file.size,
            type: "image",
          }),
        });

        setImages((prev) => [
          ...prev,
          {
            key: presignData.data.key,
            url: presignData.data.publicUrl,
            filename: file.name,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  };

  const removeImage = (key: string) => {
    setImages((prev) => prev.filter((img) => img.key !== key));
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background:
              "color-mix(in srgb, var(--color-primary-500) 15%, transparent)",
          }}
        >
          <Check size={24} style={{ color: "var(--color-primary-400)" }} />
        </div>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("submittedTitle")}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("submittedDescription")}
        </p>
        <Link
          href="/articles/my"
          className="mt-6 inline-block rounded-lg px-6 py-2.5 text-sm font-semibold transition-all"
          style={{
            background: "var(--color-primary-600)",
            color: "white",
          }}
        >
          {t("viewMyArticles")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("newArticle")}
        </h1>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("lastSaved", {
                time: lastSaved.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </span>
          )}
          <button
            onClick={saveDraft}
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
              opacity: title.trim() ? 1 : 0.5,
            }}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {t("saveDraft")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
            style={{
              background: "var(--color-primary-600)",
              color: "white",
              boxShadow: title.trim()
                ? "var(--shadow-glow-primary)"
                : "none",
              opacity: title.trim() ? 1 : 0.5,
            }}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {t("submitForReview")}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm"
          style={{
            background:
              "color-mix(in srgb, var(--color-error, #ef4444) 12%, transparent)",
            color: "var(--color-error, #ef4444)",
            border: "1px solid color-mix(in srgb, var(--color-error, #ef4444) 25%, transparent)",
          }}
        >
          {error}
        </div>
      )}

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("titlePlaceholder")}
        className="mb-6 w-full bg-transparent text-2xl font-bold outline-none placeholder:opacity-40"
        style={{ color: "var(--text-primary)" }}
      />

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("contentPlaceholder")}
        rows={12}
        className="mb-6 w-full resize-y rounded-xl bg-transparent p-4 text-sm outline-none placeholder:opacity-40"
        style={{
          color: "var(--text-secondary)",
          lineHeight: "1.75",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          minHeight: "200px",
        }}
      />

      {/* URL + Language row */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {t("originalUrl")}
          </label>
          <input
            type="url"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-40"
            style={{
              color: "var(--text-primary)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          />
        </div>

        <div className="relative" ref={langDropdownRef}>
          <label
            className="mb-1.5 block text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {t("language")}
          </label>
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            style={{
              color: "var(--text-primary)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              minWidth: "120px",
            }}
          >
            <span className="flex-1 text-start">
              {LANGUAGES.find((l) => l.code === language)?.label}
            </span>
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </button>
          {langDropdownOpen && (
            <div
              className="absolute z-10 mt-1 w-full rounded-lg py-1 shadow-lg"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
              }}
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setLangDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                  style={{
                    color:
                      language === lang.code
                        ? "var(--color-primary-400)"
                        : "var(--text-secondary)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {lang.label}
                  {language === lang.code && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image upload */}
      <div className="mb-6">
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {t("images")}
        </label>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl py-8 transition-all"
          style={{
            background: "var(--bg-surface)",
            border: "2px dashed var(--border-default)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-primary-500)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
          }}
        >
          {uploading ? (
            <Loader2
              size={24}
              className="animate-spin"
              style={{ color: "var(--color-primary-400)" }}
            />
          ) : (
            <Upload size={24} style={{ color: "var(--text-muted)" }} />
          )}
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("dropImages")}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        {/* Image previews */}
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((img) => (
              <div
                key={img.key}
                className="group relative overflow-hidden rounded-lg"
                style={{
                  width: "80px",
                  height: "80px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <img
                  src={img.url}
                  alt={img.filename}
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => removeImage(img.key)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background: "rgb(0 0 0 / 0.5)",
                  }}
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && !uploading && (
          <div className="mt-2 flex items-center gap-1.5">
            <ImageIcon size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("noImages")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
