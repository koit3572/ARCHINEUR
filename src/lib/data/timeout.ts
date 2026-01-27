"use client";

/* =========================
   Timeout / Resilience
========================= */
export class TimeoutError extends Error {
  name = "TimeoutError";
  constructor(message: string) {
    super(message);
  }
}

/**
 * ⚠️ 주의
 * - 이 timeout은 "요청을 중단(abort)"하지 않는다.
 * - 실제 abort는 supabase client의 fetchWithTimeout이 담당한다.
 * - 따라서 이 값은 FETCH_TIMEOUT_MS(20s)보다 반드시 커야 한다.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label = "request",
): Promise<T> {
  let t: any;

  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new TimeoutError(`TIMEOUT:${label}`)), ms);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    clearTimeout(t);
  });
}

/**
 * ✅ 기준 원칙
 * - fetch abort: 20s (client.ts)
 * - withTimeout: 그보다 길게 → "좀비 요청" 방지
 * - write는 비교적 빠르게 실패시켜도 OK
 */
export const TIMEOUTS = {
  read: 30_000, // ⬅️ auth / fetch read
  refresh: 35_000, // ⬅️ refreshAll / refreshTables
  write: 20_000, // ⬅️ insert / update / delete
};
