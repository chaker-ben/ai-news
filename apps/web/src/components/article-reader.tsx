"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, Square, Volume2, SkipBack, SkipForward } from "lucide-react";

interface ArticleReaderProps {
  text: string;
  locale: string;
  label: string;
}

const LOCALE_VOICE_MAP: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-SA",
};

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

export function ArticleReader({ text, locale, label }: ArticleReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
    }
    return () => {
      window.speechSynthesis?.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const trackProgress = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const estimatedDuration = (text.length / 15) * 1000 / speed; // ~15 chars/sec
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / estimatedDuration) * 100, 99);
      setProgress(pct);
    }, 200);
  }, [text, speed]);

  const handlePlay = useCallback(() => {
    if (!window.speechSynthesis) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      trackProgress();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LOCALE_VOICE_MAP[locale] || "fr-FR";
    utterance.rate = speed;
    utterance.pitch = 1;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeout(() => setProgress(0), 2000);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setProgress(0);
    trackProgress();
  }, [text, locale, speed, isPaused, trackProgress]);

  const handlePause = useCallback(() => {
    window.speechSynthesis?.pause();
    setIsPaused(true);
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  }, []);

  if (!supported || !text) return null;

  const readingTime = Math.max(1, Math.ceil(text.split(/\s+/).length / 200));

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <Volume2 size={16} style={{ color: "var(--color-primary-400)", flexShrink: 0 }} />

      <span className="text-xs font-medium" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
        {label} ({readingTime} min)
      </span>

      {/* Progress bar */}
      <div
        className="relative mx-2 h-1 flex-1 overflow-hidden rounded-full"
        style={{ background: "var(--bg-surface)" }}
      >
        <div
          className="absolute inset-y-0 start-0 rounded-full transition-all duration-200"
          style={{
            width: `${progress}%`,
            background: "var(--color-primary-500)",
          }}
        />
      </div>

      {/* Speed */}
      <button
        onClick={cycleSpeed}
        className="rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums transition-colors"
        style={{
          color: "var(--color-primary-400)",
          background: "var(--bg-surface)",
        }}
        title="Vitesse"
      >
        {speed}x
      </button>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {isPlaying ? (
          <button
            onClick={handlePause}
            className="rounded-lg p-1.5 transition-colors hover:opacity-80"
            style={{ color: "var(--color-primary-400)" }}
            aria-label="Pause"
          >
            <Pause size={16} />
          </button>
        ) : (
          <button
            onClick={handlePlay}
            className="rounded-lg p-1.5 transition-colors hover:opacity-80"
            style={{ color: "var(--color-primary-400)" }}
            aria-label="Play"
          >
            <Play size={16} />
          </button>
        )}
        {(isPlaying || isPaused) && (
          <button
            onClick={handleStop}
            className="rounded-lg p-1.5 transition-colors hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
            aria-label="Stop"
          >
            <Square size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
