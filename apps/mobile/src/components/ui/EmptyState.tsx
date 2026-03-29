import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, fontSize, radius } from "@/lib/theme";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    color: colors.textSecondary,
    fontSize: fontSize.xl,
    fontWeight: "500",
    marginTop: spacing.lg,
    textAlign: "center",
  },
  description: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  buttonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
});
