"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiStar,
  FiX,
  FiClock,
  FiTrash2,
  FiFolder,
  FiFileText,
} from "react-icons/fi";

import {
  db,
  useDB,
  type RootRow,
  type FolderRow,
  type NoteRow,
} from "@/lib/data";

type TreeKind = "root" | "folder" | "note";

type TreeNode = {
  id: string; // rootId | folderId | noteId
  name: string;
  kind: TreeKind;
  children?: TreeNode[];
};

type RecentEntry = { id: string; ts: number };

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/** ✅ 여러 루트(포리스트)용 index */
function buildIndex(roots: TreeNode[]) {
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

function pathIds(parent: Map<string, string | null>, id: string) {
  const ids: string[] = [];
  let cur: string | null | undefined = id;
  while (cur) {
    ids.unshift(cur);
    cur = parent.get(cur) ?? null;
  }
  return ids;
}

function collectSearchHits(node: TreeNode, qLower: string, out: TreeNode[]) {
  if (!qLower) return;
  if (node.name.toLowerCase().includes(qLower)) out.push(node);
  for (const c of node.children ?? []) collectSearchHits(c, qLower, out);
}

function highlight(text: string, q: string) {
  const qq = q.trim();
  if (!qq) return text;

  const idx = text.toLowerCase().indexOf(qq.toLowerCase());
  if (idx < 0) return text;

  const a = text.slice(0, idx);
  const b = text.slice(idx, idx + qq.length);
  const c = text.slice(idx + qq.length);

  return (
    <>
      {a}
      <mark className="rounded-sm bg-amber-200/70 px-1 py-[1px]">{b}</mark>
      {c}
    </>
  );
}

function collectAllIds(node: TreeNode, out: string[]) {
  out.push(node.id);
  for (const c of node.children ?? []) collectAllIds(c, out);
}

function buildRootSubtree(
  rootRow: RootRow,
  folders: FolderRow[],
  notes: NoteRow[]
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
      String(a.title ?? "").localeCompare(String(b.title ?? ""), "ko")
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
function buildTreesFromDB(
  roots: RootRow[],
  folders: FolderRow[],
  notes: NoteRow[]
): TreeNode[] {
  const rootList = (roots ?? []).slice().sort((a, b) => {
    const at = String(a.title ?? "");
    const bt = String(b.title ?? "");
    return at.localeCompare(bt, "ko");
  });

  return rootList.map((r) => buildRootSubtree(r, folders, notes));
}

function DeleteConfirmModal({
  open,
  title,
  description,
  confirmText = "삭제",
  cancelText = "취소",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="px-5 py-4">
            <div className="text-[14px] font-semibold text-slate-900">
              {title}
            </div>
            <div className="mt-2 text-[12px] leading-5 text-slate-600">
              {description}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-rose-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-rose-700"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function collectDefaultOpenIds(node: TreeNode, out: string[]) {
  // root/folder는 기본 open
  if (node.kind !== "note") out.push(node.id);
  for (const c of node.children ?? []) collectDefaultOpenIds(c, out);
}

const FAVORITES_KEY = "practice:favoriteNoteIds";

function readFavoriteIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = window.localStorage.getItem(FAVORITES_KEY);
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return new Set(parsed.map(String).filter(Boolean));
    return new Set();
  } catch {
    if (raw.includes(",")) {
      return new Set(
        raw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      );
    }
    return new Set();
  }
}

function writeFavoriteIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)));
}

