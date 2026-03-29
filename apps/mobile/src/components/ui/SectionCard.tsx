import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}

export function SectionCard({ title, icon, children, style }: SectionCardProps) {
  return (
    <View style={[styles.container, style]}>
      {title ? (
        <View style={styles.header}>
          {icon}
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

interface SettingsRowProps {
  icon?: ReactNode;
  label: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
}

export function SettingsRow({ icon, label, value, right }: SettingsRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowStart}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {right || (value ? <Text style={styles.rowValue}>{value}</Text> : null)}
    </View>
  );
}

export function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  rowStart: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  rowLabel: {
    color: colors.text,
    fontSize: fontSize.base,
    flex: 1,
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
});
