import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { X } from "@/lib/icons";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

interface KeywordPillProps {
  keyword: string;
  onRemove?: () => void;
  color?: string;
}

export function KeywordPill({
  keyword,
  onRemove,
  color = colors.primary,
}: KeywordPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}20` }]}>
      <Text style={[styles.text, { color }]}>{keyword}</Text>
      {onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={12} color={color} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
});
