import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Users, Crown, Shield, User, Plus, Trash2, Building } from "@/lib/icons";
import { apiClient, type Organization, type OrganizationMember } from "@/lib/api";
import { colors, spacing, radius, fontSize } from "@/lib/theme";
import { EmptyState } from "@/components/ui/EmptyState";

const ROLES = ["admin", "member"] as const;

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { color: string; icon: typeof Crown }> = {
    owner: { color: colors.warning, icon: Crown },
    admin: { color: colors.primary, icon: Shield },
    member: { color: colors.textMuted, icon: User },
  };
  const { color, icon: Icon } = config[role] || config.member;

  return (
    <View style={[styles.roleBadge, { backgroundColor: `${color}20` }]}>
      <Icon size={12} color={color} />
      <Text style={[styles.roleBadgeText, { color }]}>{role}</Text>
    </View>
  );
}

export default function TeamScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.getOrganizations();
        setOrgs(res.data);
      } catch (error) {
        console.error("Failed to load orgs:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateOrg = useCallback(async () => {
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      const slug = newOrgSlug || newOrgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const res = await apiClient.createOrganization({ name: newOrgName, slug });
      setOrgs((prev) => [...prev, res.data]);
      setShowCreateForm(false);
      setNewOrgName("");
      setNewOrgSlug("");
    } catch (error) {
      console.error("Create org error:", error);
    } finally {
      setCreating(false);
    }
  }, [newOrgName, newOrgSlug]);

  const handleInvite = useCallback(async (orgId: string) => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await apiClient.inviteMember(orgId, { email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      // Refresh org
      const res = await apiClient.getOrganizations();
      setOrgs(res.data);
    } catch (error) {
      console.error("Invite error:", error);
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, inviteRole]);

  const handleRemoveMember = useCallback((orgId: string, member: OrganizationMember) => {
    Alert.alert(t("team.removeConfirm"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.confirm"),
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.removeMember(orgId, member.id);
            setOrgs((prev) =>
              prev.map((o) =>
                o.id === orgId
                  ? { ...o, members: o.members.filter((m) => m.id !== member.id) }
                  : o,
              ),
            );
          } catch (error) {
            console.error("Remove member error:", error);
          }
        },
      },
    ]);
  }, [t]);

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
        <Text style={styles.headerTitle}>{t("team.title")}</Text>
        <TouchableOpacity onPress={() => setShowCreateForm(!showCreateForm)} style={styles.headerBtn}>
          <Plus size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Create Org Form */}
        {showCreateForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t("team.createOrg")}</Text>
            <TextInput
              style={styles.input}
              value={newOrgName}
              onChangeText={(text) => {
                setNewOrgName(text);
                setNewOrgSlug(text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder={t("team.orgName")}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={newOrgSlug}
              onChangeText={setNewOrgSlug}
              placeholder={t("team.orgSlug")}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateForm(false)}>
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreateOrg}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t("common.create")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Orgs */}
        {orgs.length === 0 && !showCreateForm ? (
          <EmptyState
            icon={<Building size={48} color={colors.textMuted} />}
            title={t("team.empty")}
            description={t("team.emptyDesc")}
            actionLabel={t("team.createOrg")}
            onAction={() => setShowCreateForm(true)}
          />
        ) : (
          orgs.map((org) => (
            <View key={org.id} style={styles.orgCard}>
              {/* Org Header */}
              <View style={styles.orgHeader}>
                <View style={styles.orgIcon}>
                  <Building size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgName}>{org.name}</Text>
                  <Text style={styles.orgMeta}>
                    {org.memberCount} {t("team.members")} · {org.plan}
                  </Text>
                </View>
                <RoleBadge role={org.role} />
              </View>

              {/* Members */}
              <Text style={styles.sectionLabel}>{t("team.members")}</Text>
              {org.members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  {member.imageUrl ? (
                    <Image source={{ uri: member.imageUrl }} style={styles.memberAvatar} />
                  ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                      <User size={16} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {member.firstName} {member.lastName}
                    </Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  </View>
                  <RoleBadge role={member.role} />
                  {(org.role === "owner" || org.role === "admin") && member.role !== "owner" ? (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(org.id, member)}
                      style={{ padding: spacing.xs }}
                    >
                      <Trash2 size={16} color={colors.error} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}

              {/* Invite */}
              {org.role === "owner" || org.role === "admin" ? (
                <View style={styles.inviteSection}>
                  <Text style={styles.sectionLabel}>{t("team.inviteMember")}</Text>
                  <View style={styles.inviteRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      placeholder={t("team.emailPlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <View style={styles.roleToggle}>
                      {ROLES.map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[styles.roleBtn, inviteRole === r && styles.roleBtnActive]}
                          onPress={() => setInviteRole(r)}
                        >
                          <Text
                            style={[styles.roleBtnText, inviteRole === r && { color: colors.primary }]}
                          >
                            {r}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, inviting && { opacity: 0.6 }]}
                    onPress={() => handleInvite(org.id)}
                    disabled={inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>{t("team.invite")}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))
        )}
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
  headerBtn: { padding: spacing.sm, borderRadius: radius.md },
  headerTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "600" },
  content: { padding: spacing.lg },
  formCard: {
    backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.primary, marginBottom: spacing.lg, gap: spacing.md,
  },
  formTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    color: colors.text, fontSize: fontSize.base, borderWidth: 1, borderColor: colors.border,
  },
  formActions: { flexDirection: "row", gap: spacing.md },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  cancelText: { color: colors.textSecondary, fontSize: fontSize.base },
  primaryBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: fontSize.base, fontWeight: "600" },
  orgCard: {
    backgroundColor: colors.surfaceLight, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, gap: spacing.md,
  },
  orgHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  orgIcon: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: `${colors.primary}20`,
    alignItems: "center", justifyContent: "center",
  },
  orgName: { color: colors.text, fontSize: fontSize.lg, fontWeight: "600" },
  orgMeta: { color: colors.textMuted, fontSize: fontSize.sm },
  sectionLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  memberRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.sm, borderRadius: radius.md,
  },
  memberAvatar: { width: 36, height: 36, borderRadius: 18 },
  memberAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  memberName: { color: colors.text, fontSize: fontSize.base, fontWeight: "500" },
  memberEmail: { color: colors.textMuted, fontSize: fontSize.sm },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full,
  },
  roleBadgeText: { fontSize: fontSize.xs, fontWeight: "600" },
  inviteSection: { gap: spacing.md, marginTop: spacing.sm },
  inviteRow: { gap: spacing.sm },
  roleToggle: { flexDirection: "row", gap: spacing.sm },
  roleBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  roleBtnActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  roleBtnText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "500" },
});
