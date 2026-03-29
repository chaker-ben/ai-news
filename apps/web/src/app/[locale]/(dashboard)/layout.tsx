"use client";

import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FileText,
  FileEdit,
  PenLine,
  Radio,
  Settings,
  Bell,
  Bookmark,
  Menu,
  Zap,
  Crown,
  BarChart3,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";

interface NavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: number | null;
}

interface NavSection {
  id: string;
  items: NavItem[];
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showVersionTooltip, setShowVersionTooltip] = useState(false);

  // Placeholder until wired to the notifications API
  const pendingNotifications = 3;

  const navSections: NavSection[] = [
    {
      id: "main",
      items: [
        { key: "dashboard", href: "/", icon: LayoutDashboard },
        { key: "articles", href: "/articles", icon: FileText },
        { key: "myArticles", href: "/articles/my", icon: FileEdit },
        { key: "newArticle", href: "/articles/new", icon: PenLine },
        { key: "sources", href: "/sources", icon: Radio },
      ],
    },
    {
      id: "engage",
      items: [
        { key: "alerts", href: "/alerts", icon: Bell },
        { key: "bookmarks", href: "/bookmarks", icon: Bookmark },
        {
          key: "notifications",
          href: "/notifications",
          icon: Bell,
          badge: pendingNotifications > 0 ? pendingNotifications : null,
        },
      ],
    },
    {
      id: "insights",
      items: [
        { key: "analytics", href: "/analytics", icon: BarChart3 },
      ],
    },
    {
      id: "account",
      items: [
        { key: "team", href: "/team", icon: Users },
        { key: "pricing", href: "/pricing", icon: Crown },
        { key: "settings", href: "/settings", icon: Settings },
      ],
    },
  ];

  const isActive = useCallback(
    (href: string) => {
      const cleanPath = pathname.replace(/^\/(fr|en|ar)/, "");
      if (href === "/") return cleanPath === "/" || cleanPath === "";
      return cleanPath.startsWith(href);
    },
    [pathname],
  );

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Mobile overlay */}
      <button
        type="button"
        className={`
          fixed inset-0 z-40 cursor-default transition-opacity duration-200 lg:hidden
          ${sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
        `}
        style={{ background: "rgb(0 0 0 / 0.5)" }}
        onClick={() => setSidebarOpen(false)}
        aria-label={tCommon("close")}
        tabIndex={sidebarOpen ? 0 : -1}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 z-50 flex w-64 flex-col
          transition-transform duration-200 ease-out
          lg:static lg:translate-x-0!
          ${sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full")}
        `}
        style={{
          background: "var(--bg-secondary)",
          borderInlineEnd: "1px solid var(--border-subtle)",
          ...(isRTL ? { right: 0 } : { left: 0 }),
        }}
      >
        {/* Logo + mobile close */}
        <div
          className="flex h-16 items-center justify-between px-6"
          style={{ borderBlockEnd: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            {/* Logo with version tooltip */}
            <div
              className="relative"
              onMouseEnter={() => setShowVersionTooltip(true)}
              onMouseLeave={() => setShowVersionTooltip(false)}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: "var(--color-primary-600)" }}
              >
                <Zap size={20} className="text-white" />
              </div>
              {showVersionTooltip && (
                <div
                  className="pointer-events-none absolute start-full top-1/2 z-50 ms-2 -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-lg"
                  style={{
                    background: "var(--bg-elevated, #1e293b)",
                    color: "var(--text-primary, #f1f5f9)",
                    border: "1px solid var(--border-default, #334155)",
                  }}
                >
                  AI News v0.1.0
                </div>
              )}
            </div>
            <span
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {tCommon("appName")}
            </span>
          </div>

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 transition-colors lg:hidden"
            style={{ color: "var(--text-muted)" }}
            aria-label={tCommon("close")}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navSections.map((section, sectionIdx) => (
            <div key={section.id}>
              {sectionIdx > 0 && (
                <div
                  className="mx-3 my-2"
                  style={{
                    height: "1px",
                    background: "var(--border-subtle)",
                  }}
                />
              )}
              <div className="space-y-1">
                {section.items.map(({ key, href, icon: Icon, badge }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={key}
                      href={href}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out"
                      style={{
                        color: active
                          ? "var(--color-primary-400)"
                          : "var(--text-secondary)",
                        background: active ? "var(--bg-hover)" : "transparent",
                        transform: "translateX(0)",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.transform = isRTL
                            ? "translateX(-4px)"
                            : "translateX(4px)";
                          e.currentTarget.style.background = "var(--bg-hover)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <Icon size={20} />
                      <span className="flex-1">{t(key)}</span>
                      {badge != null && (
                        <span
                          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none text-white"
                          style={{ background: "var(--color-error, #ef4444)" }}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-6 py-4"
          style={{ borderBlockStart: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header
          className="flex h-16 items-center gap-4 px-4 lg:hidden"
          style={{
            background: "var(--bg-secondary)",
            borderBlockEnd: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <Menu size={24} />
          </button>
          <span
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {tCommon("appName")}
          </span>
          <div className="ms-auto">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
