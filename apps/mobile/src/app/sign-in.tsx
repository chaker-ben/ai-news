import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useTranslation } from "react-i18next";
import { Zap, ExternalLink } from "@/lib/icons";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000";

export default function SignInScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Zap size={24} color="#fff" />
        </View>
        <Text style={styles.logoText}>AI News</Text>
      </View>

      <Text style={styles.title}>{t("common.signIn")}</Text>
      <Text style={styles.subtitle}>
        Sign in via the web app to access your personalized feed.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => Linking.openURL(`${WEB_URL}/fr/sign-in`)}
      >
        <ExternalLink size={18} color="#fff" />
        <Text style={styles.buttonText}>{t("common.signIn")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    gap: spacing.md,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: colors.text, fontSize: fontSize.heading, fontWeight: "700" },
  title: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: "700",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    textAlign: "center",
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonText: { color: "#fff", fontSize: fontSize.xl, fontWeight: "600" },
});
