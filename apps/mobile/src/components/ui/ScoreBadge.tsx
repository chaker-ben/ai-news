import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing, fontSize } from "@/lib/theme";

function getScoreColor(score: number): string {
  if (score >= 9) return colors.error;
  if (score >= 7) return colors.warning;
  if (score >= 5) return colors.primary;
  return colors.textMuted;
}

export function ScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color, writingDirection: "ltr" }]}>
        {score.toFixed(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
