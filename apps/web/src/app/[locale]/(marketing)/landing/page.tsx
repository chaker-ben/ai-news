"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { LandingArticles } from "@/components/landing-articles";
import {
  Zap,
  Brain,
  MessageSquare,
  Bell,
  BarChart3,
  ArrowRight,
  Check,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Radio,
  Layers,
  Mail,
  Play,
  Star,
  Globe,
  Github,
  Twitter,
} from "lucide-react";

/* ─────────────────────────── helpers ─────────────────────────── */

function useScrolled(threshold = 20): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

function useFadeIn(): (node: HTMLElement | null) => void {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingRef = useRef<Set<HTMLElement>>(new Set());

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      pendingRef.current.forEach((el) => el.classList.add("landing-visible"));
      pendingRef.current.clear();
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("landing-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -50px 0px" },
    );
    observerRef.current = obs;

    pendingRef.current.forEach((el) => obs.observe(el));
    pendingRef.current.clear();

    const fallbackTimer = window.setTimeout(() => {
      document.querySelectorAll(".landing-fade:not(.landing-visible)").forEach((el) => {
        el.classList.add("landing-visible");
      });
    }, 1000);

    return () => {
      window.clearTimeout(fallbackTimer);
      obs.disconnect();
    };
  }, []);

  return useCallback((node: HTMLElement | null) => {
    if (!node) return;
    if (observerRef.current) {
      observerRef.current.observe(node);
    } else {
      pendingRef.current.add(node);
    }
  }, []);
}

/* ─────────────────────────── page ─────────────────────────── */

