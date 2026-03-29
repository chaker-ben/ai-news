import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Send, Sparkles, Lock } from "@/lib/icons";
import {
  apiClient,
  type ChatMessage,
  type ChatUsage,
  type ChatConversation,
} from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

export default function ArticleChatScreen() {
  const { articleId, articleTitle } = useLocalSearchParams<{
    articleId: string;
    articleTitle: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList<DisplayMessage>>(null);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null,
  );
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function init() {
      if (!articleId) return;
      try {
        const [usageRes, convRes] = await Promise.all([
          apiClient.getChatUsage(),
          apiClient.createConversation(articleId),
        ]);
        setUsage(usageRes.data);
        setConversation(convRes.data);

        const messagesRes = await apiClient.getMessages(convRes.data.id, {
          take: 50,
        });
        setMessages(
          messagesRes.data.map((m: ChatMessage) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        );
      } catch (error) {
        console.error("Failed to init chat:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [articleId]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !conversation || sending) return;

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    const userMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    scrollToEnd();

    const assistantId = `assistant-${Date.now()}`;
    const streamingMessage: DisplayMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, streamingMessage]);
    scrollToEnd();

    try {
      const reader = await apiClient.sendMessage(conversation.id, text);
      if (!reader) {
        setSending(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as {
              type: string;
              text?: string;
            };
            if (data.type === "text" && data.text) {
              assistantText += data.text;
              const currentText = assistantText;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: currentText }
                    : m,
                ),
              );
              scrollToEnd();
            }
          } catch {
            // skip malformed SSE chunks
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m,
        ),
      );

      // Refresh usage after sending
      try {
        const usageRes = await apiClient.getChatUsage();
        setUsage(usageRes.data);
      } catch {
        // non-critical
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: t("chat.sendError"),
                isStreaming: false,
              }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  }, [inputText, conversation, sending, scrollToEnd, t]);

  const renderMessage = useCallback(
    ({ item }: { item: DisplayMessage }) => {
      const isUser = item.role === "user";
      return (
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {item.content}
            {item.isStreaming ? "\u258C" : ""}
          </Text>
        </View>
      );
    },
    [],
  );

  const truncatedTitle =
    articleTitle && articleTitle.length > 40
      ? `${articleTitle.slice(0, 40)}...`
      : articleTitle;

  const canChat = usage?.can_chat !== false;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {truncatedTitle ?? t("chat.title")}
          </Text>
        </View>
        {usage ? (
          <View style={styles.creditsBadge}>
            <Text style={[styles.creditsText, { writingDirection: "ltr" }]}>
              {usage.messages_today}/{usage.messages_limit}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Upgrade banner */}
      {!canChat ? (
        <View style={styles.upgradeBanner}>
          <Lock size={16} color={colors.warning} />
          <Text style={styles.upgradeBannerText}>
            {t("chat.limitReached")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/pricing")}
            style={styles.upgradeBtn}
          >
            <Text style={styles.upgradeBtnText}>{t("common.upgrade")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Sparkles size={48} color={colors.primaryLight} />
          <Text style={styles.emptyTitle}>{t("chat.emptyTitle")}</Text>
          <Text style={styles.emptyDesc}>{t("chat.emptyDesc")}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToEnd}
        />
      )}

      {/* Input area */}
      {canChat ? (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t("chat.inputPlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            accessibilityLabel={t("chat.send")}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  creditsBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  creditsText: {
    color: colors.primaryLight,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  upgradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.warning}15`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.warning}30`,
  },
  upgradeBannerText: {
    flex: 1,
    color: colors.warning,
    fontSize: fontSize.sm,
  },
  upgradeBtn: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  upgradeBtnText: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: "600",
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyDesc: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    textAlign: "center",
    lineHeight: 22,
  },
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    marginBottom: spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderBottomEndRadius: radius.sm,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceLight,
    borderBottomStartRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#fff",
  },
  assistantMessageText: {
    color: colors.text,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: fontSize.base,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
