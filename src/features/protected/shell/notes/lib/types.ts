export type TreeKind = "root" | "folder" | "note";

export type TreeNode = {
  id: string; // rootId | folderId | noteId
  name: string;
  kind: TreeKind;
  children?: TreeNode[];
};

export type RecentEntry = { id: string; ts: number };
