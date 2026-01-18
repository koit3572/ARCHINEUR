// src/features/protected/shell/notes/components/NotesView.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  FiMoreVertical,
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
  order?: number;
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
  notes: NoteRow[],
): TreeNode {
  const rootNode: TreeNode = {
    id: String(rootRow.id),
    name: String((rootRow as any).title ?? "Root"),
    kind: "root",
    children: [],
  };

  const rootFolders = (folders ?? [])
    .filter((f) => String((f as any).root_id) === rootNode.id)
    .slice()
    .sort(
      (a, b) =>
        (((a as any).order ?? 0) as number) -
        (((b as any).order ?? 0) as number),
    );

  const folderNodeById = new Map<string, TreeNode>();

  for (const f of rootFolders) {
    folderNodeById.set(String((f as any).id), {
      id: String((f as any).id),
      name: String((f as any).name ?? "Folder"),
      kind: "folder",
      order: Number((f as any).order ?? 0),
      children: [],
    });
  }

  // folder hierarchy
  for (const f of rootFolders) {
    const node = folderNodeById.get(String((f as any).id))!;
    const parentId = (f as any).parent_id ? String((f as any).parent_id) : null;

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
    .filter((n) => !!n && String((n as any).folder_id))
    .slice()
    .sort((a, b) =>
      String((a as any).title ?? "").localeCompare(
        String((b as any).title ?? ""),
        "ko",
      ),
    );

  for (const n of noteList) {
    const folderNode = folderNodeById.get(String((n as any).folder_id));
    if (!folderNode) continue;

    folderNode.children = folderNode.children ?? [];
    folderNode.children.push({
      id: String((n as any).id),
      name: String((n as any).title ?? "Untitled"),
      kind: "note",
    });
  }

  // ✅ sort: folder 먼저(폴더는 order 우선), 그 다음 note
  const sortTree = (node: TreeNode) => {
    const kids = node.children ?? [];
    if (kids.length === 0) return;

    const rank = (k: TreeKind) => (k === "root" ? 0 : k === "folder" ? 1 : 2);

    kids.sort((a, b) => {
      if (a.kind !== b.kind) return rank(a.kind) - rank(b.kind);

      if (a.kind === "folder" && b.kind === "folder") {
        const ao = a.order ?? 0;
        const bo = b.order ?? 0;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name, "ko");
      }

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
  notes: NoteRow[],
): TreeNode[] {
  const rootList = (roots ?? []).slice().sort((a, b) => {
    const at = String((a as any).title ?? "");
    const bt = String((b as any).title ?? "");
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
          .filter(Boolean),
      );
    }
    return new Set();
  }
}

function writeFavoriteIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)));
}

