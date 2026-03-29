import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bell,
  Plus,
  X,
  Check,
  Trash2,
  Mail,
  MessageCircle,
  Send,
} from "@/lib/icons";
import { apiClient, type CustomAlert } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { KeywordPill } from "@/components/ui/KeywordPill";
import { EmptyState } from "@/components/ui/EmptyState";

const CHANNELS = [
  { key: "email", icon: Mail, label: "alerts.email" },
  { key: "whatsapp", icon: MessageCircle, label: "alerts.whatsapp" },
  { key: "telegram", icon: Send, label: "alerts.telegram" },
] as const;

function AlertForm({
  onSave,
  onCancel,
  initial,
}: {
  onSave: (data: { name: string; keywords: string[]; channels: string[] }) => void;
  onCancel: () => void;
  initial?: { name: string; keywords: string[]; channels: string[] };
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || "");
  const [keywords, setKeywords] = useState<string[]>(initial?.keywords || []);
  const [channels, setChannels] = useState<string[]>(initial?.channels || ["email"]);
  const [keywordInput, setKeywordInput] = useState("");

  const addKeyword = useCallback(() => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw) && keywords.length < 20) {
      setKeywords((prev) => [...prev, kw]);
      setKeywordInput("");
    }
  }, [keywordInput, keywords]);

  const toggleChannel = useCallback((ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }, []);

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={t("alerts.namePlaceholder")}
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.formLabel}>{t("alerts.keywords")}</Text>
      <View style={styles.keywordInput}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={keywordInput}
          onChangeText={setKeywordInput}
          placeholder={t("alerts.keywordPlaceholder")}
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={addKeyword}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addKeyword}>
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      {keywords.length > 0 ? (
        <View style={styles.keywordsRow}>
          {keywords.map((kw) => (
            <KeywordPill
              key={kw}
              keyword={kw}
              onRemove={() => setKeywords((prev) => prev.filter((k) => k !== kw))}
            />
          ))}
        </View>
      ) : null}

      <Text style={styles.formLabel}>{t("alerts.channels")}</Text>
      <View style={styles.channelsRow}>
        {CHANNELS.map(({ key, icon: Icon, label }) => {
          const selected = channels.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.channelBtn, selected && styles.channelBtnActive]}
              onPress={() => toggleChannel(key)}
            >
              <Icon size={16} color={selected ? colors.primary : colors.textMuted} />
              <Text style={[styles.channelText, selected && { color: colors.primary }]}>
                {t(label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, (!name || keywords.length === 0 || channels.length === 0) && styles.saveBtnDisabled]}
          onPress={() => onSave({ name, keywords, channels })}
          disabled={!name || keywords.length === 0 || channels.length === 0}
        >
          <Text style={styles.saveBtnText}>{t("common.save")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AlertsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [alerts, setAlerts] = useState<CustomAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiClient.getAlerts();
      setAlerts(res.data);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreate = useCallback(
    async (data: { name: string; keywords: string[]; channels: string[] }) => {
      setSaving(true);
      try {
        const res = await apiClient.createAlert(data);
        setAlerts((prev) => [res.data, ...prev]);
        setShowForm(false);
      } catch (error) {
        console.error("Create alert error:", error);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const handleUpdate = useCallback(
    async (id: string, data: { name: string; keywords: string[]; channels: string[] }) => {
      setSaving(true);
      try {
        const res = await apiClient.updateAlert(id, data);
        setAlerts((prev) => prev.map((a) => (a.id === id ? res.data : a)));
        setEditingId(null);
      } catch (error) {
        console.error("Update alert error:", error);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const handleToggle = useCallback(async (alert: CustomAlert) => {
    try {
      const res = await apiClient.updateAlert(alert.id, { isActive: !alert.isActive });
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? res.data : a)));
    } catch (error) {
      console.error("Toggle alert error:", error);
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(t("alerts.deleteConfirm"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.deleteAlert(id);
            setAlerts((prev) => prev.filter((a) => a.id !== id));
          } catch (error) {
            console.error("Delete alert error:", error);
          }
        },
      },
    ]);
  }, [t]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("alerts.title")}</Text>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          style={styles.headerBtn}
        >
          <Plus size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAlerts(); }} tintColor={colors.primary} />
        }
      >
        {/* Create Form */}
        {showForm ? (
          <AlertForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        ) : null}

        {/* Alert List */}
        {alerts.length === 0 && !showForm ? (
          <EmptyState
            icon={<Bell size={48} color={colors.textMuted} />}
            title={t("alerts.empty")}
            description={t("alerts.emptyDesc")}
            actionLabel={t("alerts.create")}
            onAction={() => setShowForm(true)}
          />
        ) : (
          alerts.map((alert) =>
            editingId === alert.id ? (
              <AlertForm
                key={alert.id}
                initial={{ name: alert.name, keywords: alert.keywords, channels: alert.channels }}
                onSave={(data) => handleUpdate(alert.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertTitleRow}>
                    <Bell
                      size={16}
                      color={alert.isActive ? colors.success : colors.textMuted}
                    />
                    <Text style={styles.alertName}>{alert.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.statusBadge,
                      { backgroundColor: alert.isActive ? `${colors.success}20` : `${colors.textMuted}20` },
                    ]}
                    onPress={() => handleToggle(alert)}
                  >
                    <Text
                      style={{
                        color: alert.isActive ? colors.success : colors.textMuted,
                        fontSize: fontSize.xs,
                        fontWeight: "600",
                      }}
                    >
                      {alert.isActive ? t("alerts.active") : t("alerts.inactive")}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.keywordsRow}>
                  {alert.keywords.map((kw) => (
                    <KeywordPill key={kw} keyword={kw} />
                  ))}
                </View>

                <View style={styles.channelsRow}>
                  {alert.channels.map((ch) => {
                    const channel = CHANNELS.find((c) => c.key === ch);
                    if (!channel) return null;
                    const Icon = channel.icon;
                    return (
                      <View key={ch} style={styles.channelTag}>
                        <Icon size={12} color={colors.textSecondary} />
                        <Text style={styles.channelTagText}>{t(channel.label)}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.alertActions}>
                  <TouchableOpacity onPress={() => setEditingId(alert.id)} style={styles.actionBtn}>
                    <Text style={styles.editText}>{t("common.edit")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(alert.id)} style={styles.actionBtn}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ),
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
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
  headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "600" },
  content: { padding: spacing.lg },
  form: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  formLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: "600", marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keywordInput: { flexDirection: "row", gap: spacing.sm },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  keywordsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  channelsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  channelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  channelBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  channelText: { color: colors.textMuted, fontSize: fontSize.sm },
  formActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: fontSize.base },
  saveBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: fontSize.base, fontWeight: "600" },
  alertCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  alertName: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600" },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  channelTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  channelTagText: { color: colors.textSecondary, fontSize: fontSize.xs },
  alertActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.md },
  actionBtn: { padding: spacing.sm },
  editText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "500" },
});
