"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { useState, useEffect, useRef, useCallback } from "react";
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
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("landing-visible");
            observer.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    return () => observer.current?.disconnect();
  }, []);

  return useCallback((node: HTMLElement | null) => {
    if (node) observer.current?.observe(node);
  }, []);
}

/* ─────────────────────────── page ─────────────────────────── */

export default function LandingPage() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const scrolled = useScrolled();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fadeRef = useFadeIn();

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
  const plans = [
    {
      key: "free",
      price: "0",
      popular: false,
      features: ["featureSources10", "featureDigest1", "featureWhatsapp"],
    },
    {
      key: "pro",
      price: "9",
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
      price: "29",
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
        @media (prefers-reduced-motion: reduce) {
          .landing-fade {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>

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
            style={{
              position: "relative",
              maxWidth: "800px",
              marginInline: "auto",
              textAlign: "center",
            }}
          >
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
              className="landing-fade"
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
                onClick={() => scrollTo("features")}
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
                {t("hero.ctaSecondary")}
              </button>
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
          </div>
        </section>

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
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.25rem",
                      marginBlockEnd: "1.5rem",
                    }}
                  >
                    <span
                      className="ltr-nums"
                      style={{
                        fontSize: "var(--text-4xl)",
                        fontWeight: "var(--font-bold)" as unknown as number,
                        color: "var(--text-primary)",
                      }}
                    >
                      ${plan.price}
                    </span>
                    {plan.price !== "0" && (
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {t("pricing.perMonth")}
                      </span>
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
                  href="#"
                  aria-label="Twitter"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Twitter size={18} />
                </a>
                <a
                  href="#"
                  aria-label="GitHub"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Github size={18} />
                </a>
                <a
                  href="#"
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
                  { label: t("footer.about"), href: "#" },
                  { label: t("footer.blog"), href: "#" },
                  { label: t("footer.careers"), href: "#" },
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
                  { label: t("footer.privacy"), href: "#" },
                  { label: t("footer.terms"), href: "#" },
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
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.25rem 0.75rem",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--border-subtle)",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              <Sparkles size={12} style={{ color: "var(--color-primary-400)" }} />
              {t("footer.madeWith")}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ─────────────────────────── sub-components ─────────────────────────── */

function FaqItem({
  question,
  answer,
  fadeRef,
}: {
  question: string;
  answer: string;
  fadeRef: (node: HTMLElement | null) => void;
}) {
  const [open, setOpen] = useState(false);

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
        onClick={() => setOpen(!open)}
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
  links: Array<{ label: string; href?: string; onClick?: () => void }>;
}) {
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
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                cursor: "pointer",
                transition: "color var(--transition-fast)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              {link.label}
            </button>
          ) : (
            <a
              href={link.href}
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                textDecoration: "none",
                transition: "color var(--transition-fast)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              {link.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
