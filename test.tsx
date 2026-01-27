// src/features/protected/shell/notes/components/NotesView.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiSearch,
  FiStar,
  FiX,
  FiClock,
  FiFolder,
  FiFileText,
  FiPlus,
  FiArrowRight,
} from "react-icons/fi";

import {
  db,
  useDB,
  useTable,
  type RootRow,
  type FolderRow,
  type NoteRow,
} from "@/lib/data";

// ✅ 모바일/PC 모두 폴더구조는 FolderPickerPanel로 통일
import FolderPickerPanel from "@/features/protected/shell/notes/new/components/FolderPickerPanel";

// ✅ 좌측 검색/활동 패널 컴포넌트
import SearchActivityPanel from "./NotesView/SearchActivityPanel";

// ✅ 기존 프로젝트에 있는 삭제 모달 컴포넌트
import DeleteConfirmModal from "./DeleteConfirmModal";

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

  // attach notes (folder_id 있는 것만)
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

  // sort: folder 먼저(폴더는 order 우선), 그 다음 note
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

function collectDefaultOpenIds(node: TreeNode, out: string[]) {
  if (node.kind !== "note") out.push(node.id);
  for (const c of node.children ?? []) collectDefaultOpenIds(c, out);
}

/** ✅ 폴더 구조가 비어있을 때(루트만 있고 children 없음) 생성 유도 */
function EmptyNotesTreeCta({ onCreateNote }: { onCreateNote: () => void }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <FiFolder className="h-5 w-5 text-slate-600" />
        </div>

        <div className="mt-4 text-base font-semibold text-slate-900">
          폴더 구조가 비어있어요
        </div>
        <div className="mt-2 text-xs leading-snug text-slate-600">
          노트를 하나 만들면 폴더/파일이 여기 자동으로 채워져요.
        </div>

        <button
          type="button"
          onClick={onCreateNote}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:bg-slate-900"
        >
          <FiPlus className="h-4 w-4" />
          노트 생성하기
          <FiArrowRight className="h-4 w-4 opacity-90" />
        </button>

        <div className="mt-3 text-xs text-slate-500">
          바로 생성 페이지로 이동합니다.
        </div>
      </div>
    </div>
  );
}

