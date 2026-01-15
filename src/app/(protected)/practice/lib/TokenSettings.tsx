"use client";

import React, {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import type { PracticeMode } from "../types";

type TokenSettings = {
  mode: PracticeMode;

  /** 0~100 (feed에서 "문제(가림)" 비율) */
  hiddenPercent: number;
  setHiddenPercent: (v: number) => void;

  /** mode에 따른 실제 적용값
   * - note: 0 (전부 일반 텍스트)
   * - exam: 100 (전부 문제 가림)
   * - feed: hiddenPercent
   */
  effectiveHiddenPercent: number;

  /** 안정적 분포를 위한 seed */
  seed: string;
};

const TokenSettingsContext = createContext<TokenSettings | null>(null);

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
  // 0..1
  return (h >>> 0) / 4294967295;
}

export function TokenSettingsProvider({
  mode,
  children,
}: {
  mode: PracticeMode;
  children: React.ReactNode;
}) {
  const [hiddenPercent, setHiddenPercentState] = useState<number>(70);
  const rid = useId();

  const value = useMemo<TokenSettings>(() => {
    const seed = `token:${rid}`;

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
    <TokenSettingsContext.Provider value={value}>
      {children}
    </TokenSettingsContext.Provider>
  );
}

export function useTokenSettings() {
  const ctx = useContext(TokenSettingsContext);
  if (!ctx) {
    throw new Error(
      "useTokenSettings must be used within TokenSettingsProvider"
    );
  }
  return ctx;
}
