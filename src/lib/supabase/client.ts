// src/lib/supabase/client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/* =========================
   fetch 보험: timeout + 1회 재시도
   - "무한 pending"을 구조적으로 끊어냄
   - TIMEOUT이면 한 번만 재시도 후 throw
========================= */
const FETCH_TIMEOUT_MS = 20000; // ✅ 20초(원하면 25~30초로)
const RETRY_ONCE = true;

class TimeoutError extends Error {
  constructor() {
    super("TIMEOUT:fetch");
    this.name = "TimeoutError";
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();

  // init.signal이 이미 있으면 같이 abort 되게 연결
  const outerSignal = init?.signal;
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else
      outerSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
  }

  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new TimeoutError();
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function fetchWithTimeoutAndRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    return await fetchWithTimeout(input, init);
  } catch (e: any) {
    // ✅ timeout이면 1회만 재시도
    if (RETRY_ONCE && e?.name === "TimeoutError") {
      return await fetchWithTimeout(input, init);
    }
    throw e;
  }
}

export function createClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  client = createBrowserClient(url, key, {
    global: {
      // ✅ 핵심: supabase 내부 요청이 전부 이 fetch를 사용
      fetch: fetchWithTimeoutAndRetry,
    },
    auth: {
      // 기본값이어도 되지만 명시해두면 안정적
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}
