"use client";

import type {
  DraftPayload,
  FolderFavoriteRow,
  FolderRow,
  NoteDraftRow,
  NoteFavoriteRow,
  NoteProgressRow,
  NoteRecentRow,
  NoteRow,
  RootFavoriteRow,
  RootRow,
  TableKey,
  Tables,
} from "./types";

import { createClient } from "@/lib/supabase/client";
import { bump, getSnapshot, setCache } from "./cache";
import { withTimeout, TIMEOUTS } from "./timeout";
import { getUserIdIfAny, requireUserId } from "./auth";
import { fetchTable } from "./fetch";
import {
  cascadeDeleteNotes,
  chunk,
  deleteByIds,
  getDescendantFolderIds,
  getNoteIdsInFolder,
} from "./cascade";

/* =========================
   Supabase Client (singleton)
========================= */
export const supabase = createClient();

/* =========================
   Debug helpers
========================= */
function dumpPostgrestError(tag: string, err: any) {
  try {
    // 원본 객체 그대로
    console.error(tag, err);

    // 흔한 필드들
    console.error(tag + " fields", {
      message: err?.message,
      details: err?.details,
      hint: err?.hint,
      code: err?.code,
      status: err?.status,
      statusText: err?.statusText,
      name: err?.name,
    });

    // enumerable이 아니라서 {}로 보이는 경우 대비
    const keys = [
      ...Object.getOwnPropertyNames(err ?? {}),
      ...Object.keys(err ?? {}),
    ];
    console.error(tag + " ownKeys", keys);

    // 안전 stringify
    try {
      console.error(tag + " json", JSON.stringify(err, null, 2));
    } catch {}
  } catch (e) {
    console.error(tag + " dump failed", e);
  }
}

let inflight: Promise<void> | null = null;

async function refreshTables(keys: TableKey[]): Promise<void> {
  const cur = getSnapshot();
  const userId = await getUserIdIfAny(supabase);

  const next: Tables = {
    roots: cur.roots,
    folders: cur.folders,
    notes: cur.notes,
    note_favorites: cur.note_favorites,
    user_folder_favorites: cur.user_folder_favorites,
    user_root_favorites: cur.user_root_favorites,
    note_recents: cur.note_recents,
    note_progress: cur.note_progress,
    note_drafts: cur.note_drafts,
  };

  const needsUser = (k: TableKey) =>
    k === "note_favorites" ||
    k === "user_folder_favorites" ||
    k === "user_root_favorites" ||
    k === "note_recents" ||
    k === "note_progress" ||
    k === "note_drafts";

  for (const k of keys) {
    const rows = await fetchTable(
      supabase,
      k,
      needsUser(k) ? { userId } : undefined,
    );
    (next as any)[k] = rows;
  }

  setCache(bump(next));
}



