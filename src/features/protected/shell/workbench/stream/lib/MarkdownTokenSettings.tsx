"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ScreamMode } from "./types";
import { createClient } from "@/lib/supabase/client";

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

const DEFAULT_HIDDEN_PERCENT = 70;

// ✅ 새로고침/재로그인 플리커 방지용 캐시 키
const LS_LAST = "archineur.md_token.hidden_percent.last";
const LS_USER = (uid: string) => `archineur.md_token.hidden_percent.${uid}`;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readInt(key: string): number | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function writeInt(key: string, v: number) {
  if (!isBrowser()) return;
  localStorage.setItem(key, String(v));
}

type SettingsRow = {
  user_id: string;
  hidden_percent: number;
};

export function MarkdownTokenSettingsProvider({
  mode,
  initialHiddenPercent = DEFAULT_HIDDEN_PERCENT,
  children,
}: {
  mode: ScreamMode;
  initialHiddenPercent?: number;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);

  // ✅ 최초 렌더부터 70이 아닌 "마지막 값"으로 시작(플리커 방지)
  const [hiddenPercent, setHiddenPercentState] = useState<number>(() => {
    const cachedLast = readInt(LS_LAST);
    if (typeof cachedLast === "number") {
      return clampPercent(Math.round(cachedLast));
    }
    return clampPercent(Math.round(initialHiddenPercent));
  });

  const userIdRef = useRef<string | null>(null);
  const userEditedRef = useRef(false);

  const saveTimerRef = useRef<number | null>(null);
  const latestToSaveRef = useRef<number>(hiddenPercent);

  const applyLocalCacheForUser = (uid: string) => {
    const cachedUser = readInt(LS_USER(uid));
    if (typeof cachedUser === "number" && !userEditedRef.current) {
      const v = clampPercent(Math.round(cachedUser));
      setHiddenPercentState(v);
      latestToSaveRef.current = v;
      // last도 동기화
      writeInt(LS_LAST, v);
    }
  };

  const loadForUser = async (uid: string) => {
    const { data, error } = await supabase
      .from("user_markdown_token_settings")
      .select("user_id, hidden_percent")
      .eq("user_id", uid)
      .maybeSingle<SettingsRow>();

    if (error) {
      console.error("[md-token] load error:", error);
      return;
    }

    const next = clampPercent(
      Math.round(
        typeof data?.hidden_percent === "number"
          ? data.hidden_percent
          : DEFAULT_HIDDEN_PERCENT,
      ),
    );

    // 로딩 도중 사용자가 만졌으면 덮어쓰지 않음
    if (!userEditedRef.current) {
      setHiddenPercentState(next);
      latestToSaveRef.current = next;
    }

    // ✅ 로컬 캐시 갱신(다음 새로고침부터 처음부터 이 값으로 뜸)
    writeInt(LS_LAST, next);
    writeInt(LS_USER(uid), next);

    // row 없으면 기본값 심기
    if (!data) {
      const { error: upsertErr } = await supabase
        .from("user_markdown_token_settings")
        .upsert(
          { user_id: uid, hidden_percent: next },
          { onConflict: "user_id" },
        );

      if (upsertErr) {
        console.error("[md-token] seed upsert error:", upsertErr);
      }
    }
  };

  const flushSave = async () => {
    const uid = userIdRef.current;
    if (!uid) return;

    const v = latestToSaveRef.current;

    const { error } = await supabase
      .from("user_markdown_token_settings")
      .upsert({ user_id: uid, hidden_percent: v }, { onConflict: "user_id" });

    if (error) console.error("[md-token] flush upsert error:", error);
  };

  const scheduleSave = (next: number) => {
    latestToSaveRef.current = next;

    // ✅ 즉시 로컬 캐시에 써서 새로고침 플리커 제거
    writeInt(LS_LAST, next);
    const uid = userIdRef.current;
    if (uid) writeInt(LS_USER(uid), next);

    if (!uid) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveTimerRef.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from("user_markdown_token_settings")
        .upsert(
          { user_id: uid, hidden_percent: next },
          { onConflict: "user_id" },
        );

      if (error) console.error("[md-token] upsert error:", error);
    }, 350);
  };

  // ✅ 핵심: 세션 준비/로그인 완료 시점 대응 + 유저별 캐시 선적용
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;

      if (!mounted) return;

      userIdRef.current = uid;

      if (uid) {
        // 1) DB보다 먼저 유저 캐시로 UI를 즉시 맞춤 (플리커 제거)
        applyLocalCacheForUser(uid);
        // 2) DB 동기화
        await loadForUser(uid);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const uid = session?.user?.id ?? null;
        userIdRef.current = uid;

        if (!mounted) return;

        if (uid) {
          userEditedRef.current = false;
          applyLocalCacheForUser(uid);
          await loadForUser(uid);
        }
      },
    );

    return () => {
      mounted = false;

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        void flushSave();
      }

      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // 인스턴스별 안정 seed
  const rid = useId();

  const value = useMemo<MarkdownTokenSettings>(() => {
    const seed = `md-token:${rid}`;

    const effectiveHiddenPercent =
      mode === "note" ? 0 : mode === "exam" ? 100 : hiddenPercent;

    return {
      mode,
      hiddenPercent,
      setHiddenPercent: (v) => {
        const next = clampPercent(Math.round(v));
        userEditedRef.current = true;
        setHiddenPercentState(next);
        scheduleSave(next);
      },
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
      "useMarkdownTokenSettings must be used within MarkdownTokenSettingsProvider",
    );
  }
  return ctx;
}
