import type { FolderRow, NoteRow, RootRow } from "@/lib/data";
import type { TreeKind, TreeNode } from "./types";

/** ✅ 여러 루트(포리스트)용 index */
export function buildIndex(roots: TreeNode[]) {
  const parent = new Map<string, string | null>();
  const nodeById = new Map<string, TreeNode>();

  const walk = (node: TreeNode, parentId: string | null) => {
    parent.set(node.id, parentId);
    nodeById.set(node.id, node);
    for (const c of node.children ?? []) walk(c, node.id);
  };

  for (const r of roots) walk(r, null);
  return { parent, nodeById };
}

export function pathIds(parent: Map<string, string | null>, id: string) {
  const ids: string[] = [];
  let cur: string | null | undefined = id;
  while (cur) {
    ids.unshift(cur);
    cur = parent.get(cur) ?? null;
  }
  return ids;
}

export function collectSearchHits(
  node: TreeNode,
  qLower: string,
  out: TreeNode[],
) {
  if (!qLower) return;
  if (node.name.toLowerCase().includes(qLower)) out.push(node);
  for (const c of node.children ?? []) collectSearchHits(c, qLower, out);
}

export function collectAllIds(node: TreeNode, out: string[]) {
  out.push(node.id);
  for (const c of node.children ?? []) collectAllIds(c, out);
}

export function collectDefaultOpenIds(node: TreeNode, out: string[]) {
  // root/folder는 기본 open
  if (node.kind !== "note") out.push(node.id);
  for (const c of node.children ?? []) collectDefaultOpenIds(c, out);
}

function buildRootSubtree(
  rootRow: RootRow,
  folders: FolderRow[],
  notes: NoteRow[],
): TreeNode {
  const rootNode: TreeNode = {
    id: String(rootRow.id),
    name: String(rootRow.title ?? "Root"),
    kind: "root",
    children: [],
  };

  const rootFolders = (folders ?? [])
    .filter((f) => String(f.root_id) === rootNode.id)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const folderNodeById = new Map<string, TreeNode>();

  for (const f of rootFolders) {
    folderNodeById.set(String(f.id), {
      id: String(f.id),
      name: String(f.name ?? "Folder"),
      kind: "folder",
      children: [],
    });
  }

  // folder hierarchy
  for (const f of rootFolders) {
    const node = folderNodeById.get(String(f.id))!;
    const parentId = f.parent_id ? String(f.parent_id) : null;

    if (parentId && folderNodeById.has(parentId)) {
      const p = folderNodeById.get(parentId)!;
      p.children = p.children ?? [];
      p.children.push(node);
    } else {
      rootNode.children = rootNode.children ?? [];
      rootNode.children.push(node);
    }
  }

  // attach notes
  const noteList = (notes ?? [])
    .filter((n) => !!n && String(n.folder_id))
    .slice()
    .sort((a, b) =>
      String(a.title ?? "").localeCompare(String(b.title ?? ""), "ko"),
    );

  for (const n of noteList) {
    const folderNode = folderNodeById.get(String(n.folder_id));
    if (!folderNode) continue;

    folderNode.children = folderNode.children ?? [];
    folderNode.children.push({
      id: String(n.id),
      name: String(n.title ?? "Untitled"),
      kind: "note",
    });
  }

  // sort: folder 먼저, 그 다음 note
  const sortTree = (node: TreeNode) => {
    const kids = node.children ?? [];
    if (kids.length === 0) return;

    const rank = (k: TreeKind) => (k === "root" ? 0 : k === "folder" ? 1 : 2);

    kids.sort((a, b) => {
      if (a.kind !== b.kind) return rank(a.kind) - rank(b.kind);
      return a.name.localeCompare(b.name, "ko");
    });

    for (const k of kids) sortTree(k);
  };

  sortTree(rootNode);

  // 빈 children 제거
  const compact = (node: TreeNode): TreeNode => {
    const kids = node.children ?? [];
    const nextKids = kids.map(compact).filter(Boolean) as TreeNode[];
    return {
      ...node,
      children: nextKids.length > 0 ? nextKids : undefined,
    };
  };

  return compact(rootNode);
}

/** ✅ Roots 래핑 제거: 최상단은 루트 배열 */
export function buildTreesFromDB(
  roots: RootRow[],
  folders: FolderRow[],
  notes: NoteRow[],
): TreeNode[] {
  const rootList = (roots ?? []).slice().sort((a, b) => {
    const at = String(a.title ?? "");
    const bt = String(b.title ?? "");
    return at.localeCompare(bt, "ko");
  });

  return rootList.map((r) => buildRootSubtree(r, folders, notes));
}
