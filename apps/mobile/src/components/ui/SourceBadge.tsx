import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, fontSize } from "@/lib/theme";

export const SOURCE_COLORS: Record<string, string> = {
  blog: colors.primary,
  twitter: colors.info,
  youtube: colors.error,
  reddit: colors.warning,
  arxiv: colors.purple,
};

export function SourceBadge({ type }: { type: string }) {
  const color = SOURCE_COLORS[type] || colors.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.text, { color }]}>{type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: "500",
  },
});
