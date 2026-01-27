"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/* =========================
   Auth helper
========================= */

/**
 * ✅ 반드시 로그인되어 있어야 하는 경우
 * - fetch timeout / retry는 client.ts에서 처리됨
 */
export async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user?.id) throw new Error("NOT_AUTHENTICATED");

  return user.id;
}

/**
 * ✅ refreshAll / refreshTables 용
 * - 비로그인이면 null
 * - timeout / 네트워크 에러여도 null (throw X)
 */
export async function getUserIdIfAny(
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) return null;
    return user?.id ?? null;
  } catch {
    return null;
  }
}
