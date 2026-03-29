import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Zap, Crown, Users, Building, Check } from "@/lib/icons";
import { apiClient, type BillingPlan, type Subscription } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";

const PLAN_ICONS: Record<string, typeof Zap> = {
  free: Zap,
  pro: Crown,
  team: Users,
  enterprise: Building,
};

const FALLBACK_PLANS: BillingPlan[] = [
  { id: "1", slug: "free", name: "Free", price: 0, yearlyPrice: null, currency: "USD", features: ["10 articles/day", "Email digest", "1 alert"], isActive: true, sortOrder: 0, trialDays: null },
  { id: "2", slug: "pro", name: "Pro", price: 19, yearlyPrice: 190, currency: "USD", features: ["Unlimited articles", "All channels", "20 alerts", "Analytics", "Priority support"], isActive: true, sortOrder: 1, trialDays: 14 },
  { id: "3", slug: "team", name: "Team", price: 49, yearlyPrice: 490, currency: "USD", features: ["Everything in Pro", "Team management", "Shared alerts", "API access", "Custom sources"], isActive: true, sortOrder: 2, trialDays: 14 },
  { id: "4", slug: "enterprise", name: "Enterprise", price: 0, yearlyPrice: null, currency: "USD", features: ["Everything in Team", "Dedicated support", "SLA", "Custom integrations", "On-premise option"], isActive: true, sortOrder: 3, trialDays: null },
];

export default function PricingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [plans, setPlans] = useState<BillingPlan[]>(FALLBACK_PLANS);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [plansRes, subRes] = await Promise.all([
          apiClient.getPlans().catch(() => ({ data: FALLBACK_PLANS })),
          apiClient.getSubscription().catch(() => null),
        ]);
        if (plansRes.data.length > 0) setPlans(plansRes.data);
        if (subRes?.data) setSubscription(subRes.data);
      } catch {
        // use fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currentPlan = subscription?.plan || "free";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("pricing.title")}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Billing Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, billingCycle === "monthly" && styles.toggleBtnActive]}
            onPress={() => setBillingCycle("monthly")}
          >
            <Text style={[styles.toggleText, billingCycle === "monthly" && styles.toggleTextActive]}>
              {t("pricing.monthly")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, billingCycle === "yearly" && styles.toggleBtnActive]}
            onPress={() => setBillingCycle("yearly")}
          >
            <Text style={[styles.toggleText, billingCycle === "yearly" && styles.toggleTextActive]}>
              {t("pricing.yearly")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        {plans
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((plan) => {
            const Icon = PLAN_ICONS[plan.slug] || Zap;
            const isCurrent = currentPlan === plan.slug;
            const isPopular = plan.slug === "pro";
            const price = billingCycle === "yearly" && plan.yearlyPrice
              ? plan.yearlyPrice
              : plan.price;
            const monthlyEquivalent = billingCycle === "yearly" && plan.yearlyPrice
              ? (plan.yearlyPrice / 12).toFixed(0)
              : null;
            const savingsPercent = plan.yearlyPrice && plan.price > 0
              ? Math.round((1 - plan.yearlyPrice / (plan.price * 12)) * 100)
              : 0;

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  isCurrent && styles.planCardCurrent,
                  isPopular && !isCurrent && styles.planCardPopular,
                ]}
              >
                {isPopular ? (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>{t("pricing.popular")}</Text>
                  </View>
                ) : null}

                <View style={styles.planHeader}>
                  <View style={[styles.planIcon, { backgroundColor: `${colors.primary}20` }]}>
                    <Icon size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.planName}>{plan.name}</Text>
                </View>

                {plan.price > 0 ? (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceValue, { writingDirection: "ltr" }]}>
                      ${price}
                    </Text>
                    <Text style={styles.pricePeriod}>
                      {billingCycle === "yearly" ? t("pricing.perYear") : t("pricing.perMonth")}
                    </Text>
                    {monthlyEquivalent ? (
                      <Text style={[styles.monthlyEquiv, { writingDirection: "ltr" }]}>
                        (${monthlyEquivalent}{t("pricing.perMonth")})
                      </Text>
                    ) : null}
                  </View>
                ) : plan.slug === "enterprise" ? (
                  <Text style={styles.contactPrice}>{t("pricing.contactUs")}</Text>
                ) : (
                  <Text style={styles.freePrice}>{t("pricing.free")}</Text>
                )}

                {savingsPercent > 0 && billingCycle === "yearly" ? (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>
                      {t("pricing.savePercent", { percent: savingsPercent })}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.featuresList}>
                  {plan.features.map((feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <Check size={14} color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.planBtn,
                    isCurrent && styles.planBtnCurrent,
                    plan.slug === "enterprise" && styles.planBtnEnterprise,
                  ]}
                  disabled={isCurrent}
                >
                  <Text
                    style={[
                      styles.planBtnText,
                      isCurrent && styles.planBtnTextCurrent,
                    ]}
                  >
                    {isCurrent
                      ? t("pricing.currentPlan")
                      : plan.slug === "enterprise"
                        ? t("pricing.contactUs")
                        : t("pricing.upgrade")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: { padding: spacing.sm, borderRadius: radius.md, width: 38 },
  headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "600" },
  content: { padding: spacing.lg, paddingBottom: 40 },
  toggleRow: {
    flexDirection: "row", backgroundColor: colors.surfaceLight,
    borderRadius: radius.lg, padding: 4, marginBottom: spacing.xl,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { color: colors.textMuted, fontSize: fontSize.base, fontWeight: "500" },
  toggleTextActive: { color: "#fff" },
  planCard: {
    backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  planCardCurrent: { borderColor: colors.primary, borderWidth: 2 },
  planCardPopular: { borderColor: colors.primaryDark, borderWidth: 2 },
  popularBadge: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    alignSelf: "flex-start", marginBottom: spacing.sm,
  },
  popularText: { color: "#fff", fontSize: fontSize.xs, fontWeight: "600" },
  planHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  planIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  planName: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs, marginBottom: spacing.sm },
  priceValue: { color: colors.text, fontSize: fontSize.title, fontWeight: "700" },
  pricePeriod: { color: colors.textMuted, fontSize: fontSize.md },
  monthlyEquiv: { color: colors.textMuted, fontSize: fontSize.sm },
  freePrice: { color: colors.success, fontSize: fontSize.heading, fontWeight: "700", marginBottom: spacing.sm },
  contactPrice: { color: colors.primary, fontSize: fontSize.lg, fontWeight: "600", marginBottom: spacing.sm },
  savingsBadge: {
    backgroundColor: `${colors.success}20`, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    alignSelf: "flex-start", marginBottom: spacing.md,
  },
  savingsText: { color: colors.success, fontSize: fontSize.xs, fontWeight: "600" },
  featuresList: { gap: spacing.sm, marginBottom: spacing.lg },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  featureText: { color: colors.textSecondary, fontSize: fontSize.md, flex: 1 },
  planBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    padding: spacing.md, alignItems: "center",
  },
  planBtnCurrent: { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  planBtnEnterprise: { backgroundColor: colors.surface },
  planBtnText: { color: "#fff", fontSize: fontSize.base, fontWeight: "600" },
  planBtnTextCurrent: { color: colors.textMuted },
});
