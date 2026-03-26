"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Crown,
  Shield,
  User,
  Building2,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Link } from "@/i18n/routing";

interface OrganizationMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  ownerId: string;
  plan: string;
  role: string;
  memberCount: number;
  members: OrganizationMember[];
}

function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case "owner":
      return <Crown size={14} />;
    case "admin":
      return <Shield size={14} />;
    default:
      return <User size={14} />;
  }
}

function roleBadgeStyle(role: string): React.CSSProperties {
  switch (role) {
    case "owner":
      return {
        background: "rgba(234, 179, 8, 0.15)",
        color: "rgb(234, 179, 8)",
      };
    case "admin":
      return {
        background: "rgba(59, 130, 246, 0.15)",
        color: "rgb(96, 165, 250)",
      };
    default:
      return {
        background: "var(--bg-hover)",
        color: "var(--text-secondary)",
      };
  }
}

export default function TeamPage() {
  const t = useTranslations("team");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations");
      const json = await res.json() as { data?: Organization[] };
      if (json.data) {
        setOrgs(json.data);
      }
    } catch {
      // silent fail on fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrgs();
  }, [fetchOrgs]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug }),
      });

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setCreateError(json.error ?? "Failed to create organization");
        return;
      }

      setNewOrgName("");
      setNewOrgSlug("");
      setShowCreateForm(false);
      await fetchOrgs();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (orgId: string) => {
    setInviting(true);
    setInviteError(null);

    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setInviteError(json.error ?? "Failed to invite member");
        return;
      }

      setInviteEmail("");
      setInviteRole("member");
      await fetchOrgs();
    } catch {
      setInviteError("Network error");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (orgId: string, memberId: string) => {
    if (!confirm(t("removeConfirm"))) return;
    setRemovingId(memberId);

    try {
      await fetch(`/api/organizations/${orgId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      await fetchOrgs();
    } catch {
      // silent fail
    } finally {
      setRemovingId(null);
    }
  };

  const currentOrg = orgs[0] ?? null;
  const canManage =
    currentOrg && ["owner", "admin"].includes(currentOrg.role);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--color-primary-400)" }}
        />
      </div>
    );
  }

  // No org + needs upgrade
  if (orgs.length === 0 && !showCreateForm) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1
          className="mb-8 text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>

        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "var(--bg-hover)" }}
          >
            <Building2
              size={32}
              style={{ color: "var(--text-muted)" }}
            />
          </div>
          <h2
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("noOrg")}
          </h2>
          <p
            className="mb-6 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            {t("noOrgDesc")}
          </p>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
              style={{ background: "var(--color-primary-600)" }}
            >
              <Plus size={18} />
              {t("createOrg")}
            </button>

            <div
              className="mt-4 rounded-lg p-4"
              style={{
                background: "rgba(234, 179, 8, 0.08)",
                border: "1px solid rgba(234, 179, 8, 0.2)",
              }}
            >
              <p
                className="mb-1 text-sm font-medium"
                style={{ color: "rgb(234, 179, 8)" }}
              >
                {t("upgradeRequired")}
              </p>
              <p
                className="mb-3 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {t("upgradeDesc")}
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-sm font-medium"
                style={{ color: "var(--color-primary-400)" }}
              >
                {t("upgradeCta")}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create org form
  if (showCreateForm && orgs.length === 0) {
    return (
      <div className="mx-auto max-w-lg">
        <h1
          className="mb-8 text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          {t("createOrg")}
        </h1>

        <form
          onSubmit={(e) => void handleCreateOrg(e)}
          className="space-y-4 rounded-xl p-6"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("orgName")}
            </label>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => {
                setNewOrgName(e.target.value);
                setNewOrgSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
              }}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("orgSlug")}
            </label>
            <input
              type="text"
              value={newOrgSlug}
              onChange={(e) =>
                setNewOrgSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, ""),
                )
              }
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
              required
              minLength={2}
              maxLength={50}
              pattern="^[a-z0-9-]+$"
            />
          </div>

          {createError && (
            <p className="text-sm" style={{ color: "rgb(239, 68, 68)" }}>
              {createError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                background: "var(--bg-hover)",
                color: "var(--text-secondary)",
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--color-primary-600)" }}
            >
              {creating && <Loader2 size={16} className="animate-spin" />}
              {t("createOrg")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Main team view with org
  return (
    <div className="mx-auto max-w-3xl">
      <h1
        className="mb-8 text-2xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        {t("title")}
      </h1>

      {currentOrg && (
        <div className="space-y-6">
          {/* Org info card */}
          <div
            className="flex items-center gap-4 rounded-xl p-5"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ background: "var(--color-primary-600)" }}
            >
              <Building2 size={24} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {currentOrg.name}
              </h2>
              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                {currentOrg.memberCount} {t("members")} &middot;{" "}
                <span className="capitalize">{currentOrg.plan}</span>
              </p>
            </div>
          </div>

          {/* Members list */}
          <div
            className="rounded-xl"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderBlockEnd: "1px solid var(--border-subtle)",
              }}
            >
              <h3
                className="flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                <Users size={18} />
                {t("members")} ({currentOrg.members.length})
              </h3>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {currentOrg.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  {member.user.imageUrl ? (
                    <img
                      src={member.user.imageUrl}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ background: "var(--bg-hover)" }}
                    >
                      <User
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p
                      className="truncate text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {member.user.email}
                    </p>
                  </div>

                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={roleBadgeStyle(member.role)}
                  >
                    <RoleIcon role={member.role} />
                    {t(member.role as "owner" | "admin" | "member")}
                  </span>

                  {canManage && member.role !== "owner" && (
                    <button
                      onClick={() =>
                        void handleRemoveMember(
                          currentOrg.id,
                          member.id,
                        )
                      }
                      disabled={removingId === member.id}
                      className="rounded-lg p-1.5 transition-colors hover:bg-red-500/10"
                      style={{ color: "var(--text-muted)" }}
                      title={t("remove")}
                    >
                      {removingId === member.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite form */}
          {canManage && (
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <h3
                className="mb-4 flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                <Plus size={18} />
                {t("inviteMember")}
              </h3>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("email")}
                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />

                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "admin" | "member")
                  }
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="member">{t("member")}</option>
                  <option value="admin">{t("admin")}</option>
                </select>

                <button
                  onClick={() => void handleInvite(currentOrg.id)}
                  disabled={inviting || !inviteEmail}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--color-primary-600)" }}
                >
                  {inviting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  {t("invite")}
                </button>
              </div>

              {inviteError && (
                <p
                  className="mt-2 text-sm"
                  style={{ color: "rgb(239, 68, 68)" }}
                >
                  {inviteError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