export default function LandingPage() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const isRTL = locale === "ar";
  const scrolled = useScrolled();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const fadeRef = useFadeIn();

  const locales = [
    { code: "fr" as const, label: "FR", flag: "\u{1F1EB}\u{1F1F7}" },
    { code: "en" as const, label: "EN", flag: "\u{1F1EC}\u{1F1E7}" },
    { code: "ar" as const, label: "AR", flag: "\u{1F1F8}\u{1F1E6}" },
  ];
  const currentLocale = locales.find((l) => l.code === locale) ?? locales[0];

  useEffect(() => {
    if (!langOpen) return;
    const onClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [langOpen]);

  const switchLocale = (code: "fr" | "en" | "ar") => {
    setLangOpen(false);
    setMobileMenuOpen(false);
    router.replace(pathname, { locale: code });
  };

  const [publicArticles, setPublicArticles] = useState<Array<{
    id: string;
    title: string;
    summary: string | null;
    source_type: string;
    score: number;
    published_at: string | null;
    thumbnail_url?: string | null;
  }>>([]);

  useEffect(() => {
    const workersUrl = process.env.NEXT_PUBLIC_WORKERS_API_URL || "";
    if (!workersUrl) return;
    fetch(`${workersUrl}/articles?limit=6`)
      .then((res) => res.json())
      .then((data) => {
        if (data.articles) setPublicArticles(data.articles);
      })
      .catch(() => {});
  }, []);

  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    if (!demoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDemoOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [demoOpen]);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  /* ── feature data ── */
  const features = [
    { icon: Radio, key: "aggregation" },
    { icon: Brain, key: "summaries" },
    { icon: MessageSquare, key: "delivery" },
    { icon: Layers, key: "categories" },
    { icon: Bell, key: "alerts" },
    { icon: BarChart3, key: "analytics" },
  ] as const;

  /* ── pricing data ── */
  const [billingYearly, setBillingYearly] = useState(false);

  const plans = [
    {
      key: "free",
      monthly: "0",
      yearly: "0",
      yearlyTotal: "0",
      popular: false,
      features: ["featureSources10", "featureDigest1", "featureWhatsapp"],
    },
    {
      key: "pro",
      monthly: "9",
      yearly: "7.20",
      yearlyTotal: "86",
      popular: true,
      features: [
        "featureSourcesUnlimited",
        "featureDigest3",
        "featureAllChannels",
        "featureAlerts",
        "featureAnalytics",
      ],
    },
    {
      key: "team",
      monthly: "29",
      yearly: "23.20",
      yearlyTotal: "278",
      popular: false,
      features: [
        "featureEverythingPro",
        "featureMembers5",
        "featureSharedDigests",
        "featurePrioritySupport",
        "featureApi",
      ],
    },
  ] as const;

  /* ── faq data ── */
  const faqKeys = ["sources", "scoring", "schedule", "languages", "freePlan"] as const;

  return (
    <>
      {/* ── inline styles for animations ── */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        .landing-fade {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .landing-visible {
          opacity: 1;
          transform: translateY(0);
        }
        @keyframes hero-gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @media (min-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr 1fr !important;
            text-align: start !important;
          }
          .hero-grid .hero-text-ctas {
            justify-content: flex-start !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-fade {
            opacity: 1;
            transform: none;
            transition: none;
          }
          * {
            animation: none !important;
          }
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .sr-only:focus {
          position: fixed;
          top: 0.5rem;
          inset-inline-start: 0.5rem;
          z-index: 10000;
          width: auto;
          height: auto;
          padding: 0.75rem 1.25rem;
          margin: 0;
          overflow: visible;
          clip: auto;
          white-space: normal;
          background: #3b82f6;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          border-radius: 0.5rem;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Skip to content */}
      <a href="#main-content" className="sr-only">
        {t("nav.skipToContent")}
      </a>

      <div
        style={{
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          minHeight: "100vh",
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        {/* ═══════════════════════ NAVBAR ═══════════════════════ */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            insetInline: 0,
            zIndex: 50,
            transition: "all var(--transition-base)",
            background: scrolled ? "rgba(2, 6, 23, 0.85)" : "transparent",
            backdropFilter: scrolled ? "blur(12px)" : "none",
            borderBlockEnd: scrolled
              ? "1px solid var(--border-subtle)"
              : "1px solid transparent",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              marginInline: "auto",
              paddingInline: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "4rem",
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "var(--radius-md)",
                  background:
                    "linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={16} color="#fff" />
              </div>
              <span
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--font-bold)" as unknown as number,
                  color: "var(--text-primary)",
                }}
              >
                AI News
              </span>
            </div>

            {/* Desktop links */}
            <div
              style={{
                display: "none",
                alignItems: "center",
                gap: "2rem",
              }}
              className="md:!flex"
            >
              {(["features", "pricing", "faq"] as const).map((section) => (
                <button
                  key={section}
                  onClick={() => scrollTo(section)}
                  aria-label={t(`nav.scrollTo.${section}`)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--font-medium)" as unknown as number,
                    cursor: "pointer",
                    padding: "0.25rem 0",
                    transition: "color var(--transition-fast)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-primary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                >
                  {t(`nav.${section}`)}
                </button>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div
              style={{
                display: "none",
                alignItems: "center",
                gap: "0.75rem",
              }}
              className="md:!flex"
            >
              <Link
                href="/sign-in"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-medium)" as unknown as number,
                  textDecoration: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "var(--radius-md)",
                  transition: "color var(--transition-fast)",
                }}
              >
                {t("nav.signIn")}
              </Link>

              {/* Language Switcher */}
              <div ref={langRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  aria-label={t("nav.language")}
                  aria-expanded={langOpen}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    background: "none",
                    border: "1px solid transparent",
                    borderRadius: "var(--radius-md)",
                    padding: "0.4rem 0.6rem",
                    cursor: "pointer",
                    color: "rgb(148, 163, 184)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    if (!langOpen) {
                      e.currentTarget.style.color = "rgb(148, 163, 184)";
                      e.currentTarget.style.borderColor = "transparent";
                    }
                  }}
                >
                  <Globe size={14} />
                  <span>{currentLocale.label}</span>
                  <ChevronDown
                    size={12}
                    style={{
                      transition: "transform 0.2s",
                      transform: langOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {langOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 0.5rem)",
                      insetInlineEnd: 0,
                      background: "#0f172a",
                      border: "1px solid rgba(59,130,246,0.15)",
                      borderRadius: "var(--radius-lg)",
                      padding: "0.35rem",
                      minWidth: "130px",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                      zIndex: 100,
                    }}
                  >
                    {locales.map((loc) => (
                      <button
                        key={loc.code}
                        onClick={() => switchLocale(loc.code)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          width: "100%",
                          padding: "0.5rem 0.75rem",
                          background:
                            loc.code === locale
                              ? "rgba(59,130,246,0.1)"
                              : "transparent",
                          border: "none",
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer",
                          color:
                            loc.code === locale
                              ? "#3b82f6"
                              : "rgb(148, 163, 184)",
                          fontSize: "var(--text-sm)",
                          fontWeight: loc.code === locale ? 600 : 400,
                          transition: "background 0.15s, color 0.15s",
                          textAlign: "start",
                        }}
                        onMouseEnter={(e) => {
                          if (loc.code !== locale)
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          if (loc.code !== locale)
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span style={{ fontSize: "1rem", lineHeight: 1 }}>
                          {loc.flag}
                        </span>
                        <span>{loc.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/sign-up"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))",
                  color: "#fff",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-semibold)" as unknown as number,
                  textDecoration: "none",
                  padding: "0.5rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  transition: "all var(--transition-fast)",
                  boxShadow: "var(--shadow-glow-primary)",
                }}
              >
                {t("nav.getStarted")}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                cursor: "pointer",
                padding: "0.5rem",
              }}
              className="md:!hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div
              style={{
                background: "rgba(2, 6, 23, 0.97)",
                backdropFilter: "blur(16px)",
                paddingInline: "1.5rem",
                paddingBlock: "1rem 1.5rem",
                borderBlockEnd: "1px solid var(--border-subtle)",
              }}
              className="md:!hidden"
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {(["features", "pricing", "faq"] as const).map((section) => (
                  <button
                    key={section}
                    onClick={() => scrollTo(section)}
                    aria-label={t(`nav.scrollTo.${section}`)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      fontSize: "var(--text-base)",
                      padding: "0.75rem 0",
                      textAlign: isRTL ? "right" : "left",
                      cursor: "pointer",
                    }}
                  >
                    {t(`nav.${section}`)}
                  </button>
                ))}
                <div
                  style={{
                    borderBlockStart: "1px solid var(--border-subtle)",
                    marginBlockStart: "0.5rem",
                    paddingBlockStart: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                      fontSize: "var(--text-base)",
                      padding: "0.5rem 0",
                    }}
                  >
                    {t("nav.signIn")}
                  </Link>

                  {/* Mobile Language Switcher */}
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      paddingBlock: "0.25rem",
                    }}
                  >
                    {locales.map((loc) => (
                      <button
                        key={loc.code}
                        onClick={() => switchLocale(loc.code)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.35rem",
                          padding: "0.5rem",
                          borderRadius: "var(--radius-md)",
                          border:
                            loc.code === locale
                              ? "1px solid rgba(59,130,246,0.4)"
                              : "1px solid var(--border-subtle)",
                          background:
                            loc.code === locale
                              ? "rgba(59,130,246,0.1)"
                              : "transparent",
                          color:
                            loc.code === locale
                              ? "#3b82f6"
                              : "rgb(148, 163, 184)",
                          fontSize: "var(--text-sm)",
                          fontWeight: loc.code === locale ? 600 : 400,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: "0.9rem" }}>{loc.flag}</span>
                        <span>{loc.label}</span>
                      </button>
                    ))}
                  </div>

                  <Link
                    href="/sign-up"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))",
                      color: "#fff",
                      fontWeight: "var(--font-semibold)" as unknown as number,
                      textDecoration: "none",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      textAlign: "center",
                      display: "block",
                    }}
                  >
                    {t("nav.getStarted")}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        <main id="main-content">

        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            paddingBlockStart: "8rem",
            paddingBlockEnd: "6rem",
            paddingInline: "1.5rem",
          }}
        >
          {/* Animated gradient bg */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(59, 130, 246, 0.15), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(6, 182, 212, 0.08), transparent)",
              pointerEvents: "none",
            }}
          />
          {/* Grid pattern overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
              pointerEvents: "none",
            }}
          />

          <div
            className="hero-grid"
            style={{
              position: "relative",
              maxWidth: "1100px",
              marginInline: "auto",
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "3rem",
              alignItems: "center",
            }}
          >
           <div style={{ textAlign: "center" }}>
            {/* Badge */}
            <div
              ref={fadeRef}
              className="landing-fade"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 1rem",
                borderRadius: "var(--radius-full)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                background: "rgba(59, 130, 246, 0.08)",
                marginBlockEnd: "1.5rem",
              }}
            >
              <Sparkles
                size={14}
                style={{ color: "var(--color-primary-400)" }}
              />
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--font-medium)" as unknown as number,
                  color: "var(--color-primary-300)",
                }}
              >
                {t("hero.trustBadge")}
              </span>
            </div>

            {/* Headline */}
            <h1
              ref={fadeRef}
              className="landing-fade"
              style={{
                fontSize: "var(--text-5xl)",
                fontWeight: "var(--font-bold)" as unknown as number,
                lineHeight: "var(--leading-tight)",
                marginBlockEnd: "1.5rem",
                background:
                  "linear-gradient(135deg, var(--text-primary) 0%, var(--color-primary-400) 50%, var(--color-accent-400) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("hero.headline")}
            </h1>

            {/* Subheadline */}
            <p
              ref={fadeRef}
              className="landing-fade"
              style={{
                fontSize: "var(--text-lg)",
                lineHeight: "var(--leading-relaxed)",
                color: "var(--text-secondary)",
                maxWidth: "600px",
                marginInline: "auto",
                marginBlockEnd: "2.5rem",
              }}
            >
              {t("hero.subheadline")}
            </p>

            {/* CTAs */}
            <div
              ref={fadeRef}
              className="landing-fade hero-text-ctas"
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "1rem",
              }}
            >
              <Link
                href="/sign-up"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background:
                    "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))",
                  color: "#fff",
                  fontWeight: "var(--font-semibold)" as unknown as number,
                  fontSize: "var(--text-base)",
                  textDecoration: "none",
                  padding: "0.75rem 1.75rem",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-glow-primary)",
                  transition: "all var(--transition-fast)",
                }}
              >
                {t("hero.ctaPrimary")}
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => setDemoOpen(true)}
                aria-label={t("hero.ctaSecondaryAriaLabel")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontWeight: "var(--font-medium)" as unknown as number,
                  fontSize: "var(--text-base)",
                  padding: "0.75rem 1.75rem",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-default)",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <Play size={16} />
                {t("hero.ctaSecondary")}
              </button>
            </div>
           </div>

            {/* ── Product Mockup ── */}
            <div
              ref={fadeRef}
              className="landing-fade"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <div
                style={{
                  position: "relative",
                  maxWidth: "420px",
                  width: "100%",
                }}
              >
                {/* Glow behind card */}
                <div
                  style={{
                    position: "absolute",
                    inset: "-30%",
                    background:
                      "radial-gradient(ellipse at center, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.10) 40%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(40px)",
                    pointerEvents: "none",
                  }}
                />
                {/* Floating card */}
                <div
                  style={{
                    position: "relative",
                    background: "#0f172a",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: "1rem",
                    padding: "1.25rem",
                    boxShadow:
                      "0 0 40px rgba(59,130,246,0.08), 0 20px 60px rgba(0,0,0,0.4)",
                    animation: "float 3s ease-in-out infinite",
                  }}
                >
                  {/* Card header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBlockEnd: "1rem",
                      paddingBlockEnd: "0.75rem",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-md)",
                        background:
                          "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Zap size={14} color="#fff" />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "#e2e8f0",
                          lineHeight: 1.2,
                        }}
                      >
                        AI News Digest
                      </div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "#64748b",
                        }}
                      >
                        {t("hero.mockupToday")}
                      </div>
                    </div>
                    <div
                      style={{
                        marginInlineStart: "auto",
                        fontSize: "0.6rem",
                        color: "#3b82f6",
                        background: "rgba(59,130,246,0.1)",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "var(--radius-full)",
                        fontWeight: 500,
                      }}
                    >
                      3 articles
                    </div>
                  </div>

                  {/* Digest items */}
                  {[
                    {
                      title: "GPT-5 Achieves PhD-Level Reasoning",
                      score: 97,
                      source: "Arxiv",
                      sourceColor: "#f59e0b",
                      summary:
                        "New architecture surpasses human experts on 12 graduate-level benchmarks.",
                    },
                    {
                      title: "EU AI Act Enforcement Begins",
                      score: 94,
                      source: "Reuters",
                      sourceColor: "#10b981",
                      summary:
                        "First compliance deadline impacts foundation model providers across Europe.",
                    },
                    {
                      title: "Open-Source Model Beats Claude on Code",
                      score: 91,
                      source: "HackerNews",
                      sourceColor: "#f97316",
                      summary:
                        "Community-built 70B model tops SWE-bench with novel training approach.",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.625rem",
                        background:
                          i === 0
                            ? "rgba(59,130,246,0.06)"
                            : "transparent",
                        border:
                          i === 0
                            ? "1px solid rgba(59,130,246,0.12)"
                            : "1px solid transparent",
                        marginBlockEnd: i < 2 ? "0.5rem" : 0,
                        transition: "background 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          marginBlockEnd: "0.35rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "#f1f5f9",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.title}
                        </span>
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color:
                              item.score >= 95
                                ? "#22d3ee"
                                : "#3b82f6",
                            background:
                              item.score >= 95
                                ? "rgba(34,211,238,0.1)"
                                : "rgba(59,130,246,0.1)",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "var(--radius-sm)",
                            direction: "ltr",
                          }}
                        >
                          {item.score}/100
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            color: item.sourceColor,
                            background: `${item.sourceColor}15`,
                            padding: "0.1rem 0.4rem",
                            borderRadius: "var(--radius-sm)",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {item.source}
                        </span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: "#94a3b8",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.summary}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ SOCIAL PROOF — LOGOS ═══════════════════════ */}
        <section
          style={{
            paddingBlock: "2.5rem",
            paddingInline: "1.5rem",
            borderBlock: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ maxWidth: "900px", marginInline: "auto", textAlign: "center" }}>
            <p
              ref={fadeRef}
              className="landing-fade"
              style={{
                fontSize: "var(--text-xs)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#475569",
                marginBlockEnd: "1.5rem",
                fontWeight: 500,
              }}
            >
              {t("socialProof.usedBy")}
            </p>
            <div
              ref={fadeRef}
              className="landing-fade"
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
                gap: "2rem 3rem",
              }}
            >
              {["OpenAI", "Mistral", "HuggingFace", "DeepMind", "Anthropic", "Cohere"].map(
                (name) => (
                  <span
                    key={name}
                    style={{
                      fontFamily: "var(--font-mono, ui-monospace, monospace)",
                      fontSize: "var(--text-base)",
                      fontWeight: 600,
                      color: "#334155",
                      letterSpacing: "0.02em",
                      userSelect: "none",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
                  >
                    {name}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ FEATURES ═══════════════════════ */}
        <section
          id="features"
          style={{
            paddingBlock: "5rem",
            paddingInline: "1.5rem",
          }}
        >
          <div style={{ maxWidth: "1100px", marginInline: "auto" }}>
            <div
              ref={fadeRef}
              className="landing-fade"
              style={{ textAlign: "center", marginBlockEnd: "3.5rem" }}
            >
              <h2
                style={{
                  fontSize: "var(--text-3xl)",
                  fontWeight: "var(--font-bold)" as unknown as number,
                  marginBlockEnd: "0.75rem",
                  color: "var(--text-primary)",
                }}
              >
                {t("features.title")}
              </h2>
              <p
                style={{
                  fontSize: "var(--text-base)",
                  color: "var(--text-secondary)",
                  maxWidth: "500px",
                  marginInline: "auto",
                }}
              >
                {t("features.subtitle")}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {features.map(({ icon: Icon, key }) => (
                <div
                  key={key}
                  ref={fadeRef}
                  className="landing-fade"
                  style={{
                    padding: "1.75rem",
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-secondary)",
                    transition: "all var(--transition-base)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(59, 130, 246, 0.3)";
                    e.currentTarget.style.boxShadow =
                      "var(--shadow-glow-primary)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "var(--radius-lg)",
                      background: "rgba(59, 130, 246, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBlockEnd: "1rem",
                    }}
                  >
                    <Icon
                      size={20}
                      style={{ color: "var(--color-primary-400)" }}
                    />
                  </div>
                  <h3
                    style={{
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-semibold)" as unknown as number,
                      marginBlockEnd: "0.5rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {t(`features.${key}.name`)}
                  </h3>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      lineHeight: "var(--leading-relaxed)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {t(`features.${key}.desc`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
        <section
          id="how-it-works"
          style={{
            paddingBlock: "5rem",
            paddingInline: "1.5rem",
            background: "var(--bg-secondary)",
          }}
        >
          <div style={{ maxWidth: "900px", marginInline: "auto" }}>
            <div
              ref={fadeRef}
              className="landing-fade"
              style={{ textAlign: "center", marginBlockEnd: "3.5rem" }}
            >
              <h2
                style={{
                  fontSize: "var(--text-3xl)",
                  fontWeight: "var(--font-bold)" as unknown as number,
                  marginBlockEnd: "0.75rem",
                  color: "var(--text-primary)",
                }}
              >
                {t("howItWorks.title")}
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "2rem",
              }}
            >
              {([1, 2, 3] as const).map((step) => (
                <div
                  key={step}
                  ref={fadeRef}
                  className="landing-fade"
                  style={{
                    textAlign: "center",
                    padding: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "3.5rem",
                      height: "3.5rem",
                      borderRadius: "var(--radius-full)",
                      background:
                        "linear-gradient(135deg, var(--color-primary-600), var(--color-accent-500))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginInline: "auto",
                      marginBlockEnd: "1.25rem",
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-bold)" as unknown as number,
                      color: "#fff",
                    }}
                  >
                    {step}
                  </div>
                  <h3
                    style={{
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-semibold)" as unknown as number,
                      marginBlockEnd: "0.5rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {t(`howItWorks.step${step}.title`)}
                  </h3>
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      lineHeight: "var(--leading-relaxed)",
                    }}
                  >
                    {t(`howItWorks.step${step}.desc`)}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA after steps */}
            <div
              ref={fadeRef}
              className="landing-fade"
              style={{
                textAlign: "center",
                marginBlockStart: "3rem",
              }}
            >
              <Link
                href="/sign-up"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background:
                    "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))",
                  color: "#fff",
                  fontWeight: "var(--font-semibold)" as unknown as number,
                  fontSize: "var(--text-base)",
                  textDecoration: "none",
                  padding: "0.75rem 1.75rem",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-glow-primary)",
                  transition: "all var(--transition-fast)",
                }}
              >
                {t("howItWorks.cta")}
                <ArrowRight size={16} />
              </Link>
              <p
                style={{
                  marginBlockStart: "1rem",
                  fontSize: "var(--text-sm)",
                  color: "#94a3b8",
                }}
              >
                {t("howItWorks.reassurance")}
              </p>
            </div>
          </div>
        </section>

        {/* Separator */}
        <div
          style={{
            maxWidth: "200px",
            marginInline: "auto",
            borderBlockStart: "1px solid rgba(255,255,255,0.06)",
          }}
        />

        {/* ═══════════════════════ LATEST ARTICLES ═══════════════════════ */}
        {publicArticles.length > 0 && (
          <LandingArticles
            articles={publicArticles}
            title={locale === "ar" ? "آخر الأخبار" : locale === "en" ? "Latest AI News" : "Dernières actualités IA"}
            cta={locale === "ar" ? "ابدأ مجاناً" : locale === "en" ? "Get started free" : "Commencer gratuitement"}
            locale={locale}
          />
        )}

        {/* ═══════════════════════ PRICING ═══════════════════════ */}
        <section
          id="pricing"
          style={{
            paddingBlock: "5rem",
            paddingInline: "1.5rem",
          }}
        >
          <div style={{ maxWidth: "1100px", marginInline: "auto" }}>
            <div
              ref={fadeRef}
              className="landing-fade"
              style={{ textAlign: "center", marginBlockEnd: "3.5rem" }}
            >
              <h2
                style={{
                  fontSize: "var(--text-3xl)",
                  fontWeight: "var(--font-bold)" as unknown as number,
                  marginBlockEnd: "0.75rem",
                  color: "var(--text-primary)",
                }}
              >
                {t("pricing.title")}
              </h2>
              <p
                style={{
                  fontSize: "var(--text-base)",
                  color: "var(--text-secondary)",
                }}
              >
                {t("pricing.subtitle")}
              </p>

              {/* Billing toggle */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0",
                  marginBlockStart: "1.5rem",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "var(--radius-full)",
                  padding: "0.25rem",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  onClick={() => setBillingYearly(false)}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "var(--radius-full)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    transition: "all 0.3s",
                    background: billingYearly
                      ? "transparent"
                      : "#3b82f6",
                    color: billingYearly
                      ? "var(--text-muted)"
                      : "#fff",
                  }}
                >
                  {t("pricing.toggle.monthly")}
                </button>
                <button
                  onClick={() => setBillingYearly(true)}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "var(--radius-full)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    transition: "all 0.3s",
                    background: billingYearly
                      ? "#3b82f6"
                      : "transparent",
                    color: billingYearly
                      ? "#fff"
                      : "var(--text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {t("pricing.toggle.yearly")}
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      background: "rgba(16,185,129,0.15)",
                      color: "#10b981",
                      padding: "0.1rem 0.45rem",
                      borderRadius: "var(--radius-sm)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    -20%
                  </span>
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.5rem",
                alignItems: "start",
              }}
            >
              {plans.map((plan) => (
                <div
                  key={plan.key}
                  ref={fadeRef}
                  className="landing-fade"
                  style={{
                    padding: "2rem",
                    borderRadius: "var(--radius-xl)",
                    border: plan.popular
                      ? "2px solid var(--color-primary-500)"
                      : "1px solid var(--border-subtle)",
                    background: "var(--bg-secondary)",
                    position: "relative",
                    ...(plan.popular
                      ? { boxShadow: "var(--shadow-glow-primary)" }
                      : {}),
                  }}
                >
                  {plan.popular && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-0.75rem",
                        insetInlineStart: "50%",
                        background:
                          "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))",
                        color: "#fff",
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-semibold)" as unknown as number,
                        padding: "0.25rem 1rem",
                        borderRadius: "var(--radius-full)",
                        ...(isRTL
                          ? { transform: "translateX(50%)" }
                          : { transform: "translateX(-50%)" }),
                      }}
                    >
                      {t("pricing.popular")}
                    </div>
                  )}

                  <h3
                    style={{
                      fontSize: "var(--text-xl)",
                      fontWeight: "var(--font-semibold)" as unknown as number,
                      color: "var(--text-primary)",
                      marginBlockEnd: "0.5rem",
                    }}
                  >
                    {t(`pricing.plans.${plan.key}.name`)}
                  </h3>

                  <div
                    style={{
                      marginBlockEnd: "1.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "0.25rem",
                      }}
                    >
                      <span
                        className="ltr-nums"
                        style={{
                          fontSize: "var(--text-4xl)",
                          fontWeight: "var(--font-bold)" as unknown as number,
                          color: "var(--text-primary)",
                          transition: "opacity 0.3s",
                        }}
                      >
                        ${billingYearly ? plan.yearly : plan.monthly}
                      </span>
                      {plan.monthly !== "0" && (
                        <span
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {t("pricing.perMonth")}
                        </span>
                      )}
                      {billingYearly && plan.monthly !== "0" && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            background: "rgba(16,185,129,0.15)",
                            color: "#10b981",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            marginInlineStart: "0.5rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t("pricing.toggle.save")}
                        </span>
                      )}
                    </div>
                    {billingYearly && plan.monthly !== "0" && (
                      <p
                        className="ltr-nums"
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "#64748b",
                          marginBlockStart: "0.35rem",
                          transition: "opacity 0.3s",
                        }}
                      >
                        {t("pricing.toggle.billedYearly", { total: plan.yearlyTotal })}
                      </p>
                    )}
                  </div>

                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      marginBlockEnd: "2rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    {plan.features.map((featureKey) => (
                      <li
                        key={featureKey}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          fontSize: "var(--text-sm)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Check
                          size={16}
                          style={{
                            color: "var(--color-success)",
                            flexShrink: 0,
                          }}
                        />
                        {t(`pricing.plans.${plan.key}.${featureKey}`)}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/sign-up"
                    aria-label={t(`pricing.ctaLabel.${plan.key}`)}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "var(--radius-md)",
                      fontWeight: "var(--font-semibold)" as unknown as number,
                      fontSize: "var(--text-sm)",
                      textDecoration: "none",
                      transition: "all var(--transition-fast)",
                      ...(plan.popular
                        ? {
                            background:
                              "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))",
                            color: "#fff",
                            boxShadow: "var(--shadow-glow-primary)",
                          }
                        : {
                            background: "transparent",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-default)",
                          }),
                    }}
                  >
                    {t("pricing.cta")}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ TESTIMONIALS ═══════════════════════ */}
        <section
          style={{
            paddingBlock: "5rem",
            paddingInline: "1.5rem",
            background: "var(--bg-secondary)",
          }}
        >
          <div style={{ maxWidth: "1100px", marginInline: "auto" }}>
            <div
              ref={fadeRef}
              className="landing-fade"
              style={{ textAlign: "center", marginBlockEnd: "3.5rem" }}
            >
              <h2
                style={{
                  fontSize: "var(--text-3xl)",
                  fontWeight: "var(--font-bold)" as unknown as number,
                  color: "var(--text-primary)",
                  marginBlockEnd: "1rem",
                }}
              >
                {t("testimonials.title")}
              </h2>
              <p
                style={{
                  fontSize: "var(--text-lg)",
                  color: "var(--text-secondary)",
                  maxWidth: "550px",
                  marginInline: "auto",
                }}
              >
                {t("testimonials.subtitle")}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {(
                [
                  { initials: "ML", color: "#6366f1", key: "1" },
                  { initials: "KT", color: "#0ea5e9", key: "2" },
                  { initials: "YB", color: "#8b5cf6", key: "3" },
                ] as const
              ).map((person) => (
                <div
                  key={person.key}
                  ref={fadeRef}
                  className="landing-fade"
                  style={{
                    padding: "1.75rem",
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-card)",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)";
                    e.currentTarget.style.boxShadow = "0 0 30px rgba(59,130,246,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Stars */}
                  <div
                    style={{
                      display: "flex",
                      gap: "0.15rem",
                      marginBlockEnd: "1rem",
                    }}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill="#f59e0b"
                        color="#f59e0b"
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p
                    style={{
                      fontSize: "var(--text-sm)",
                      lineHeight: "var(--leading-relaxed)",
                      color: "var(--text-secondary)",
                      marginBlockEnd: "1.25rem",
                      fontStyle: "italic",
                    }}
                  >
                    &ldquo;{t(`testimonials.${person.key}.quote`)}&rdquo;
                  </p>

                  {/* Author */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "var(--radius-full)",
                        background: person.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {person.initials}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "var(--text-sm)",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          lineHeight: 1.3,
                        }}
                      >
                        {t(`testimonials.${person.key}.name`)}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "#64748b",
                        }}
                      >
                        {t(`testimonials.${person.key}.role`)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ FAQ ═══════════════════════ */}
        <section
          id="faq"
          style={{
            paddingBlock: "5rem",
            paddingInline: "1.5rem",
            background: "var(--bg-secondary)",
          }}
        >
          <div style={{ maxWidth: "700px", marginInline: "auto" }}>
            <div
              ref={fadeRef}
              className="landing-fade"
              style={{ textAlign: "center", marginBlockEnd: "3rem" }}
            >
              <h2
                style={{
                  fontSize: "var(--text-3xl)",
                  fontWeight: "var(--font-bold)" as unknown as number,
                  color: "var(--text-primary)",
                }}
              >
                {t("faq.title")}
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {faqKeys.map((key) => (
                <FaqItem
                  key={key}
                  id={key}
                  question={t(`faq.${key}.q`)}
                  answer={t(`faq.${key}.a`)}
                  fadeRef={fadeRef}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ CTA BANNER ═══════════════════════ */}
        <section
          style={{
            paddingBlock: "5rem",
            paddingInline: "1.5rem",
          }}
        >
          <div
            ref={fadeRef}
            className="landing-fade"
            style={{
              maxWidth: "800px",
              marginInline: "auto",
              textAlign: "center",
              padding: "3rem 2rem",
              borderRadius: "var(--radius-2xl)",
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1))",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <h2
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--font-bold)" as unknown as number,
                marginBlockEnd: "1rem",
                color: "var(--text-primary)",
              }}
            >
              {t("cta.title")}
            </h2>
            <p
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-secondary)",
                marginBlockEnd: "2rem",
                maxWidth: "500px",
                marginInline: "auto",
              }}
            >
              {t("cta.subtitle")}
            </p>
            <Link
              href="/sign-up"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background:
                  "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))",
                color: "#fff",
                fontWeight: "var(--font-semibold)" as unknown as number,
                fontSize: "var(--text-base)",
                textDecoration: "none",
                padding: "0.75rem 2rem",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-glow-primary)",
                transition: "all var(--transition-fast)",
              }}
            >
              {t("hero.ctaPrimary")}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        </main>

        {/* ═══════════════════════ FOOTER ═══════════════════════ */}
        <footer
          style={{
            borderBlockStart: "1px solid var(--border-subtle)",
            paddingBlock: "3rem",
            paddingInline: "1.5rem",
          }}
        >
          <div
            style={{
              maxWidth: "1100px",
              marginInline: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "2.5rem",
            }}
          >
            {/* Brand */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBlockEnd: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "var(--radius-md)",
                    background:
                      "linear-gradient(135deg, var(--color-primary-500), var(--color-accent-500))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Zap size={14} color="#fff" />
                </div>
                <span
                  style={{
                    fontWeight: "var(--font-bold)" as unknown as number,
                    color: "var(--text-primary)",
                  }}
                >
                  AI News
                </span>
              </div>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  lineHeight: "var(--leading-relaxed)",
                  marginBlockEnd: "1.25rem",
                }}
              >
                {t("footer.tagline")}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <a
                  href="https://twitter.com/ainews"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Twitter size={18} />
                </a>
                <a
                  href="https://github.com/ainews"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Github size={18} />
                </a>
                <a
                  href="mailto:contact@ainews.app"
                  aria-label="Email"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Mail size={18} />
                </a>
              </div>
            </div>

            {/* Product links */}
            <div>
              <h4
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-semibold)" as unknown as number,
                  color: "var(--text-primary)",
                  marginBlockEnd: "1rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t("footer.product")}
              </h4>
              <FooterLinks
                links={[
                  { label: t("nav.features"), onClick: () => scrollTo("features") },
                  { label: t("nav.pricing"), onClick: () => scrollTo("pricing") },
                  { label: t("nav.faq"), onClick: () => scrollTo("faq") },
                ]}
              />
            </div>

            {/* Company links */}
            <div>
              <h4
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-semibold)" as unknown as number,
                  color: "var(--text-primary)",
                  marginBlockEnd: "1rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t("footer.company")}
              </h4>
              <FooterLinks
                links={[
                  { label: t("footer.about"), href: "/about" },
                  { label: t("footer.blog"), href: "/blog" },
                  { label: t("footer.careers"), href: "/careers" },
                ]}
              />
            </div>

            {/* Legal links */}
            <div>
              <h4
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-semibold)" as unknown as number,
                  color: "var(--text-primary)",
                  marginBlockEnd: "1rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t("footer.legal")}
              </h4>
              <FooterLinks
                links={[
                  { label: t("footer.privacy"), href: "/privacy" },
                  { label: t("footer.terms"), href: "/terms" },
                ]}
              />
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              maxWidth: "1100px",
              marginInline: "auto",
              marginBlockStart: "2.5rem",
              paddingBlockStart: "1.5rem",
              borderBlockStart: "1px solid var(--border-subtle)",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              {t("footer.copyright")}
            </p>
          </div>
        </footer>
      </div>

      {/* ── Demo Video Modal ── */}
      {demoOpen &&
        createPortal(
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- ESC handled in useEffect
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("hero.ctaSecondaryAriaLabel")}
            onClick={() => setDemoOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(4px)",
              padding: "1.5rem",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "900px",
                aspectRatio: "16 / 9",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                boxShadow: "0 0 60px rgba(59, 130, 246, 0.15)",
              }}
            >
              <button
                onClick={() => setDemoOpen(false)}
                aria-label="Close"
                style={{
                  position: "absolute",
                  top: "0.75rem",
                  insetInlineEnd: "0.75rem",
                  zIndex: 1,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(0, 0, 0, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
                title={t("hero.ctaSecondaryAriaLabel")}
                allow="autoplay; encrypted-media"
                allowFullScreen
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ─────────────────────────── sub-components ─────────────────────────── */

function FaqItem({
  question,
  answer,
  id,
  fadeRef,
}: Readonly<{
  question: string;
  answer: string;
  id: string;
  fadeRef: (node: HTMLElement | null) => void;
}>) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${id}`;
  const triggerId = `faq-trigger-${id}`;

  return (
    <div
      ref={fadeRef}
      className="landing-fade"
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      <button
        id={triggerId}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "1.25rem 1.5rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "start",
        }}
      >
        <span
          style={{
            fontSize: "var(--text-base)",
            fontWeight: "var(--font-medium)" as unknown as number,
            color: "var(--text-primary)",
          }}
        >
          {question}
        </span>
        <ChevronDown
          size={18}
          style={{
            color: "var(--text-muted)",
            transition: "transform var(--transition-base)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!open}
        style={{
          maxHeight: open ? "300px" : "0",
          overflow: "hidden",
          transition: "max-height var(--transition-slow)",
        }}
      >
        <p
          style={{
            padding: "0 1.5rem 1.25rem",
            fontSize: "var(--text-sm)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--text-secondary)",
          }}
        >
          {answer}
        </p>
      </div>
    </div>
  );
}

function FooterLinks({
  links,
}: {
  links: ReadonlyArray<{ label: string; href?: string; onClick?: () => void }>;
}) {
  const linkStyle: React.CSSProperties = {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    textDecoration: "none",
    cursor: "pointer",
    transition: "color var(--transition-fast)",
  };
  const onEnter = (e: React.MouseEvent<HTMLElement>) =>
    (e.currentTarget.style.color = "var(--text-secondary)");
  const onLeave = (e: React.MouseEvent<HTMLElement>) =>
    (e.currentTarget.style.color = "var(--text-muted)");

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {links.map((link) => (
        <li key={link.label}>
          {link.onClick ? (
            <button
              onClick={link.onClick}
              style={{ ...linkStyle, background: "none", border: "none", padding: 0 }}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              {link.label}
            </button>
          ) : link.href?.startsWith("/") ? (
            <Link
              href={link.href}
              style={linkStyle}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              {link.label}
            </Link>
          ) : (
            <a
              href={link.href}
              style={linkStyle}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              {link.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