async function refreshAll(): Promise<void> {
  if (inflight) return inflight;

  inflight = (async () => {
    const cur = getSnapshot();

    const userId = await getUserIdIfAny(supabase);

    const results = await withTimeout(
      Promise.allSettled([
        fetchTable(supabase, "roots"),
        fetchTable(supabase, "folders"),
        fetchTable(supabase, "notes"),

        fetchTable(supabase, "note_favorites", { userId }),
        fetchTable(supabase, "user_folder_favorites", { userId }),
        fetchTable(supabase, "user_root_favorites", { userId }),
        fetchTable(supabase, "note_recents", { userId }),
        fetchTable(supabase, "note_progress", { userId }),
        fetchTable(supabase, "note_drafts", { userId }),
      ]),
      TIMEOUTS.refresh,
      "refreshAll",
    );

    const pick = <T>(i: number, fallback: T): T => {
      const r = results[i];
      return r.status === "fulfilled" ? (r.value as T) : fallback;
    };

    setCache(
      bump({
        roots: pick(0, cur.roots),
        folders: pick(1, cur.folders),
        notes: pick(2, cur.notes),

        note_favorites: pick(3, cur.note_favorites),
        user_folder_favorites: pick(4, cur.user_folder_favorites),
        user_root_favorites: pick(5, cur.user_root_favorites),

        note_recents: pick(6, cur.note_recents),
        note_progress: pick(7, cur.note_progress),
        note_drafts: pick(8, cur.note_drafts),
      }),
    );
  })()
    .catch((e) => {
      console.error("[db.refreshAll] failed:", e);
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/* =========================
   Public DB API
========================= */
export const db = {
  async ensure() {
    await refreshAll();
  },

  async refresh() {
    await refreshAll();
  },

  async refreshFolderFavorites() {
    const userId = await getUserIdIfAny(supabase);
    const cur = getSnapshot();

    const rows = await withTimeout(
      fetchTable(supabase, "user_folder_favorites", { userId }),
      TIMEOUTS.refresh,
      "refreshFolderFavorites",
    );

    setCache(
      bump({
        ...cur,
        user_folder_favorites: rows as unknown as FolderFavoriteRow[],
      }),
    );
  },

  async refreshRootFavorites() {
    const userId = await getUserIdIfAny(supabase);
    const cur = getSnapshot();

    const rows = await withTimeout(
      fetchTable(supabase, "user_root_favorites", { userId }),
      TIMEOUTS.refresh,
      "refreshRootFavorites",
    );

    setCache(
      bump({
        ...cur,
        user_root_favorites: rows as unknown as RootFavoriteRow[],
      }),
    );
  },

  async refreshNoteFavorites() {
    const userId = await getUserIdIfAny(supabase);
    const cur = getSnapshot();

    const rows = await withTimeout(
      fetchTable(supabase, "note_favorites", { userId }),
      TIMEOUTS.refresh,
      "refreshNoteFavorites",
    );

    setCache(
      bump({
        ...cur,
        note_favorites: rows as unknown as NoteFavoriteRow[],
      }),
    );
  },

  getTable<K extends TableKey>(name: K): Tables[K] {
    return getSnapshot()[name];
  },

  /* -------------------------
     roots / folders / notes CRUD
  ------------------------- */

  async createRoot(
    args:
      | { title?: string; name?: string; description?: string | null }
      | string,
  ) {
    const userId = await requireUserId(supabase);

    const title =
      typeof args === "string"
        ? args
        : String(args.title ?? args.name ?? "").trim();

    if (!title) throw new Error("ROOT_TITLE_REQUIRED");

    const description =
      typeof args === "string" ? "" : (args.description ?? "");

    const { data, error } = await withTimeout(
      supabase
        .from("roots")
        .insert({
          user_id: userId,
          title,
          description,
        })
        .select("id,title,description,created_at")
        .single(),
      TIMEOUTS.write,
      "createRoot",
    );

    if (error || !data) throw error ?? new Error("CREATE_ROOT_FAILED");

    await refreshTables(["roots"]);
    return data as unknown as RootRow;
  },

  async updateRoot(
    id: string,
    patch: { title?: string; description?: string },
  ) {
    const { error } = await withTimeout(
      supabase.from("roots").update(patch).eq("id", id),
      TIMEOUTS.write,
      "updateRoot",
    );
    if (error) throw error;
    await refreshTables(["roots"]);
  },

  async deleteRoot(id: string) {
    try {
      const userId = await requireUserId(supabase);
      await withTimeout(
        supabase
          .from("user_root_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("root_id", id),
        TIMEOUTS.write,
        "deleteRoot:user_root_favorites",
      );
    } catch {}

    const folderIds = getDescendantFolderIds(id, "root");
    const noteIds = folderIds.flatMap((fid) => getNoteIdsInFolder(fid));

    try {
      const userId = await requireUserId(supabase);
      for (const part of chunk(folderIds, 200)) {
        await withTimeout(
          supabase
            .from("user_folder_favorites")
            .delete()
            .eq("user_id", userId)
            .in("folder_id", part),
          TIMEOUTS.write,
          "deleteRoot:user_folder_favorites",
        );
      }
    } catch {}

    await cascadeDeleteNotes(supabase, noteIds);
    await deleteByIds(supabase, "folders", "id", folderIds);

    const { error } = await withTimeout(
      supabase.from("roots").delete().eq("id", id),
      TIMEOUTS.write,
      "deleteRoot:roots",
    );
    if (error) throw error;

    await refreshAll();
  },

  async createFolder(args: {
    root_id: string;
    parent_id?: string | null;
    name: string;
    order?: number | null;
  }) {
    const { data, error } = await withTimeout(
      supabase
        .from("folders")
        .insert({
          root_id: args.root_id,
          parent_id: args.parent_id ?? null,
          name: args.name,
          order: args.order ?? null,
        })
        .select("id,root_id,name,parent_id,order,created_at")
        .single(),
      TIMEOUTS.write,
      "createFolder",
    );

    if (error || !data) throw error ?? new Error("CREATE_FOLDER_FAILED");

    await refreshTables(["folders"]);
    return data as unknown as FolderRow;
  },

  async updateFolder(
    id: string,
    patch: { name?: string; parent_id?: string | null; order?: number | null },
  ) {
    const { error } = await withTimeout(
      supabase.from("folders").update(patch).eq("id", id),
      TIMEOUTS.write,
      "updateFolder",
    );
    if (error) throw error;
    await refreshTables(["folders"]);
  },

  async deleteFolder(id: string) {
    const folderIds = getDescendantFolderIds(id, "folder");
    const noteIds = folderIds.flatMap((fid) => getNoteIdsInFolder(fid));

    try {
      const userId = await requireUserId(supabase);
      for (const part of chunk(folderIds, 200)) {
        await withTimeout(
          supabase
            .from("user_folder_favorites")
            .delete()
            .eq("user_id", userId)
            .in("folder_id", part),
          TIMEOUTS.write,
          "deleteFolder:user_folder_favorites",
        );
      }
    } catch {}

    await cascadeDeleteNotes(supabase, noteIds);
    await deleteByIds(supabase, "folders", "id", folderIds);

    await refreshAll();
  },

  async createNote(args: {
    root_id: string;
    folder_id?: string | null;
    title: string;
    content: string;
  }) {
    const { data, error } = await withTimeout(
      supabase
        .from("notes")
        .insert({
          root_id: args.root_id,
          folder_id: args.folder_id ?? null,
          title: args.title,
          content: args.content,
        })
        .select("id, root_id, folder_id, title, content, created_at")
        .single(),
      TIMEOUTS.write,
      "createNote",
    );

    if (error) {
      dumpPostgrestError("[notes create] error", error);
      throw error;
    }
    if (!data) throw new Error("CREATE_NOTE_FAILED");

    await refreshTables(["notes"]);
    return data as unknown as NoteRow;
  },

  async updateNote(id: string, patch: { title?: string; content?: string }) {
    const { error } = await withTimeout(
      supabase.from("notes").update(patch).eq("id", id),
      TIMEOUTS.write,
      "updateNote",
    );
    if (error) throw error;
    await refreshTables(["notes"]);
  },

  async deleteNote(id: string) {
    await cascadeDeleteNotes(supabase, [id]);
    await refreshAll();
  },

  /* -------------------------
     ✅ drafts (임시저장: notes/new 최신 1개)
  ------------------------- */

  async saveNewNoteDraft(payload: DraftPayload) {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase.from("note_drafts").upsert(
        {
          user_id: userId,
          scope: "notes/new",
          content: payload,
        },
        { onConflict: "user_id,scope" },
      ),
      TIMEOUTS.write,
      "saveNewNoteDraft",
    );

    if (error) throw error;

    await refreshTables(["note_drafts"]);
  },

  async getNewNoteDraft(): Promise<DraftPayload | null> {
    const userId = await requireUserId(supabase);

    const { data, error } = await withTimeout(
      supabase
        .from("note_drafts")
        .select("content")
        .eq("user_id", userId)
        .eq("scope", "notes/new")
        .maybeSingle(),
      TIMEOUTS.read,
      "getNewNoteDraft",
    );

    if (error) throw error;
    if (!data?.content) return null;

    const c = data.content as any;

    return {
      title: typeof c?.title === "string" ? c.title : "",
      doc: c?.doc ?? null,
      text: typeof c?.text === "string" ? c.text : "",
      updated_at: typeof c?.updated_at === "string" ? c.updated_at : undefined,
    };
  },

  async clearNewNoteDraft() {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase
        .from("note_drafts")
        .delete()
        .eq("user_id", userId)
        .eq("scope", "notes/new"),
      TIMEOUTS.write,
      "clearNewNoteDraft",
    );

    if (error) throw error;

    await refreshTables(["note_drafts"]);
  },

  async deleteNewNoteDraft() {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase
        .from("note_drafts")
        .delete()
        .eq("user_id", userId)
        .eq("scope", "notes/new"),
      TIMEOUTS.write,
      "deleteNewNoteDraft",
    );

    if (error) throw error;
    await refreshTables(["note_drafts"]);
  },

  async hasNewNoteDraft(): Promise<boolean> {
    try {
      const userId = await requireUserId(supabase);

      const { data, error } = await withTimeout(
        supabase
          .from("note_drafts")
          .select("content")
          .eq("user_id", userId)
          .eq("scope", "notes/new")
          .maybeSingle(),
        TIMEOUTS.read,
        "hasNewNoteDraft",
      );

      if (error) throw error;

      const c = (data?.content ?? null) as any;
      if (!c) return false;

      const title = typeof c?.title === "string" ? c.title : "";
      const text = typeof c?.text === "string" ? c.text : "";
      return title.trim().length > 0 || text.trim().length > 0;
    } catch {
      return false;
    }
  },

  /* -------------------------
     favorites (노트)
  ------------------------- */
  async isFavorited(noteId: string) {
    const favs = getSnapshot().note_favorites;
    return favs.some((f) => String((f as any).note_id) === String(noteId));
  },

  async addFavorite(noteId: string) {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase.from("note_favorites").insert({
        user_id: userId,
        note_id: noteId,
      }),
      TIMEOUTS.write,
      "addFavorite",
    );

    if (error) throw error;
    await refreshTables(["note_favorites"]);
  },

  async removeFavorite(noteId: string) {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase
        .from("note_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("note_id", noteId),
      TIMEOUTS.write,
      "removeFavorite",
    );

    if (error) throw error;
    await refreshTables(["note_favorites"]);
  },

  async toggleFavorite(noteId: string) {
    const userId = await requireUserId(supabase);

    const { data: existing, error: selErr } = await withTimeout(
      supabase
        .from("note_favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("note_id", noteId)
        .maybeSingle(),
      TIMEOUTS.read,
      "toggleFavorite:select",
    );

    if (selErr) {
      dumpPostgrestError("[note_favorites select] error", selErr);
      throw selErr;
    }

    if (existing?.id) {
      const { error } = await withTimeout(
        supabase
          .from("note_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("note_id", noteId),
        TIMEOUTS.write,
        "toggleFavorite:delete",
      );

      if (error) {
        dumpPostgrestError("[note_favorites delete] error", error);
        throw error;
      }
    } else {
      const { error } = await withTimeout(
        supabase.from("note_favorites").insert({
          user_id: userId,
          note_id: noteId,
        }),
        TIMEOUTS.write,
        "toggleFavorite:insert",
      );

      if (error) {
        dumpPostgrestError("[note_favorites insert] error", error);
        throw error;
      }
    }

    await refreshTables(["note_favorites"]);
  },

  // ✅ 과거 코드/패널 호환용 alias (db.toggleNoteFavorite(...) 호출 대응)
  async toggleNoteFavorite(noteId: string) {
    return db.toggleFavorite(noteId);
  },

  /* -------------------------
     ✅ folder favorites (폴더)
  ------------------------- */

  async listFavoriteFolderIds(): Promise<string[]> {
    return (getSnapshot().user_folder_favorites ?? [])
      .map((r) => String((r as any).folder_id))
      .filter(Boolean);
  },

  async isFolderFavorited(folderId: string): Promise<boolean> {
    const cur = getSnapshot().user_folder_favorites ?? [];
    return cur.some((r) => String((r as any).folder_id) === String(folderId));
  },

  async addFolderFavorite(folderId: string) {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase.from("user_folder_favorites").insert({
        user_id: userId,
        folder_id: folderId,
      }),
      TIMEOUTS.write,
      "addFolderFavorite",
    );

    if (error) throw error;
    await refreshTables(["user_folder_favorites"]);
  },

  async removeFolderFavorite(folderId: string) {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase
        .from("user_folder_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("folder_id", folderId),
      TIMEOUTS.write,
      "removeFolderFavorite",
    );

    if (error) throw error;
    await refreshTables(["user_folder_favorites"]);
  },

  async toggleFolderFavorite(folderId: string) {
  const userId = await requireUserId(supabase);

  const { data: existing, error: selErr } = await withTimeout(
    supabase
      .from("user_folder_favorites")
      .select("folder_id")
      .eq("user_id", userId)
      .eq("folder_id", folderId)
      .maybeSingle(),
    TIMEOUTS.read,
    "toggleFolderFavorite:select",
  );

  if (selErr) {
    dumpPostgrestError("[user_folder_favorites select] error", selErr);
    throw selErr;
  }

  if (existing?.folder_id) {
    const { error } = await withTimeout(
      supabase
        .from("user_folder_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("folder_id", folderId),
      TIMEOUTS.write,
      "toggleFolderFavorite:delete",
    );

    if (error) {
      dumpPostgrestError("[user_folder_favorites delete] error", error);
      throw error;
    }
  } else {
    const { error } = await withTimeout(
      supabase.from("user_folder_favorites").insert({
        user_id: userId,
        folder_id: folderId,
      }),
      TIMEOUTS.write,
      "toggleFolderFavorite:insert",
    );

    if (error) {
      dumpPostgrestError("[user_folder_favorites insert] error", error);
      throw error;
    }
  }

  // ✅ 반드시 "내 userId로만" 다시 당겨서 UI 반영
  await refreshTables(["user_folder_favorites"]);
},



  /* -------------------------
     ✅ root favorites (루트)
  ------------------------- */
  async listFavoriteRootIds(): Promise<string[]> {
    return (getSnapshot().user_root_favorites ?? [])
      .map((r) => String((r as any).root_id))
      .filter(Boolean);
  },

  async isRootFavorited(rootId: string): Promise<boolean> {
    const cur = getSnapshot().user_root_favorites ?? [];
    return cur.some((r) => String((r as any).root_id) === String(rootId));
  },

  async addRootFavorite(rootId: string) {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase.from("user_root_favorites").insert({
        user_id: userId,
        root_id: rootId,
      }),
      TIMEOUTS.write,
      "addRootFavorite",
    );

    if (error) throw error;
    await refreshTables(["user_root_favorites"]);
  },

  async removeRootFavorite(rootId: string) {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase
        .from("user_root_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("root_id", rootId),
      TIMEOUTS.write,
      "removeRootFavorite",
    );

    if (error) throw error;
    await refreshTables(["user_root_favorites"]);
  },

  async toggleRootFavorite(rootId: string) {
  const userId = await requireUserId(supabase);

  // ✅ user_root_favorites에는 id 컬럼이 없으니 존재하는 컬럼로 체크
  const { data: existing, error: selErr } = await withTimeout(
    supabase
      .from("user_root_favorites")
      .select("root_id")
      .eq("user_id", userId)
      .eq("root_id", rootId)
      .maybeSingle(),
    TIMEOUTS.read,
    "toggleRootFavorite:select",
  );

  if (selErr) {
    dumpPostgrestError("[user_root_favorites select] error", selErr);
    throw selErr;
  }

  if (existing?.root_id) {
    const { error } = await withTimeout(
      supabase
        .from("user_root_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("root_id", rootId),
      TIMEOUTS.write,
      "toggleRootFavorite:delete",
    );

    if (error) {
      dumpPostgrestError("[user_root_favorites delete] error", error);
      throw error;
    }
  } else {
    const { error } = await withTimeout(
      supabase.from("user_root_favorites").insert({
        user_id: userId,
        root_id: rootId,
      }),
      TIMEOUTS.write,
      "toggleRootFavorite:insert",
    );

    if (error) {
      dumpPostgrestError("[user_root_favorites insert] error", error);
      throw error;
    }
  }

  await refreshTables(["user_root_favorites"]);
},


  /* -------------------------
     recents
  ------------------------- */
  async touchRecent(noteId: string) {
    const userId = await requireUserId(supabase);
    const now = new Date().toISOString();

    const { error } = await withTimeout(
      supabase.from("note_recents").upsert(
        {
          user_id: userId,
          note_id: noteId,
          last_opened_at: now,
        },
        { onConflict: "user_id,note_id" },
      ),
      TIMEOUTS.write,
      "touchRecent",
    );

    if (error) throw error;

    await refreshTables(["note_recents"]);
  },

  /* -------------------------
     progress (blank ratio)
  ------------------------- */
  async upsertProgress(args: {
    note_id: string;
    tokens_total: number;
    tokens_filled: number;
    tokens_correct: number;
  }) {
    const userId = await requireUserId(supabase);

    const { error } = await withTimeout(
      supabase.from("note_progress").upsert(
        {
          user_id: userId,
          note_id: args.note_id,
          tokens_total: args.tokens_total,
          tokens_filled: args.tokens_filled,
          tokens_correct: args.tokens_correct,
        },
        { onConflict: "user_id,note_id" },
      ),
      TIMEOUTS.write,
      "upsertProgress",
    );

    if (error) throw error;

    await refreshTables(["note_progress"]);
  },
} as const;

export type DBApi = typeof db;
