"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { withTimeout, TIMEOUTS } from "./timeout";
import { getSnapshot } from "./cache";

/* =========================
   Internal helpers (DELETE cascade 보강)
========================= */
export function chunk<T>(arr: T[], size: number) {
  if (arr.length <= size) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function deleteByIds(
  supabase: SupabaseClient,
  table: string,
  col: string,
  ids: string[],
) {
  const uniq = Array.from(new Set(ids.map(String).filter(Boolean)));
  if (uniq.length === 0) return;

  for (const part of chunk(uniq, 200)) {
    const { error } = await withTimeout(
      supabase.from(table).delete().in(col, part),
      TIMEOUTS.write,
      `deleteByIds:${table}`,
    );
    if (error) throw error;
  }
}

export function getNoteIdsInFolder(folderId: string) {
  const cur = getSnapshot();
  return (cur.notes ?? [])
    .filter((n) => String((n as any).folder_id) === String(folderId))
    .map((n) => String((n as any).id));
}

export function getDescendantFolderIds(
  rootOrFolderId: string,
  mode: "root" | "folder",
) {
  const cur = getSnapshot();
  const folders = cur.folders ?? [];

  const byParent = new Map<string, string[]>();
  for (const f of folders) {
    const pid = String((f as any).parent_id ?? "");
    const id = String((f as any).id);
    if (!pid) continue;
    const list = byParent.get(pid) ?? [];
    list.push(id);
    byParent.set(pid, list);
  }

  const startIds =
    mode === "root"
      ? folders
          .filter(
            (f) =>
              String((f as any).root_id) === String(rootOrFolderId) &&
              !(f as any).parent_id,
          )
          .map((f) => String((f as any).id))
      : [String(rootOrFolderId)];

  const out: string[] = [];
  const stack = [...startIds];

  while (stack.length) {
    const id = stack.pop()!;
    if (out.includes(id)) continue;
    out.push(id);

    const kids = byParent.get(id) ?? [];
    for (const k of kids) stack.push(k);
  }

  return out;
}

export async function cascadeDeleteNotes(
  supabase: SupabaseClient,
  noteIds: string[],
) {
  const ids = Array.from(new Set(noteIds.map(String).filter(Boolean)));
  if (ids.length === 0) return;

  await deleteByIds(supabase, "note_favorites", "note_id", ids);
  await deleteByIds(supabase, "note_recents", "note_id", ids);
  await deleteByIds(supabase, "note_progress", "note_id", ids);

  await deleteByIds(supabase, "notes", "id", ids);
}
