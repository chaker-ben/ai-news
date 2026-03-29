import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import type { ReactNode } from "react";

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: string;
  color?: string;
  trend?: number;
}

export function StatCard({
  icon,
  label,
  value,
  color = colors.primary,
  trend,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={[styles.value, { color, writingDirection: "ltr" }]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
      {trend !== undefined && trend !== 0 ? (
        <Text
          style={[
            styles.trend,
            { color: trend > 0 ? colors.success : colors.error, writingDirection: "ltr" },
          ]}
        >
          {trend > 0 ? "+" : ""}
          {trend.toFixed(0)}%
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: fontSize.heading,
    fontWeight: "700",
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  trend: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    marginTop: 2,
  },
});
