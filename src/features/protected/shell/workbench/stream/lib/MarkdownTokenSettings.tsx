"use client";

import React, {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import type { ScreamMode } from "./types";

type MarkdownTokenSettings = {
  mode: ScreamMode;

  /** 0~100 : feed에서 "문제(가림)" 비율 */
  hiddenPercent: number;
  setHiddenPercent: (v: number) => void;

  /** mode에 따른 실제 적용값
   * - note: 0
   * - exam: 100
   * - feed: hiddenPercent
   */
  effectiveHiddenPercent: number;

  /** 안정적 분포를 위한 seed */
  seed: string;
};

const MarkdownTokenSettingsContext =
  createContext<MarkdownTokenSettings | null>(null);

function clampPercent(v: number) {
  return Math.max(0, Math.min(100, v));
}

/** 안정적 랜덤 (0~1) */
export function hashToUnit(seed: string): number {
  // FNV-1a (32-bit)
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function MarkdownTokenSettingsProvider({
  mode,
  initialHiddenPercent = 70,
  children,
}: {
  mode: ScreamMode;
  initialHiddenPercent?: number;
  children: React.ReactNode;
}) {
  const [hiddenPercent, setHiddenPercentState] = useState<number>(
    clampPercent(initialHiddenPercent)
  );

  // 컴포넌트 인스턴스별 안정 seed
  const rid = useId();

  const value = useMemo<MarkdownTokenSettings>(() => {
    const seed = `md-token:${rid}`;

    const effectiveHiddenPercent =
      mode === "note" ? 0 : mode === "exam" ? 100 : hiddenPercent;

    return {
      mode,
      hiddenPercent,
      setHiddenPercent: (v) => setHiddenPercentState(clampPercent(v)),
      effectiveHiddenPercent,
      seed,
    };
  }, [mode, hiddenPercent, rid]);

  return (
    <MarkdownTokenSettingsContext.Provider value={value}>
      {children}
    </MarkdownTokenSettingsContext.Provider>
  );
}

export function useMarkdownTokenSettings() {
  const ctx = useContext(MarkdownTokenSettingsContext);
  if (!ctx) {
    throw new Error(
      "useMarkdownTokenSettings must be used within MarkdownTokenSettingsProvider"
    );
  }
  return ctx;
}