export default function PracticeNoteView() {
  const router = useRouter();
  const composingRef = useRef(false);

  useEffect(() => {
    db.ensure();
  }, []);

  const { roots, folders, notes } = useDB();

  const trees = useMemo(() => {
    return buildTreesFromDB(
      (roots ?? []) as RootRow[],
      (folders ?? []) as FolderRow[],
      (notes ?? []) as NoteRow[]
    );
  }, [roots, folders, notes]);

  const { parent, nodeById } = useMemo(() => buildIndex(trees), [trees]);
  const rootIds = useMemo(() => trees.map((t) => t.id), [trees]);

  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const bootRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string>("");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());

  const [mobileTab, setMobileTab] = useState<"search" | "recent" | "favorite">(
    "search"
  );

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // ✅ 최초 1회: open / selected / recent / favorites
  useEffect(() => {
    if (bootRef.current) return;

    if (!(roots as any[])?.length) return;
    if (!trees.length) return;

    const ids: string[] = [];
    for (const t of trees) collectDefaultOpenIds(t, ids);
    setOpenIds(new Set(ids));

    const firstRootId = trees[0]?.id ?? "";
    setSelectedId(firstRootId);

    setRecent(firstRootId ? [{ id: firstRootId, ts: Date.now() }] : []);
    setFavoriteIds(readFavoriteIds());

    bootRef.current = true;
  }, [roots, trees]);

  // ✅ 데이터 변경 시: 삭제된 id 정리 (삭제 후 state 방어)
  useEffect(() => {
    if (!bootRef.current) return;

    setOpenIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) if (nodeById.has(id)) next.add(id);
      for (const rid of rootIds) next.add(rid);
      return next;
    });

    setRecent((prev) => prev.filter((r) => nodeById.has(r.id)));

    setFavoriteIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) if (nodeById.has(id)) next.add(id);
      writeFavoriteIds(next);
      return next;
    });

    if (!selectedId || !nodeById.has(selectedId)) {
      setSelectedId(trees[0]?.id ?? "");
    }
  }, [nodeById, rootIds, selectedId, trees]);

  // ✅ storage sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== FAVORITES_KEY) return;
      setFavoriteIds(readFavoriteIds());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const qLower = searchQuery.trim().toLowerCase();

  const searchHits = useMemo(() => {
    if (!qLower) return [];
    const hits: TreeNode[] = [];
    for (const t of trees) collectSearchHits(t, qLower, hits);
    return hits.slice(0, 12);
  }, [trees, qLower]);

  const selectedPath = useMemo(() => {
    if (!selectedId) return "";
    const ids = pathIds(parent, selectedId);
    return ids
      .map((id) => nodeById.get(id)?.name ?? "")
      .filter(Boolean)
      .join(" › ");
  }, [parent, nodeById, selectedId]);

  const recentItems = useMemo(() => {
    return recent
      .map((r) => {
        const n = nodeById.get(r.id);
        if (!n) return null;
        return { id: r.id, label: n.name, ts: r.ts, kind: n.kind };
      })
      .filter(Boolean) as Array<{
      id: string;
      label: string;
      ts: number;
      kind: TreeKind;
    }>;
  }, [recent, nodeById]);

  const favoriteItems = useMemo(() => {
    const ids = Array.from(favoriteIds);
    return ids
      .map((id) => {
        const n = nodeById.get(id);
        if (!n) return null;
        return { id, label: n.name, kind: n.kind };
      })
      .filter(Boolean) as Array<{ id: string; label: string; kind: TreeKind }>;
  }, [favoriteIds, nodeById]);

  const clearQuery = () => {
    setQuery("");
    setSearchQuery("");
  };

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeFavoriteIds(next);
      return next;
    });
  };

  const nodeParentPathText = (id: string) => {
    const ids = pathIds(parent, id);
    ids.pop();
    const names = ids
      .map((pid) => nodeById.get(pid)?.name ?? "")
      .filter(Boolean);
    return names.join(" > ");
  };

  const formatHHMM = (ts: number) => {
    try {
      return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(ts));
    } catch {
      const d = new Date(ts);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  };

  // ✅ root는 삭제 불가
  const canDelete = (id: string) => {
    const n = nodeById.get(id);
    if (!n) return false;
    if (n.kind === "root") return false;
    return true;
  };

  const openDeleteModal = (id: string) => {
    if (!canDelete(id)) return;
    setPendingDeleteId(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setPendingDeleteId(null);
  };

  const pendingDeleteNode = pendingDeleteId
    ? nodeById.get(pendingDeleteId) ?? null
    : null;

  const deleteModalText = useMemo(() => {
    if (!pendingDeleteNode)
      return { title: "삭제할까요?", desc: "삭제할까요?" };

    if (pendingDeleteNode.kind === "folder") {
      return {
        title: "폴더를 삭제할까요?",
        desc: "이 폴더를 삭제하면 하위 폴더 및 파일도 함께 삭제됩니다. 삭제할까요?",
      };
    }

    if (pendingDeleteNode.kind === "note") {
      return { title: "파일을 삭제할까요?", desc: "이 파일을 삭제할까요?" };
    }

    return { title: "삭제할까요?", desc: "삭제할까요?" };
  }, [pendingDeleteNode]);

  const confirmDelete = () => {
    const id = pendingDeleteId;
    if (!id) return;
    if (!canDelete(id)) return;

    const node = nodeById.get(id);
    if (!node) return;

    const removedAll: string[] = [];
    collectAllIds(node, removedAll);

    const removedSet = new Set(removedAll);
    const removedFolderIds = new Set<string>();
    const removedNoteIds = new Set<string>();

    for (const rid of removedAll) {
      const k = nodeById.get(rid)?.kind;
      if (k === "folder") removedFolderIds.add(rid);
      if (k === "note") removedNoteIds.add(rid);
    }

    const curFolders = ((folders as any) ?? []) as FolderRow[];
    const curNotes = ((notes as any) ?? []) as NoteRow[];

    const nextFolders = curFolders.filter(
      (f) => !removedFolderIds.has(String(f.id))
    );

    const nextNotes = curNotes.filter((n) => {
      const nid = String(n.id);
      const fid = String(n.folder_id);
      if (removedNoteIds.has(nid)) return false;
      if (removedFolderIds.has(fid)) return false;
      return true;
    });

    db.setTable("notes", nextNotes);
    db.setTable("folders", nextFolders);

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      for (const rid of removedSet) next.delete(rid);
      writeFavoriteIds(next);
      return next;
    });

    setRecent((prev) => prev.filter((v) => !removedSet.has(v.id)));

    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const rid of removedSet) next.delete(rid);
      for (const rid of rootIds) next.add(rid);
      return next;
    });

    setSelectedId((prev) => (removedSet.has(prev) ? trees[0]?.id ?? "" : prev));
    closeDeleteModal();
  };

  const openById = (id: string, behavior: "search" | "list" | "tree") => {
    const n = nodeById.get(id);
    if (!n) return;

    if (n.kind === "note") {
      setSelectedId(id);

      setRecent((prev) => {
        const now = Date.now();
        const next = [{ id, ts: now }, ...prev.filter((v) => v.id !== id)];
        return next.slice(0, 8);
      });

      if (behavior !== "search") {
        const ids = pathIds(parent, id);
        setOpenIds((prev) => {
          const next = new Set(prev);
          for (const pid of ids) next.add(pid);
          return next;
        });
      }

      router.push(`/practice/post/${encodeURIComponent(id)}`);
      return;
    }

    setSelectedId(id);

    const ids = pathIds(parent, id);
    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const pid of ids) next.add(pid);
      return next;
    });

    setRecent((prev) => {
      const now = Date.now();
      const next = [{ id, ts: now }, ...prev.filter((v) => v.id !== id)];
      return next.slice(0, 8);
    });
  };

  const renderSearchBox = () => (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <FiSearch className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            composingRef.current = false;
            const v = e.currentTarget.value;
            setQuery(v);
            setSearchQuery(v);
          }}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);

            const native = e.nativeEvent as unknown as {
              isComposing?: boolean;
            };
            const isComposing = !!native?.isComposing || composingRef.current;
            if (!isComposing) setSearchQuery(v);
          }}
          placeholder="폴더/파일 검색…"
          className="w-full bg-transparent py-1 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {query.trim().length > 0 && (
          <button
            type="button"
            onClick={clearQuery}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="clear"
          >
            <FiX className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderPickRow = ({
    id,
    label,
    onPick,
    highlightQuery,
    rightText,
  }: {
    id: string;
    label: string;
    onPick: (id: string) => void;
    highlightQuery?: string;
    rightText?: string;
  }) => {
    const node = nodeById.get(id);
    const kind: TreeKind = node?.kind ?? "note";
    const isFolderLike = kind === "folder" || kind === "root";
    const path = nodeParentPathText(id);
    const isFav = favoriteIds.has(id);

    return (
      <div
        key={id}
        role="button"
        tabIndex={0}
        onClick={() => onPick(id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick(id);
          }
        }}
        className={cx(
          "w-full rounded-lg px-3 py-2 text-left transition",
          "bg-slate-50 hover:bg-slate-100",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            {isFolderLike ? (
              <FiFolder className="h-4 w-4 text-slate-400" />
            ) : (
              <FiFileText className="h-4 w-4 text-slate-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="min-w-0 truncate text-[13px] font-semibold text-slate-900">
              {highlightQuery ? highlight(label, highlightQuery) : label}
              {path ? (
                <span className="ml-1 text-[11px] font-medium text-slate-500">
                  {path}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            aria-pressed={isFav}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(id);
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/70"
            aria-label="favorite"
          >
            <FiStar
              className={cx(
                "h-4 w-4",
                isFav ? "text-amber-500" : "text-slate-400"
              )}
              fill={isFav ? "currentColor" : "none"}
            />
          </button>

          {rightText ? (
            <div className="shrink-0 text-[11px] font-semibold text-slate-500">
              {rightText}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderSearchResultList = () => {
    if (!qLower) return null;

    return (
      <div className="rounded-lg border border-slate-200 bg-white flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <FiSearch className="h-3.5 w-3.5 text-slate-500" />
            <div className="text-[12px] font-semibold text-slate-800">
              검색 결과
            </div>
          </div>
          <div className="text-[11px] text-slate-500">{searchHits.length}</div>
        </div>

        <div className="border-b border-slate-200 px-4 py-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
            {searchQuery.trim()}
            <button
              type="button"
              onClick={clearQuery}
              className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-slate-200/60"
              aria-label="clear"
            >
              <FiX className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="p-2 max-h-[28vh] overflow-y-auto">
          {searchHits.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <div className="text-[13px] font-semibold text-slate-900">
                결과 없음
              </div>
              <div className="mt-2 text-[12px] text-slate-500">
                다른 키워드로 검색해보세요.
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {searchHits.map((n) =>
                renderPickRow({
                  id: n.id,
                  label: n.name,
                  onPick: (id) => openById(id, "search"),
                  highlightQuery: searchQuery,
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const kids = node.children ?? [];
    const hasChildren = node.kind !== "note" && kids.length > 0;
    const open = openIds.has(node.id);

    const active = node.id === selectedId;
    const isFav = favoriteIds.has(node.id);

    const iconColor = active ? "text-white/80" : "text-slate-400";
    const starColor = isFav
      ? active
        ? "text-amber-300"
        : "text-amber-500"
      : active
      ? "text-white/60"
      : "text-slate-400";

    const showDelete = canDelete(node.id);

    return (
      <div key={node.id}>
        <div
          className={cx(
            "flex items-center gap-2 px-3 py-2 transition",
            active ? "bg-slate-900 text-white" : "hover:bg-slate-50"
          )}
          style={{ paddingLeft: 12 + depth * 16 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() =>
                setOpenIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  return next;
                })
              }
              className={cx(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                active ? "hover:bg-white/10" : "hover:bg-slate-100"
              )}
              aria-label="toggle"
            >
              {open ? (
                <FiChevronUp
                  className={cx(
                    "h-4 w-4",
                    active ? "text-white" : "text-slate-500"
                  )}
                />
              ) : (
                <FiChevronDown
                  className={cx(
                    "h-4 w-4",
                    active ? "text-white" : "text-slate-500"
                  )}
                />
              )}
            </button>
          ) : (
            <div className="h-8 w-8" />
          )}

          <div className="shrink-0">
            {node.kind === "note" ? (
              <FiFileText className={cx("h-4 w-4", iconColor)} />
            ) : (
              <FiFolder className={cx("h-4 w-4", iconColor)} />
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (node.kind === "note") {
                openById(node.id, "tree");
                return;
              }

              setSelectedId(node.id);
              setRecent((prev) => {
                const now = Date.now();
                const next = [
                  { id: node.id, ts: now },
                  ...prev.filter((v) => v.id !== node.id),
                ];
                return next.slice(0, 8);
              });

              if (hasChildren) {
                setOpenIds((prev) => {
                  const next = new Set(prev);

                  if (next.has(node.id)) {
                    next.delete(node.id);
                    return next;
                  }

                  const ids = pathIds(parent, node.id);
                  for (const pid of ids) next.add(pid);
                  return next;
                });
              }
            }}
            className="min-w-0 flex-1 text-left"
          >
            <div
              className={cx(
                "truncate text-[13px]",
                node.kind !== "note" ? "font-semibold" : "font-medium"
              )}
            >
              {node.name}
            </div>

            {node.kind !== "note" && (
              <div
                className={cx(
                  "mt-0.5 text-[11px]",
                  active ? "text-white/70" : "text-slate-500"
                )}
              >
                하위 {kids.length}개
              </div>
            )}
          </button>

          <div>
            <button
              type="button"
              onClick={() => toggleFavorite(node.id)}
              className={cx(
                "inline-flex h-8 w-6 items-center justify-center rounded-lg",
                active ? "hover:bg-white/10" : "hover:bg-slate-100"
              )}
              aria-label="favorite"
            >
              <FiStar
                className={cx("h-4 w-4", starColor)}
                fill={isFav ? "currentColor" : "none"}
              />
            </button>

            {showDelete ? (
              <button
                type="button"
                onClick={() => openDeleteModal(node.id)}
                className={cx(
                  "inline-flex h-8 w-6 items-center justify-center rounded-lg transition",
                  active ? "hover:bg-white/10" : "hover:bg-slate-100"
                )}
                aria-label="delete"
                title="삭제"
              >
                <FiTrash2
                  className={cx(
                    "h-4 w-4",
                    active ? "text-white/80" : "text-rose-600"
                  )}
                />
              </button>
            ) : null}
          </div>
        </div>

        {hasChildren && open ? (
          <div className="space-y-1">
            {kids.map((c) => renderNode(c, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  /** ✅ 모바일: "외부 스크롤" 없애고, 여기 내부 스크롤만 사용 */
  const renderMobileRail = () => {
    const TabBtn = ({
      k,
      label,
    }: {
      k: "search" | "recent" | "favorite";
      label: string;
    }) => {
      const active = mobileTab === k;
      return (
        <button
          type="button"
          onClick={() => setMobileTab(k)}
          aria-pressed={active}
          className={cx(
            "h-9 flex-1 rounded-lg px-2 text-[12px] font-semibold transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
            active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          )}
        >
          {label}
        </button>
      );
    };

    const content = (() => {
      if (mobileTab === "search") {
        return (
          <div className="space-y-2">
            {renderSearchBox()}

            {qLower ? (
              <div className="pt-1">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <FiSearch className="h-3.5 w-3.5" />
                  검색 결과
                </div>

                {searchHits.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center">
                    <div className="text-[13px] font-semibold text-slate-900">
                      결과 없음
                    </div>
                    <div className="mt-2 text-[12px] text-slate-500">
                      다른 키워드로 검색해보세요.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchHits.slice(0, 8).map((n) =>
                      renderPickRow({
                        id: n.id,
                        label: n.name,
                        onPick: (id) => openById(id, "search"),
                        highlightQuery: searchQuery,
                      })
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      }

      if (mobileTab === "recent") {
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <FiClock className="h-3.5 w-3.5" />
              최근 선택
            </div>

            <div className="space-y-1">
              {recentItems.length === 0 ? (
                <div className="text-[12px] text-slate-500">최근 선택 없음</div>
              ) : (
                recentItems.map((it) =>
                  renderPickRow({
                    id: it.id,
                    label: it.label,
                    onPick: (id) => openById(id, "list"),
                    rightText: formatHHMM(it.ts),
                  })
                )
              )}
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <FiStar className="h-3.5 w-3.5" />
            즐겨찾기
          </div>

          <div className="space-y-1">
            {favoriteItems.length === 0 ? (
              <div className="text-[12px] text-slate-500">즐겨찾기 없음</div>
            ) : (
              favoriteItems.map((it) =>
                renderPickRow({
                  id: it.id,
                  label: it.label,
                  onPick: (id) => openById(id, "list"),
                })
              )
            )}
          </div>
        </div>
      );
    })();

    return (
      <div className="lg:hidden">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="p-2">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <TabBtn k="search" label="검색" />
              <TabBtn k="recent" label="최근선택" />
              <TabBtn k="favorite" label="즐겨찾기" />
            </div>
          </div>

          <div className="border-t border-slate-200 px-3 py-3">
            {/* ✅ "이 내부"만 스크롤 */}
            <div className="min-h-[160px] max-h-[38dvh] overflow-y-auto pr-1">
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /** ✅ PC: 즐겨찾기 스크롤 확실하게(무조건 내부 스크롤 발생하도록 max-h 부여) */
  const renderDesktopRail = () => (
    <div className="hidden lg:flex lg:flex-col lg:min-h-0 lg:gap-3">
      <div className="rounded-lg border border-slate-200 bg-white shrink-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="text-[12px] font-semibold text-slate-900">검색</div>
        </div>
        <div className="p-4 space-y-3">{renderSearchBox()}</div>
      </div>

      {renderSearchResultList()}

      <div className="rounded-lg border border-slate-200 bg-white flex flex-col shrink-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <FiClock className="h-3.5 w-3.5 text-slate-500" />
            <div className="text-[12px] font-semibold text-slate-800">
              최근 선택
            </div>
          </div>
          <div className="text-[11px] text-slate-500">{recentItems.length}</div>
        </div>

        <div className="p-2 max-h-[22vh] overflow-y-auto">
          {recentItems.length === 0 ? (
            <div className="px-2 py-2 text-[12px] text-slate-500">
              최근 선택 없음
            </div>
          ) : (
            <div className="space-y-1">
              {recentItems.map((it) =>
                renderPickRow({
                  id: it.id,
                  label: it.label,
                  onPick: (id) => openById(id, "list"),
                  rightText: formatHHMM(it.ts),
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <FiStar className="h-3.5 w-3.5 text-slate-500" />
            <div className="text-[12px] font-semibold text-slate-800">
              즐겨찾기
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            {favoriteItems.length}
          </div>
        </div>

        {/* ✅ 이전과 달리: flex-1만 믿지 않고 max-h를 줘서 "반드시" 내부 스크롤 */}
        <div className="p-2 max-h-[42vh] overflow-y-auto">
          {favoriteItems.length === 0 ? (
            <div className="px-2 py-2 text-[12px] text-slate-500">
              즐겨찾기 없음
            </div>
          ) : (
            <div className="space-y-1">
              {favoriteItems.map((it) =>
                renderPickRow({
                  id: it.id,
                  label: it.label,
                  onPick: (id) => openById(id, "list"),
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <DeleteConfirmModal
        open={deleteModalOpen}
        title={deleteModalText.title}
        description={deleteModalText.desc}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />

      <div
        className={cx(
          "h-full min-h-0 overflow-hidden",
          "flex flex-col gap-4",
          "lg:grid lg:grid-cols-[320px_32px_minmax(0,1fr)] lg:items-stretch lg:gap-0"
        )}
      >
        {/* ✅ (모바일) 외부 스크롤 제거: overflow-hidden 고정 */}
        <aside
          className={cx("shrink-0 min-h-0 overflow-hidden lg:h-full lg:pr-1")}
        >
          {renderMobileRail()}
          {renderDesktopRail()}
        </aside>

        <div className="hidden lg:flex justify-center lg:h-full">
          <div className="h-full w-px bg-slate-200" />
        </div>

        <section className="rounded-lg border border-slate-200 bg-white flex flex-col flex-1 min-h-0">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 shrink-0">
            <div>
              <div className="text-[12px] font-semibold text-slate-900">
                폴더 구조
              </div>
              <div className="mt-1 text-[12px] text-slate-500">
                {selectedPath}
              </div>
            </div>
          </div>

          <div className="py-2 flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-1">
              {trees.map((t) => renderNode(t, 0))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
