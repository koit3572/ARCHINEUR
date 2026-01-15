"use client";

import React, { createContext, useContext, useId, useMemo } from "react";
import type { PracticeMode } from "@/app/(protected)/practice/types";

type PracticeSettings = {
  mode: PracticeMode;
  /** 0~1 (feed에서 conditionToken을 "문제(가림)"로 만들 비율) */
  problemRatio: number;
  /** 토큰 선택을 안정적으로 만들기 위한 seed */
  seed: number;
};

const PracticeSettingsContext = createContext<PracticeSettings | null>(null);

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** useId 문자열을 숫자 seed로 바꿔서 "렌더 중 impure 호출"을 없앰 */
function hashStringToSeed(str: string) {
  // FNV-1a (32-bit)
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // uint32
}

export function PracticeSettingsProvider({
  mode,
  problemRatio,
  children,
}: {
  mode: PracticeMode;
  problemRatio: number;
  children: React.ReactNode;
}) {
  const rid = useId();

  const seed = useMemo(() => hashStringToSeed(rid), [rid]);

  const value = useMemo<PracticeSettings>(() => {
    return {
      mode,
      problemRatio: clamp01(problemRatio),
      seed,
    };
  }, [mode, problemRatio, seed]);

  return (
    <PracticeSettingsContext.Provider value={value}>
      {children}
    </PracticeSettingsContext.Provider>
  );
}

export function usePracticeSettings() {
  return useContext(PracticeSettingsContext);
}