export default function NotesView() {
  const router = useRouter();

  // ✅ 브라우저(바디) 스크롤 완전 차단 (NotesView에서만)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    db.ensure();
  }, []);

  const { roots, folders, notes } = useDB();

  const trees = useMemo(() => {
    return buildTreesFromDB(
      (roots ?? []) as RootRow[],
      (folders ?? []) as FolderRow[],
      (notes ?? []) as NoteRow[],
    );
  }, [roots, folders, notes]);

  const { parent, nodeById } = useMemo(() => buildIndex(trees), [trees]);

  // ====== search (IME 안정화) ======
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    if (isComposing) return;
    setSearchQuery(query);
  }, [query, isComposing]);

  const bootRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string>("");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());

  // ✅ 모바일: 폴더/최근/즐겨찾기 모드 토글
  const [mobileMode, setMobileMode] = useState<"tree" | "recent" | "favorite">(
    "tree",
  );

  // ✅ PC 보조패널 탭(기존 유지)
  const [desktopTab, setDesktopTab] = useState<"recent" | "favorite">("recent");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // ✅ "브라우저 스크롤" 대신, 이 컴포넌트가 차지할 실제 높이를 계산해서 고정
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hostHeight, setHostHeight] = useState<number>(0);

  // ✅ (중요) 세로 … 메뉴 상태: 딱 1번만 선언
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRootRef = useRef<HTMLDivElement | null>(null);

  // ✅ 모바일 트리 스크롤 컨테이너 ref
  const mobileTreeScrollRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const calc = () => {
      if (!hostRef.current) return;

      const vv = window.visualViewport;
      const viewportH = Math.floor(vv?.height ?? window.innerHeight);

      const rect = hostRef.current.getBoundingClientRect();
      const top = Math.floor(rect.top);

      const h = Math.max(360, viewportH - top);
      setHostHeight(h);
    };

    calc();

    window.addEventListener("resize", calc);
    window.visualViewport?.addEventListener("resize", calc);
    window.visualViewport?.addEventListener("scroll", calc);

    return () => {
      window.removeEventListener("resize", calc);
      window.visualViewport?.removeEventListener("resize", calc);
      window.visualViewport?.removeEventListener("scroll", calc);
    };
  }, []);

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
      // 남아있는 루트들은 항상 열림 유지
      for (const t of trees) next.add(t.id);
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
  }, [nodeById, selectedId, trees]);

  // ✅ storage sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== FAVORITES_KEY) return;
      setFavoriteIds(readFavoriteIds());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ✅ 메뉴 바깥 클릭하면 닫기
  useEffect(() => {
    if (!menuOpenId) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      const root = menuRootRef.current;
      if (root && root.contains(t)) return;
      setMenuOpenId(null);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [menuOpenId]);

  const qLower = searchQuery.trim().toLowerCase();

  const searchHits = useMemo(() => {
    if (!qLower) return [];
    const hits: TreeNode[] = [];
    for (const t of trees) collectSearchHits(t, qLower, hits);
    return hits.slice(0, 32);
  }, [trees, qLower]);

  const selectedPath = useMemo(() => {
    if (!selectedId) return "";
    const ids = pathIds(parent, selectedId);
    return ids
      .map((id) => nodeById.get(id)?.name ?? "")
      .filter(Boolean)
      .join(" › ");
  }, [parent, nodeById, selectedId]);

  // ✅ 최근 기록: "파일(note)만 표시"
  const recentItems = useMemo(() => {
    return recent
      .map((r) => {
        const n = nodeById.get(r.id);
        if (!n) return null;
        if (n.kind !== "note") return null;
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

  // ✅ 루트/폴더/노트 모두 삭제 가능
  const canDelete = (id: string) => !!nodeById.get(id);

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
    ? (nodeById.get(pendingDeleteId) ?? null)
    : null;

  const deleteModalText = useMemo(() => {
    if (!pendingDeleteNode)
      return { title: "삭제할까요?", desc: "삭제할까요?" };

    if (pendingDeleteNode.kind === "root") {
      return {
        title: "루트를 삭제할까요?",
        desc: "이 루트를 삭제하면 하위 폴더 및 파일도 함께 삭제됩니다. 삭제할까요?",
      };
    }

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
    const removedRootIds = new Set<string>();
    const removedFolderIds = new Set<string>();
    const removedNoteIds = new Set<string>();

    for (const rid of removedAll) {
      const k = nodeById.get(rid)?.kind;
      if (k === "root") removedRootIds.add(rid);
      if (k === "folder") removedFolderIds.add(rid);
      if (k === "note") removedNoteIds.add(rid);
    }

    const curRoots = ((roots as any) ?? []) as RootRow[];
    const curFolders = ((folders as any) ?? []) as FolderRow[];
    const curNotes = ((notes as any) ?? []) as NoteRow[];

    // ✅ 루트 삭제 시: roots 테이블에서도 제거
    const nextRoots = curRoots.filter(
      (r) => !removedRootIds.has(String((r as any).id)),
    );

    const nextFolders = curFolders.filter((f) => {
      const fid = String((f as any).id);
      const rid = String((f as any).root_id);
      if (removedFolderIds.has(fid)) return false;
      if (removedRootIds.has(rid)) return false;
      return true;
    });

    const nextNotes = curNotes.filter((n) => {
      const nid = String((n as any).id);
      const fid = String((n as any).folder_id);
      if (removedNoteIds.has(nid)) return false;
      if (removedFolderIds.has(fid)) return false;
      return true;
    });

    db.setTable("notes", nextNotes);
    db.setTable("folders", nextFolders);
    db.setTable("roots", nextRoots);

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
      for (const r of nextRoots) next.add(String((r as any).id));
      return next;
    });

    const nextTreeRoots = buildTreesFromDB(nextRoots, nextFolders, nextNotes);
    setSelectedId((prev) =>
      removedSet.has(prev) ? (nextTreeRoots[0]?.id ?? "") : prev,
    );

    closeDeleteModal();
  };

  const openPath = (id: string) => {
    const ids = pathIds(parent, id);
    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const pid of ids) next.add(pid);
      return next;
    });
  };

  const openById = (id: string, _behavior: "search" | "list" | "tree") => {
    const n = nodeById.get(id);
    if (!n) return;

    openPath(id);

    setRecent((prev) => {
      const now = Date.now();
      const next = [{ id, ts: now }, ...prev.filter((v) => v.id !== id)];
      return next.slice(0, 8);
    });

    if (n.kind === "note") {
      setSelectedId(id);
      router.push(`/notes/${encodeURIComponent(id)}`);
      return;
    }

    setSelectedId(id);
  };

  const scrollTreeNodeIntoView = (id: string) => {
    requestAnimationFrame(() => {
      const container = mobileTreeScrollRef.current;
      const el = container?.querySelector(
        `[data-tree-node-id="${id}"]`,
      ) as HTMLElement | null;
      el?.scrollIntoView({ block: "center", inline: "nearest" });
    });
  };

  const renderSearchBox = () => (
    <div className="rounded-lg border border-slate-200 bg-white w-full">
      <div className="flex items-center gap-2 px-3 py-2">
        <FiSearch className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            const v = e.currentTarget.value;
            setQuery(v);
            setSearchQuery(v);
          }}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);

            const ne = e.nativeEvent as any;
            const composing = !!ne?.isComposing || isComposing;
            if (!composing) setSearchQuery(v);
          }}
          placeholder="폴더/파일 검색…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
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
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
        )}
      >
        <div className="flex items-center gap-2 w-full">
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
                isFav ? "text-amber-500" : "text-slate-400",
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

    const showMenu = canDelete(node.id);

    return (
      <div key={node.id}>
        <div
          data-tree-node-id={node.id}
          className={cx(
            "flex items-center gap-2 px-3 py-2 transition",
            active ? "bg-slate-900 text-white" : "hover:bg-slate-50",
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
                active ? "hover:bg-white/10" : "hover:bg-slate-100",
              )}
              aria-label="toggle"
            >
              {open ? (
                <FiChevronUp
                  className={cx(
                    "h-4 w-4",
                    active ? "text-white" : "text-slate-500",
                  )}
                />
              ) : (
                <FiChevronDown
                  className={cx(
                    "h-4 w-4",
                    active ? "text-white" : "text-slate-500",
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

          {/* 행 클릭 = 이동(노트)/선택(폴더/루트) + 폴더는 토글 */}
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
                node.kind !== "note" ? "font-semibold" : "font-medium",
              )}
            >
              {node.name}
            </div>

            {node.kind !== "note" && (
              <div
                className={cx(
                  "mt-0.5 text-[11px]",
                  active ? "text-white/70" : "text-slate-500",
                )}
              >
                하위 {kids.length}개
              </div>
            )}
          </button>

          <div className="flex items-center gap-1">
            {/* 즐겨찾기 별은 유지 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(node.id);
              }}
              className={cx(
                "inline-flex h-8 w-6 items-center justify-center rounded-lg",
                active ? "hover:bg-white/10" : "hover:bg-slate-100",
              )}
              aria-label="favorite"
              title="즐겨찾기"
            >
              <FiStar
                className={cx("h-4 w-4", starColor)}
                fill={isFav ? "currentColor" : "none"}
              />
            </button>

            {/* 휴지통은 세로 … 메뉴로 */}
            {showMenu ? (
              <div
                className="relative"
                ref={menuOpenId === node.id ? menuRootRef : undefined}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId((prev) =>
                      prev === node.id ? null : node.id,
                    );
                  }}
                  className={cx(
                    "inline-flex h-8 w-6 items-center justify-center rounded-lg transition",
                    active ? "hover:bg-white/10" : "hover:bg-slate-100",
                  )}
                  aria-label="more"
                  title="편집"
                >
                  <FiMoreVertical
                    className={cx(
                      "h-4 w-4",
                      active ? "text-white/80" : "text-slate-500",
                    )}
                  />
                </button>

                {menuOpenId === node.id ? (
                  <div className="absolute right-0 z-50 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(null);
                        openDeleteModal(node.id);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-rose-600 hover:bg-rose-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <FiTrash2 className="h-3.5 w-3.5" />
                        {node.kind === "root"
                          ? "루트 삭제"
                          : node.kind === "folder"
                            ? "폴더 삭제"
                            : "파일 삭제"}
                      </span>
                      <span className="text-[10px] text-rose-400">DEL</span>
                    </button>
                  </div>
                ) : null}
              </div>
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

  const renderFolderPanel = () => {
    return (
      <section className="rounded-lg border border-slate-200 bg-white flex flex-col min-h-0 overflow-hidden h-full">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 shrink-0">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-slate-900">
              폴더 구조
            </div>
            <div className="mt-1 text-[12px] text-slate-500 truncate">
              {selectedPath}
            </div>
          </div>
        </div>

        <div className="py-2 pb-4 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-1">{trees.map((t) => renderNode(t, 0))}</div>
        </div>
      </section>
    );
  };

  const PanelShell = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
  }) => {
    return (
      <section className="rounded-lg border border-slate-200 bg-white flex flex-col min-h-0 overflow-hidden h-full">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            {icon}
            <div className="text-[12px] font-semibold text-slate-900">
              {title}
            </div>
          </div>
        </div>
        <div className="p-3 flex-1 min-h-0 overflow-hidden">{children}</div>
      </section>
    );
  };

  /** ✅ PC: (리뉴얼 패널) but "왼쪽" 배치 (기존 유지) */
  const renderDesktopSide = () => {
    const TabBtn = ({
      k,
      label,
      icon,
    }: {
      k: "recent" | "favorite";
      label: string;
      icon: ReactNode;
    }) => {
      const active = desktopTab === k;
      return (
        <button
          type="button"
          onClick={() => setDesktopTab(k)}
          aria-pressed={active}
          className={cx(
            "h-9 flex-1 rounded-lg px-2 text-[12px] font-semibold transition",
            "inline-flex items-center justify-center gap-2",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
            active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600",
          )}
        >
          {icon}
          {label}
        </button>
      );
    };

    const list = (() => {
      if (qLower) {
        return (
          <div className="h-full min-h-0 overflow-y-auto pr-1 pb-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-slate-500">
                검색 결과
              </div>
              <div className="text-[11px] text-slate-500">
                {searchHits.length}
              </div>
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
                {searchHits.map((n) =>
                  renderPickRow({
                    id: n.id,
                    label: n.name,
                    onPick: (id) => openById(id, "search"),
                    highlightQuery: searchQuery,
                  }),
                )}
              </div>
            )}
          </div>
        );
      }

      if (desktopTab === "recent") {
        return (
          <div className="h-full min-h-0 overflow-y-auto pr-1 pb-4">
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
                  }),
                )}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="h-full min-h-0 overflow-y-auto pr-1 pb-4">
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
                }),
              )}
            </div>
          )}
        </div>
      );
    })();

    return (
      <PanelShell
        title="검색 / 활동"
        icon={<FiSearch className="h-4 w-4 text-slate-500" />}
      >
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
          <div className="shrink-0">{renderSearchBox()}</div>

          <div className="shrink-0">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <TabBtn
                k="recent"
                label="최근(파일)"
                icon={<FiClock className="h-3.5 w-3.5" />}
              />
              <TabBtn
                k="favorite"
                label="즐겨찾기"
                icon={<FiStar className="h-3.5 w-3.5" />}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">{list}</div>
        </div>
      </PanelShell>
    );
  };

  /** ✅ 모바일: 검색 결과 overlay (높이에 영향 X) */
  const renderMobileSearchDropdown = () => {
    if (!qLower) return null;

    return (
      <div className="absolute left-0 right-0 top-full mt-2 z-50">
        <div className="rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
            <div className="flex items-center gap-2">
              <FiSearch className="h-3.5 w-3.5 text-slate-500" />
              <div className="text-[12px] font-semibold text-slate-800">
                검색 결과
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              {searchHits.length}
            </div>
          </div>

          <div className="border-b border-slate-200 px-4 py-2">
            <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
              <span className="truncate">{searchQuery.trim()}</span>
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

          <div className="p-2 max-h-[52vh] overflow-y-auto pb-4">
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
                    onPick: (id) => {
                      openById(id, "search");
                      clearQuery();
                    },
                    highlightQuery: searchQuery,
                  }),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMobileSearchBackdrop = () => {
    if (!qLower) return null;
    return (
      <button
        type="button"
        aria-label="close search results"
        onClick={clearQuery}
        className="fixed inset-0 z-20 bg-transparent"
      />
    );
  };

  const renderMobileBody = () => {
    if (mobileMode === "tree") {
      return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 px-4 py-3">
            <div className="text-[12px] font-semibold text-slate-900">
              폴더 구조
            </div>
            <div className="mt-1 truncate text-[12px] text-slate-500">
              {selectedPath}
            </div>
          </div>

          <div
            ref={mobileTreeScrollRef}
            className="flex-1 min-h-0 overflow-y-auto py-2 pb-4"
          >
            <div className="space-y-1">
              {trees.map((t) => renderNode(t, 0))}
            </div>
          </div>
        </div>
      );
    }

    if (mobileMode === "recent") {
      return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-900">
              <FiClock className="h-4 w-4 text-slate-500" />
              최근 선택 (파일만)
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-4">
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
                  }),
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // favorite
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-900">
            <FiStar className="h-4 w-4 text-slate-500" />
            즐겨찾기
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-4">
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
                  onPick: (id) => {
                    const n = nodeById.get(id);
                    if (n?.kind === "folder" || n?.kind === "root") {
                      openPath(id);
                      setSelectedId(id);
                      setMobileMode("tree");
                      // 모드 전환 이후 보이도록 스크롤 강제
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => scrollTreeNodeIntoView(id));
                      });
                      return;
                    }
                    openById(id, "list");
                  },
                }),
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMobile = () => {
    const ModeBtn = ({
      k,
      label,
      icon,
    }: {
      k: "tree" | "recent" | "favorite";
      label: string;
      icon: ReactNode;
    }) => {
      const active = mobileMode === k;
      return (
        <button
          type="button"
          onClick={() => {
            setMobileMode(k);
            if (qLower) clearQuery();
          }}
          aria-pressed={active}
          className={cx(
            "h-9 flex-1 rounded-lg px-2 text-[12px] font-semibold transition",
            "inline-flex items-center justify-center gap-2",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
            active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600",
          )}
        >
          {icon}
          {label}
        </button>
      );
    };

    return (
      <div className="h-full min-h-0 overflow-hidden">
        {renderMobileSearchBackdrop()}

        <section className="relative h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white flex flex-col">
          <div className="relative z-40 shrink-0 border-b border-slate-200 px-4 py-3">
            <div className="relative">
              {renderSearchBox()}
              {renderMobileSearchDropdown()}
            </div>

            <div className="mt-3 rounded-xl bg-slate-100 p-1 flex">
              <ModeBtn
                k="tree"
                label="폴더"
                icon={<FiFolder className="h-3.5 w-3.5" />}
              />
              <ModeBtn
                k="recent"
                label="최근"
                icon={<FiClock className="h-3.5 w-3.5" />}
              />
              <ModeBtn
                k="favorite"
                label="즐겨찾기"
                icon={<FiStar className="h-3.5 w-3.5" />}
              />
            </div>
          </div>

          <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
            {renderMobileBody()}
          </div>
        </section>
      </div>
    );
  };

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
        ref={hostRef}
        style={{ height: hostHeight || undefined }}
        className="min-h-0 overflow-hidden pb-4"
      >
        <div className="h-full min-h-0 overflow-hidden">
          <div className="lg:hidden h-full min-h-0 overflow-hidden">
            {renderMobile()}
          </div>

          <div
            className={cx(
              "hidden lg:grid",
              "h-full min-h-0 overflow-hidden",
              "lg:grid-cols-[320px_32px_minmax(0,1fr)] lg:items-stretch lg:gap-0",
            )}
          >
            <aside className="min-h-0 overflow-hidden lg:h-full lg:pr-1">
              {renderDesktopSide()}
            </aside>

            <div className="hidden lg:flex justify-center lg:h-full">
              <div className="h-full w-px bg-slate-200" />
            </div>

            <div className="min-h-0 overflow-hidden lg:h-full">
              {renderFolderPanel()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