export default function NotesView() {
  const router = useRouter();

  // ✅ 브라우저(바디) 스크롤 차단
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
    (db as any)?.ensure?.();
  }, []);

  const dbState = useDB() as any;

  const roots: RootRow[] = Array.isArray(dbState?.roots)
    ? dbState.roots
    : Array.isArray(dbState?.data?.roots)
      ? dbState.data.roots
      : [];

  const folders: FolderRow[] = Array.isArray(dbState?.folders)
    ? dbState.folders
    : Array.isArray(dbState?.data?.folders)
      ? dbState.data.folders
      : [];

  const notes: NoteRow[] = Array.isArray(dbState?.notes)
    ? dbState.notes
    : Array.isArray(dbState?.data?.notes)
      ? dbState.data.notes
      : [];

  const rootsRaw = roots;
  const foldersRaw = folders;

  const trees = useMemo(() => {
    return buildTreesFromDB(
      (roots ?? []) as RootRow[],
      (folders ?? []) as FolderRow[],
      (notes ?? []) as NoteRow[],
    );
  }, [roots, folders, notes]);

  const { parent, nodeById } = useMemo(() => buildIndex(trees), [trees]);

  const treeEmpty = useMemo(() => {
    if (!trees.length) return true;
    return !trees.some((t) => (t.children?.length ?? 0) > 0);
  }, [trees]);

  // ===== search (IME 안정화) =====
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

  // ✅ 모바일: 폴더/최근/즐겨찾기 모드 토글
  const [mobileMode, setMobileMode] = useState<"tree" | "recent" | "favorite">(
    "tree",
  );

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // ✅ 높이 고정
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hostHeight, setHostHeight] = useState<number>(0);

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

  // =========================================================
  // ✅ Favorites (테이블명: FolderTreePanel과 동일하게)
  //   - root: user_root_favorites(root_id)
  //   - folder: user_folder_favorites(folder_id)
  //   - note: note_favorites(note_id)
  // =========================================================
  const rootFavRows = useTable("user_root_favorites") as any[];
  const folderFavRows = useTable("user_folder_favorites") as any[];
  const noteFavRows = useTable("note_favorites") as any[];

  const favoriteRootIds = useMemo(() => {
    return new Set(
      (rootFavRows ?? []).map((r) => String(r?.root_id ?? "")).filter(Boolean),
    );
  }, [rootFavRows]);

  const favoriteFolderIds = useMemo(() => {
    return new Set(
      (folderFavRows ?? [])
        .map((r) => String(r?.folder_id ?? ""))
        .filter(Boolean),
    );
  }, [folderFavRows]);

  const favoriteNoteIds = useMemo(() => {
    return new Set(
      (noteFavRows ?? []).map((r) => String(r?.note_id ?? "")).filter(Boolean),
    );
  }, [noteFavRows]);

  // ✅ toggle (root/folder/note)
  const favBusyRef = useRef<Set<string>>(new Set());
  const toggleAnyFavorite = (kind: TreeKind, id: string) => {
    const key = `${kind}:${id}`;
    if (favBusyRef.current.has(key)) return;
    favBusyRef.current.add(key);

    const run = async () => {
      try {
        if (kind === "note") {
          const fn = (db as any)?.toggleFavorite;
          if (typeof fn !== "function") return;
          await fn(id);
          return;
        }
        if (kind === "folder") {
          const fn = (db as any)?.toggleFolderFavorite;
          if (typeof fn !== "function") return;
          await fn(id);
          return;
        }
        if (kind === "root") {
          const fn = (db as any)?.toggleRootFavorite;
          if (typeof fn !== "function") return;
          await fn(id);
          return;
        }
      } catch (e) {
        console.error("[NotesView] toggle favorite failed:", e);
      } finally {
        // refresh는 db쪽에서 하고 있을 가능성이 높지만, 안전하게 한번 더
        try {
          await (db as any)?.refresh?.();
        } catch {}
      }
    };

    void Promise.resolve(run()).finally(() => {
      favBusyRef.current.delete(key);
    });
  };

  // ✅ 최초 1회: open / selected / recent
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

    bootRef.current = true;
  }, [roots, trees]);

  // ✅ 데이터 변경 시: 삭제된 id 정리
  useEffect(() => {
    if (!bootRef.current) return;

    setOpenIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) if (nodeById.has(id)) next.add(id);
      for (const t of trees) next.add(t.id);
      return next;
    });

    setRecent((prev) => prev.filter((r) => nodeById.has(r.id)));

    if (!selectedId || !nodeById.has(selectedId)) {
      setSelectedId(trees[0]?.id ?? "");
    }
  }, [nodeById, selectedId, trees]);

  const qLower = searchQuery.trim().toLowerCase();

  const searchHits = useMemo(() => {
    if (!qLower) return [];
    const hits: TreeNode[] = [];
    for (const t of trees) collectSearchHits(t, qLower, hits);
    return hits.slice(0, 32);
  }, [trees, qLower]);

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

  // ✅ 즐겨찾기: root/folder/note 모두 표시 (A안)
  const favoriteItems = useMemo(() => {
    const out: Array<{ id: string; label: string; kind: TreeKind }> = [];

    for (const id of Array.from(favoriteRootIds)) {
      const n = nodeById.get(id);
      if (!n || n.kind !== "root") continue;
      out.push({ id, label: n.name, kind: "root" });
    }

    for (const id of Array.from(favoriteFolderIds)) {
      const n = nodeById.get(id);
      if (!n || n.kind !== "folder") continue;
      out.push({ id, label: n.name, kind: "folder" });
    }

    for (const id of Array.from(favoriteNoteIds)) {
      const n = nodeById.get(id);
      if (!n || n.kind !== "note") continue;
      out.push({ id, label: n.name, kind: "note" });
    }

    const rank = (k: TreeKind) => (k === "root" ? 0 : k === "folder" ? 1 : 2);
    out.sort((a, b) => {
      const ra = rank(a.kind);
      const rb = rank(b.kind);
      if (ra !== rb) return ra - rb;
      return a.label.localeCompare(b.label, "ko");
    });

    return out;
  }, [favoriteRootIds, favoriteFolderIds, favoriteNoteIds, nodeById]);

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

  // ✅ 삭제
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

  const confirmDelete = async () => {
    const id = pendingDeleteId;
    if (!id) return;

    const node = nodeById.get(id);
    if (!node) return;

    try {
      if (node.kind === "root") {
        await db.deleteRoot(id);
      } else if (node.kind === "folder") {
        await db.deleteFolder(id);
      } else {
        await db.deleteNote(id);
      }

      await (db as any)?.refresh?.();

      const removedAll: string[] = [];
      collectAllIds(node, removedAll);
      const removedSet = new Set(removedAll);

      setRecent((prev) => prev.filter((v) => !removedSet.has(v.id)));

      setOpenIds((prev) => {
        const next = new Set(prev);
        for (const rid of removedSet) next.delete(rid);
        for (const r of db.getTable("roots")) next.add(String((r as any).id));
        return next;
      });

      const nextRoots = db.getTable("roots");
      setSelectedId((prev) =>
        removedSet.has(prev) ? (nextRoots[0]?.id ?? "") : prev,
      );
    } catch (e) {
      console.error("[NotesView] delete failed:", e);
    } finally {
      closeDeleteModal();
    }
  };

  const openPath = (id: string) => {
    const ids = pathIds(parent, id);
    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const pid of ids) next.add(pid);
      return next;
    });
  };

  // ✅ A안: note는 라우팅, folder/root는 트리에서 열고 선택
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

  // =========================================
  // ✅ FolderPickerPanel selection bridge
  // =========================================
  const { selectedRootId, selectedFolderId } = useMemo(() => {
    const n = selectedId ? nodeById.get(selectedId) : null;
    if (!n)
      return {
        selectedRootId: null as string | null,
        selectedFolderId: null as string | null,
      };

    const ids = pathIds(parent, n.id);
    const rootId = ids[0] ?? null;

    if (n.kind === "root") {
      return { selectedRootId: n.id, selectedFolderId: null };
    }
    if (n.kind === "folder") {
      return { selectedRootId: rootId, selectedFolderId: n.id };
    }

    const folderId = ids.length >= 2 ? ids[ids.length - 2] : null;
    return { selectedRootId: rootId, selectedFolderId: folderId };
  }, [selectedId, nodeById, parent]);

  const onPickLocation = (v: {
    rootId: string | null;
    folderId: string | null;
  }) => {
    const id = v.folderId ?? v.rootId;
    if (!id) return;
    setSelectedId(id);
    openPath(id);
  };

  const onCloseFolderPicker = () => {
    // NotesView에서는 패널이 고정 노출이라 noop
  };

  const renderFolderPanel = () => {
    return (
      <section className="rounded-lg border border-slate-200 bg-white flex flex-col min-h-0 overflow-hidden h-full">
        {treeEmpty ? (
          <EmptyNotesTreeCta onCreateNote={() => router.push("/notes/new")} />
        ) : (
          <FolderPickerPanel
            mode="list"
            roots={rootsRaw}
            folders={foldersRaw}
            selectedRootId={selectedRootId}
            selectedFolderId={selectedFolderId}
            onPick={onPickLocation}
            onClose={onCloseFolderPicker}
          />
        )}
      </section>
    );
  };

  // =========================
  // ✅ 모바일 UI
  // =========================
  const renderMobileBody = () => {
    if (mobileMode === "tree") {
      return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div
            ref={mobileTreeScrollRef}
            className="flex-1 min-h-0 overflow-hidden"
          >
            {treeEmpty ? (
              <EmptyNotesTreeCta
                onCreateNote={() => router.push("/notes/new")}
              />
            ) : (
              <FolderPickerPanel
                mode="list"
                roots={rootsRaw}
                folders={foldersRaw}
                selectedRootId={selectedRootId}
                selectedFolderId={selectedFolderId}
                onPick={onPickLocation}
                onClose={onCloseFolderPicker}
              />
            )}
          </div>
        </div>
      );
    }

    if (mobileMode === "recent") {
      return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <FiClock className="h-4 w-4 text-slate-500" />
              최근 선택 (파일만)
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-4">
            {recentItems.length === 0 ? (
              <div className="px-2 py-2 text-xs text-slate-500">
                최근 선택 없음
              </div>
            ) : (
              <div className="space-y-1">
                {recentItems.map((it) => (
                  <div
                    key={it.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openById(it.id, "list")}
                    className={cx(
                      "w-full rounded-lg px-3 py-2 text-left transition",
                      "bg-slate-50 hover:bg-slate-100",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {it.label}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs font-semibold text-slate-500">
                        {formatHHMM(it.ts)}
                      </div>
                    </div>
                  </div>
                ))}
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
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <FiStar className="h-4 w-4 text-slate-500" />
            즐겨찾기
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-4">
          {favoriteItems.length === 0 ? (
            <div className="px-2 py-2 text-xs text-slate-500">
              즐겨찾기 없음
            </div>
          ) : (
            <div className="space-y-1">
              {favoriteItems.map((it) => (
                <div
                  key={`${it.kind}:${it.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openById(it.id, "list")}
                  className={cx(
                    "w-full rounded-lg px-3 py-2 text-left transition",
                    "bg-slate-50 hover:bg-slate-100",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                  )}
                >
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {it.label}
                  </div>
                </div>
              ))}
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
            if (qLower) {
              setQuery("");
              setSearchQuery("");
            }
          }}
          aria-pressed={active}
          className={cx(
            "h-9 flex-1 rounded-lg px-2 text-xs font-semibold transition",
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
        <section className="relative h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white flex flex-col">
          <div className="relative z-40 shrink-0 border-b border-slate-200 px-4 py-3">
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
                  className="w-full bg-transparent py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                {query.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSearchQuery("");
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    aria-label="clear"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>
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
      <div
        ref={hostRef}
        style={{ height: hostHeight || undefined }}
        className="min-h-0 overflow-hidden pb-4"
      >
        <div className="h-full min-h-0 overflow-hidden">
          {/* MOBILE */}
          <div className="lg:hidden h-full min-h-0 overflow-hidden">
            {renderMobile()}
          </div>

          {/* DESKTOP */}
          <div
            className={cx(
              "hidden lg:grid",
              "h-full min-h-0 overflow-hidden",
              "lg:grid-cols-[320px_minmax(0,1fr)]",
              "xl:grid-cols-[360px_minmax(0,1fr)]",
              "lg:gap-6",
              "lg:px-6",
            )}
          >
            {/* LEFT: 검색/활동 */}
            <aside className="min-h-0 overflow-hidden lg:h-full">
              <SearchActivityPanel
                query={query}
                setQuery={setQuery}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isComposing={isComposing}
                setIsComposing={setIsComposing}
                qLower={qLower}
                searchHits={searchHits}
                recentItems={recentItems}
                favoriteItems={favoriteItems}
                favoriteRootIds={favoriteRootIds}
                favoriteFolderIds={favoriteFolderIds}
                favoriteNoteIds={favoriteNoteIds}
                toggleAnyFavorite={toggleAnyFavorite}
                getNodeKind={(id) => nodeById.get(id)?.kind ?? null}
                getNodeParentPathText={nodeParentPathText}
                openById={openById}
                openPath={openPath}
                setSelectedId={setSelectedId}
                formatHHMM={formatHHMM}
              />
            </aside>

            {/* MAIN: 폴더 구조 */}
            <div className="min-h-0 overflow-hidden lg:h-full">
              <section className="h-full min-h-0 overflow-hidden">
                {renderFolderPanel()}
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 삭제 모달 (파일로 import해서 사용) */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        title={deleteModalText.title}
        description={deleteModalText.desc}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </>
  );
}
