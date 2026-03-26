"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Plus,
  Trash2,
  Edit3,
  X,
  Mail,
  MessageSquare,
  Phone,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";

interface CustomAlert {
  id: string;
  name: string;
  keywords: string[];
  channels: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type Channel = "whatsapp" | "email" | "telegram";

const CHANNELS: { key: Channel; icon: typeof Mail; label: string }[] = [
  { key: "email", icon: Mail, label: "Email" },
  { key: "whatsapp", icon: Phone, label: "WhatsApp" },
  { key: "telegram", icon: MessageSquare, label: "Telegram" },
];

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case "email":
      return <Mail size={14} />;
    case "whatsapp":
      return <Phone size={14} />;
    case "telegram":
      return <MessageSquare size={14} />;
    default:
      return null;
  }
}

interface AlertFormData {
  name: string;
  keywords: string[];
  channels: Channel[];
  isActive: boolean;
}

function AlertForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: AlertFormData;
  onSave: (data: AlertFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const t = useTranslations("alerts");
  const [name, setName] = useState(initial?.name ?? "");
  const [keywords, setKeywords] = useState<string[]>(initial?.keywords ?? []);
  const [keywordInput, setKeywordInput] = useState("");
  const [channels, setChannels] = useState<Channel[]>(initial?.channels ?? []);

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed) && keywords.length < 20) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  };

  const canSave = name.trim().length > 0 && keywords.length > 0 && channels.length > 0;

  return (
    <div
      className="space-y-4 rounded-xl p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--color-primary-600)",
      }}
    >
      {/* Name */}
      <div>
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("name")}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          maxLength={100}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:ring-1"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Keywords */}
      <div>
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("keywords")}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder={t("keywordsPlaceholder")}
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:ring-1"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="button"
            onClick={addKeyword}
            disabled={!keywordInput.trim()}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40"
            style={{
              background: "var(--bg-hover)",
              color: "var(--color-primary-400)",
            }}
          >
            <Plus size={16} />
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  background: "var(--bg-hover)",
                  color: "var(--color-primary-400)",
                }}
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="ms-0.5 rounded-full p-0.5 transition-colors hover:opacity-70"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Channels */}
      <div>
        <label
          className="mb-1.5 block text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("channels")}
        </label>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map(({ key, icon: Icon, label }) => {
            const selected = channels.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleChannel(key)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  background: selected ? "var(--bg-hover)" : "var(--bg-elevated)",
                  color: selected ? "var(--color-primary-400)" : "var(--text-muted)",
                  border: `1px solid ${selected ? "var(--color-primary-600)" : "var(--border-subtle)"}`,
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => onSave({ name, keywords, channels, isActive: initial?.isActive ?? true })}
          disabled={!canSave || saving}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
          style={{
            background: "var(--color-primary-600)",
            color: "white",
          }}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {t("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const t = useTranslations("alerts");
  const [alerts, setAlerts] = useState<CustomAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/user/alerts");
      const json = await res.json();
      if (json.data) setAlerts(json.data);
    } catch {
      // silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreate = async (data: AlertFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowForm(false);
        await fetchAlerts();
      }
    } catch {
      // silently handle create errors
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, data: AlertFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/user/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchAlerts();
      }
    } catch {
      // silently handle update errors
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (alert: CustomAlert) => {
    try {
      await fetch(`/api/user/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !alert.isActive }),
      });
      await fetchAlerts();
    } catch {
      // silently handle toggle errors
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/user/alerts/${id}`, { method: "DELETE" });
      setDeleteConfirmId(null);
      await fetchAlerts();
    } catch {
      // silently handle delete errors
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("description")}
          </p>
        </div>
        {!showForm && !editingId && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "var(--color-primary-600)",
              color: "white",
            }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{t("newAlert")}</span>
          </button>
        )}
      </div>

      {/* New Alert Form */}
      {showForm && (
        <AlertForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: "var(--text-muted)" }}
          />
        </div>
      )}

      {/* Alerts List */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) =>
            editingId === alert.id ? (
              <AlertForm
                key={alert.id}
                initial={{
                  name: alert.name,
                  keywords: alert.keywords,
                  channels: alert.channels as Channel[],
                  isActive: alert.isActive,
                }}
                onSave={(data) => handleUpdate(alert.id, data)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div
                key={alert.id}
                className="rounded-xl p-5 transition-all duration-200"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  opacity: alert.isActive ? 1 : 0.6,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="hidden shrink-0 items-center justify-center rounded-lg p-2.5 sm:flex"
                    style={{
                      background: alert.isActive
                        ? "rgb(59 130 246 / 0.1)"
                        : "var(--bg-elevated)",
                      color: alert.isActive
                        ? "var(--color-primary-400)"
                        : "var(--text-muted)",
                    }}
                  >
                    <Bell size={20} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {alert.name}
                      </h3>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: alert.isActive
                            ? "rgb(34 197 94 / 0.1)"
                            : "var(--bg-elevated)",
                          color: alert.isActive
                            ? "var(--color-success)"
                            : "var(--text-muted)",
                        }}
                      >
                        {alert.isActive ? t("active") : t("inactive")}
                      </span>
                    </div>

                    {/* Keywords */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {alert.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            background: "var(--bg-hover)",
                            color: "var(--color-primary-400)",
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>

                    {/* Channels */}
                    <div className="mt-2 flex items-center gap-3">
                      {alert.channels.map((ch) => (
                        <span
                          key={ch}
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <ChannelIcon channel={ch} />
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(alert)}
                      className="rounded-lg p-2 transition-colors"
                      style={{
                        color: alert.isActive
                          ? "var(--color-success)"
                          : "var(--text-muted)",
                      }}
                      title={alert.isActive ? t("active") : t("inactive")}
                    >
                      <Check size={16} />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingId(alert.id)}
                      className="rounded-lg p-2 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Edit3 size={16} />
                    </button>

                    {/* Delete */}
                    {deleteConfirmId === alert.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(alert.id)}
                          className="rounded-lg p-2 transition-colors"
                          style={{ color: "var(--color-error)" }}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded-lg p-2 transition-colors"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(alert.id)}
                        className="rounded-lg p-2 transition-colors"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && alerts.length === 0 && !showForm && (
        <div
          className="rounded-xl px-6 py-16 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <AlertTriangle
            size={48}
            className="mx-auto mb-4"
            style={{ color: "var(--text-muted)" }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("empty")}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {t("emptyCta")}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "var(--color-primary-600)",
              color: "white",
            }}
          >
            <Plus size={16} />
            {t("newAlert")}
          </button>
        </div>
      )}
    </div>
  );
}
