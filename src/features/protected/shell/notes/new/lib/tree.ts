// src/features/protected/shell/notes/new/lib/tree.ts
export type TreeKind = "root" | "folder";

export type TreeNode = {
  id: string;
  kind: TreeKind;
  title: string;
  rootId: string;
  parentId: string | null;
  children: TreeNode[];
};

export function buildTree(roots: any[], folders: any[]) {
  const rootNodes: TreeNode[] = (roots ?? []).map((r: any) => ({
    id: String(r.id),
    kind: "root",
    title: String(r.title ?? r.name ?? "Untitled"),
    rootId: String(r.id),
    parentId: null,
    children: [],
  }));

  const byId = new Map<string, TreeNode>();
  rootNodes.forEach((r) => byId.set(r.id, r));

  const folderNodes: TreeNode[] = (folders ?? []).map((f: any) => {
    const id = String(f.id);
    const rootId = String(f.root_id ?? f.rootId ?? f.root ?? "");
    const parentIdRaw = f.parent_id ?? f.parentId ?? f.parent ?? null;
    const parentId = parentIdRaw ? String(parentIdRaw) : null;

    return {
      id,
      kind: "folder",
      title: String(f.title ?? f.name ?? "Untitled"),
      rootId,
      parentId,
      children: [],
    };
  });

  folderNodes.forEach((n) => byId.set(n.id, n));

  folderNodes.forEach((n) => {
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId)!.children.push(n);
      return;
    }
    if (byId.has(n.rootId)) {
      byId.get(n.rootId)!.children.push(n);
    }
  });

  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => a.title.localeCompare(b.title));
    node.children.forEach(sortChildren);
  };
  rootNodes.forEach(sortChildren);

  return { rootNodes, byId };
}

export function getPathLabel(
  nodeId: string | null,
  byId: Map<string, TreeNode>,
) {
  if (!nodeId) return "폴더 선택";
  const node = byId.get(nodeId);
  if (!node) return "폴더 선택";

  const parts: string[] = [];
  let cur: TreeNode | undefined = node;

  while (cur) {
    parts.push(cur.title);
    if (cur.kind === "root") break;
    if (!cur.parentId) {
      cur = byId.get(cur.rootId);
      break;
    }
    cur = byId.get(cur.parentId);
  }

  return parts.reverse().join(" / ");
}
