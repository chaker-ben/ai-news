import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import Constants from "expo-constants";
import { Globe, User, Zap, ExternalLink } from "lucide-react-native";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000";

function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={label}
    >
      <View style={styles.rowStart}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const handleOpenWebSettings = useCallback(() => {
    Linking.openURL(`${WEB_URL}/fr/settings`);
  }, []);

  const handleOpenWebSignIn = useCallback(() => {
    Linking.openURL(`${WEB_URL}/fr/sign-in`);
  }, []);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile placeholder */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <User size={28} color={colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>AI News</Text>
          <Text style={styles.profileEmail}>Sign in via web for full access</Text>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon={<Globe size={18} color={colors.textSecondary} />}
            label="Sign In (Web)"
            value="Open browser"
            onPress={handleOpenWebSignIn}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon={<Zap size={18} color={colors.warning} />}
            label="Full Settings"
            value="Open browser"
            onPress={handleOpenWebSettings}
          />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon={<ExternalLink size={18} color={colors.textSecondary} />}
            label="Version"
            value={`v${appVersion}`}
          />
        </View>
      </View>

      <Text style={styles.versionText}>AI News v{appVersion}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  profileCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: { color: colors.text, fontSize: fontSize.xl, fontWeight: "600" },
  profileEmail: { color: colors.textMuted, fontSize: fontSize.md, marginTop: 2 },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginStart: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  rowStart: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowLabel: { color: colors.text, fontSize: fontSize.base },
  rowValue: { color: colors.textMuted, fontSize: fontSize.md },
  separator: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  versionText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
});
