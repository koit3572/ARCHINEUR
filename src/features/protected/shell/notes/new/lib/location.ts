// src/features/protected/shell/notes/new/lib/location.ts
"use client";

type AnyRow = Record<string, any>;

export function extractRootsFolders(dbState: any): {
  rootsRaw: AnyRow[];
  foldersRaw: AnyRow[];
} {
  const rootsRaw: AnyRow[] = Array.isArray(dbState?.roots)
    ? dbState.roots
    : Array.isArray(dbState?.data?.roots)
      ? dbState.data.roots
      : [];

  const foldersRaw: AnyRow[] = Array.isArray(dbState?.folders)
    ? dbState.folders
    : Array.isArray(dbState?.data?.folders)
      ? dbState.data.folders
      : [];

  return { rootsRaw, foldersRaw };
}

export function buildRootsById(rootsRaw: AnyRow[]) {
  const m = new Map<string, AnyRow>();
  for (const r of rootsRaw ?? []) {
    if (r && r.id) m.set(String(r.id), r);
  }
  return m;
}

export function buildFoldersById(foldersRaw: AnyRow[]) {
  const m = new Map<string, AnyRow>();
  for (const f of foldersRaw ?? []) {
    if (f && f.id) m.set(String(f.id), f);
  }
  return m;
}

export function buildSelectedPath({
  selectedRootId,
  selectedFolderId,
  rootsById,
  foldersById,
}: {
  selectedRootId: string | null;
  selectedFolderId: string | null;
  rootsById: Map<string, AnyRow>;
  foldersById: Map<string, AnyRow>;
}) {
  if (!selectedRootId && !selectedFolderId) return "";

  const parts: string[] = [];

  if (selectedFolderId) {
    let cur = foldersById.get(selectedFolderId) ?? null;
    let guard = 0;

    while (cur && guard++ < 50) {
      const name = String(cur.name ?? cur.title ?? "");
      if (name) parts.unshift(name);

      const parentId = cur.parentId ?? cur.parent_id ?? null;
      if (!parentId) break;

      cur = foldersById.get(String(parentId)) ?? null;
    }

    const rootIdFromFolder = String(
      foldersById.get(selectedFolderId)?.rootId ??
        foldersById.get(selectedFolderId)?.root_id ??
        selectedRootId ??
        "",
    ).trim();

    if (rootIdFromFolder) {
      const root = rootsById.get(rootIdFromFolder);
      const rootName = String(root?.name ?? root?.title ?? "");
      if (rootName) parts.unshift(rootName);
    }
  } else if (selectedRootId) {
    const root = rootsById.get(selectedRootId);
    const rootName = String(root?.name ?? root?.title ?? "");
    if (rootName) parts.push(rootName);
  }

  return parts.join("/");
}
