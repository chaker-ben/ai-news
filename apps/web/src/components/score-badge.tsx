"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

type ScoreLevel = "urgent" | "important" | "medium" | "low";

function getScoreLevel(score: number): ScoreLevel {
  if (score >= 9) return "urgent";
  if (score >= 7) return "important";
  if (score >= 5) return "medium";
  return "low";
}

const scoreStyles: Record<ScoreLevel, { color: string; bg: string; border: string }> = {
  urgent: {
    color: "var(--color-error, #dc2626)",
    bg: "rgb(239 68 68 / 0.1)",
    border: "rgb(239 68 68 / 0.25)",
  },
  important: {
    color: "var(--color-warning, #d97706)",
    bg: "rgb(245 158 11 / 0.1)",
    border: "rgb(245 158 11 / 0.25)",
  },
  medium: {
    color: "var(--color-primary-500, #3b82f6)",
    bg: "rgb(59 130 246 / 0.1)",
    border: "rgb(59 130 246 / 0.25)",
  },
  low: {
    color: "var(--color-neutral-500, #6b7280)",
    bg: "var(--bg-elevated, rgb(107 114 128 / 0.1))",
    border: "rgb(107 114 128 / 0.2)",
  },
};

function Tooltip({
  children,
  content,
}: Readonly<{
  children: React.ReactElement;
  content: string;
}>) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    if (visible) updatePosition();
  }, [visible, updatePosition]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        {children}
      </span>
      {visible &&
        position &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="pointer-events-none fixed z-50 max-w-xs rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg"
            style={{
              top: position.top,
              left: position.left,
              transform: "translate(-50%, -100%)",
              background: "var(--bg-elevated, #1e293b)",
              color: "var(--text-primary, #f1f5f9)",
              border: "1px solid var(--border-default, #334155)",
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

export function ScoreBadge({ score }: Readonly<{ score: number }>) {
  const t = useTranslations("articles");
  const level = getScoreLevel(score);
  const style = scoreStyles[level];

  return (
    <Tooltip content={t("scoreTooltip")}>
      <span
        className="inline-flex cursor-help items-center rounded-full px-2.5 py-1 text-xs font-bold ltr-nums"
        style={{
          color: style.color,
          background: style.bg,
          border: `1px solid ${style.border}`,
        }}
        aria-label={t("scoreAriaLabel", { score: score.toFixed(1) })}
      >
        {score.toFixed(1)}
      </span>
    </Tooltip>
  );
}

export function ScoreBadgeServer({ score }: Readonly<{ score: number }>) {
  const level = getScoreLevel(score);
  const style = scoreStyles[level];

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ltr-nums"
      style={{
        color: style.color,
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      {score.toFixed(1)}
    </span>
  );
}

export function ScoreLegend() {
  const t = useTranslations("articles");

  const levels: Array<{ key: ScoreLevel; labelKey: string; range: string }> = [
    { key: "urgent", labelKey: "scoreLegendUrgent", range: "9-10" },
    { key: "important", labelKey: "scoreLegendImportant", range: "7-8.9" },
    { key: "medium", labelKey: "scoreLegendMedium", range: "5-6.9" },
    { key: "low", labelKey: "scoreLegendLow", range: "< 5" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {levels.map(({ key, labelKey, range }) => {
        const style = scoreStyles[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: style.color }}
            />
            <span
              className="text-xs ltr-nums"
              style={{ color: "var(--text-muted)" }}
            >
              {range} {t(labelKey)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
