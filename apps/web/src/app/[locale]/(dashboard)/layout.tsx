"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Radio,
  Settings,
  Bell,
  BarChart3,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@/i18n/routing";

const NAV_ITEMS = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "articles", href: "/articles", icon: FileText },
  { key: "sources", href: "/sources", icon: Radio },
  { key: "notifications", href: "/notifications", icon: Bell },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    const cleanPath = pathname.replace(/^\/(fr|en)/, "");
    if (href === "/") return cleanPath === "/" || cleanPath === "";
    return cleanPath.startsWith(href);
  };

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 start-0 z-50 flex w-64 flex-col
          transition-transform duration-200
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ background: "var(--bg-secondary)", borderInlineEnd: "1px solid var(--border-subtle)" }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6" style={{ borderBlockEnd: "1px solid var(--border-subtle)" }}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "var(--color-primary-600)" }}
          >
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            AI News
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-colors duration-150
                `}
                style={{
                  color: active ? "var(--color-primary-400)" : "var(--text-secondary)",
                  background: active ? "var(--bg-hover)" : "transparent",
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                {t(key)}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderBlockStart: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <BarChart3 size={14} />
            <span>AI News v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header
          className="flex h-16 items-center gap-4 px-4 lg:hidden"
          style={{ background: "var(--bg-secondary)", borderBlockEnd: "1px solid var(--border-subtle)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            AI News
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
