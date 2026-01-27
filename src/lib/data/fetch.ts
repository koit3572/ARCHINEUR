// src/lib/data/fetch.ts
"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TableKey, Tables } from "./types";
import { getSnapshot } from "./cache";
import { withTimeout, TIMEOUTS } from "./timeout";
import { requireUserId } from "./auth";

/* =========================
   Fetch helpers
========================= */
export async function fetchTable<K extends TableKey>(
  supabase: SupabaseClient,
  key: K,
  opts?: { userId?: string | null },
): Promise<Tables[K]> {
  // ✅ (핵심) 실패 시 []로 덮지 말고 "현재 캐시 유지"
  // ✅ (핵심) refreshAll에서 userId=null(비로그인)일 때 user 테이블이 requireUserId로 throw 안 나게 보호
  const cur = getSnapshot();

  try {
    if (key === "roots") {
      const { data, error } = await withTimeout(
        supabase
          .from("roots")
          .select("id,title,description,created_at")
          .order("created_at", { ascending: true }),
        TIMEOUTS.read,
        "fetch.roots",
      );

      if (error || !data) return cur.roots as Tables[K];
      return data as unknown as Tables[K];
    }

    if (key === "folders") {
      const { data, error } = await withTimeout(
        supabase
          .from("folders")
          .select("id,root_id,name,parent_id,order,created_at")
          .order("created_at", { ascending: true }),
        TIMEOUTS.read,
        "fetch.folders",
      );

      if (error || !data) return cur.folders as Tables[K];
      return data as unknown as Tables[K];
    }

    if (key === "notes") {
      const { data, error } = await withTimeout(
        supabase
          .from("notes")
          // ✅ root 직속 노트 표시에 필수: root_id
          .select("id,root_id,folder_id,title,content,created_at")
          .order("created_at", { ascending: true }),
        TIMEOUTS.read,
        "fetch.notes",
      );

      if (error || !data) return cur.notes as Tables[K];
      return data as unknown as Tables[K];
    }

    // ✅ NOTE: favorites/recents/progress/drafts는 user_id 필터링
    // ✅ opts.userId가 "명시적으로 null"이면 (비로그인) => 빈 배열 반환 (throw X)
    const userIdOpt = opts?.userId;
    if (userIdOpt === null) return [] as Tables[K];

    const userId =
      typeof userIdOpt === "string" ? userIdOpt : await requireUserId(supabase);

    if (key === "note_favorites") {
      const { data, error } = await withTimeout(
        supabase
          .from("note_favorites")
          .select("id,user_id,note_id,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        TIMEOUTS.read,
        "fetch.note_favorites",
      );

      if (error || !data) return cur.note_favorites as Tables[K];
      return data as unknown as Tables[K];
    }

    // ✅ user_folder_favorites: (중요) id 컬럼 없음 / created_at도 없을 수 있음
    if (key === "user_folder_favorites") {
      const { data, error } = await withTimeout(
        supabase
          .from("user_folder_favorites")
          // ✅ id 제거 (스키마에 없음)
          .select("user_id,folder_id,created_at")
          .eq("user_id", userId)
          // ✅ created_at이 실제로 있으면 OK, 없으면 여기서 400이 날 수 있으니 안전하게 제거/대체
          // .order("created_at", { ascending: false }),
          .order("folder_id", { ascending: true }),
        TIMEOUTS.read,
        "fetch.user_folder_favorites",
      );

      if (error || !data) return cur.user_folder_favorites as Tables[K];
      return data as unknown as Tables[K];
    }

    // ✅ user_root_favorites: (중요) id 컬럼 없음
    if (key === "user_root_favorites") {
      const { data, error } = await withTimeout(
        supabase
          .from("user_root_favorites")
          // ✅ id 제거 (스키마에 없음)
          .select("user_id,root_id,created_at")
          .eq("user_id", userId)
          // ✅ created_at이 있으면 정렬 유지 가능
          .order("created_at", { ascending: false }),
        TIMEOUTS.read,
        "fetch.user_root_favorites",
      );

      if (error || !data) return cur.user_root_favorites as Tables[K];
      return data as unknown as Tables[K];
    }

    if (key === "note_recents") {
      const { data, error } = await withTimeout(
        supabase
          .from("note_recents")
          .select("id,user_id,note_id,last_opened_at,created_at,updated_at")
          .eq("user_id", userId)
          .order("last_opened_at", { ascending: false }),
        TIMEOUTS.read,
        "fetch.note_recents",
      );

      if (error || !data) return cur.note_recents as Tables[K];
      return data as unknown as Tables[K];
    }

    if (key === "note_drafts") {
      const { data, error } = await withTimeout(
        supabase
          .from("note_drafts")
          .select("id,user_id,scope,content,created_at,updated_at")
          .eq("user_id", userId)
          .eq("scope", "notes/new")
          .order("updated_at", { ascending: false }),
        TIMEOUTS.read,
        "fetch.note_drafts",
      );

      if (error || !data) return cur.note_drafts as Tables[K];
      return data as unknown as Tables[K];
    }

    // note_progress
    {
      const { data, error } = await withTimeout(
        supabase
          .from("note_progress")
          .select(
            "id,user_id,note_id,tokens_total,tokens_filled,tokens_correct,created_at,updated_at",
          )
          .eq("user_id", userId)
          .order("updated_at", { ascending: false }),
        TIMEOUTS.read,
        "fetch.note_progress",
      );

      if (error || !data) return cur.note_progress as Tables[K];
      return data as unknown as Tables[K];
    }
  } catch (e) {
    // ✅ TIMEOUT/네트워크 실패 시 캐시 유지
    console.error("[db.fetchTable] failed:", key, e);
    return cur[key] as Tables[K];
  }
}
