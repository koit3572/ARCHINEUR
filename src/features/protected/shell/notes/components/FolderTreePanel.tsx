// src/features/protected/shell/notes/components/FolderTreePanel.tsx
"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

import { useRouter } from "next/navigation";
import { FiX, FiPlus, FiStar } from "react-icons/fi";

import { db, useTable } from "@/lib/data";
import ConfirmModal from "@/components/modal/ConfirmModal";

// ✅ 외부화한 UI 조각들
import CreateRow from "./FolderTreePanel/CreateRow";
import IconBtn from "./FolderTreePanel/IconBtn";
import MoreMenu from "./FolderTreePanel/MoreMenu";
import TreeRow from "./FolderTreePanel/TreeRow";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type RootLike = {
  id: string;
  title?: string;
  name?: string;
};

type FolderLike = {
  id: string;
  title?: string;
  name?: string;

  rootId?: string;
  root_id?: string;

  parentId?: string | null;
  parent_id?: string | null;

  order?: number | null;
};

type FolderNode = {
  id: string;
  rootId: string;
  parentId: string | null;
  name: string;
  children: FolderNode[];
};

type NoteNode = {
  id: string;
  rootId: string;
  folderId: string | null;
  title: string;
  order: number | null;
};

function s(v: any) {
  return String(v ?? "").trim();
}

/** ✅ 여기서 절대 preventDefault 하지 말 것 */
function stopBubble(e: any) {
  e.stopPropagation?.();
}

export default function FolderTreePanel({
  mode = "create",
  roots,
  folders,
  headerTitle = "폴더 구조",
  headerSubtitle,
  showClose = false,
  onClose,
  selectedRootId,
  selectedFolderId,
  onPick,
  showFooter = true,
  footerLeftLabel = "현재 선택",
  confirmText,
  confirmDisabled,
  onConfirm,
  allowRootCreate = true,
  allowFolderCreate = true,
  allowDeleteRoot = true,
  allowDeleteFolder = true,
  allowDeleteNote = true,
  sectionClassName,
}: {
  /** ✅ create: 노트생성(저장 위치 선택) / list: 노트목록(노트 선택 후 이동) */
  mode?: "create" | "list";

  roots: RootLike[];
  folders: FolderLike[];

  headerTitle?: string;
  headerSubtitle?: string;

  showClose?: boolean;
  onClose?: () => void;

  selectedRootId: string | null;
  selectedFolderId: string | null;

  onPick: (v: { rootId: string | null; folderId: string | null }) => void;

  showFooter?: boolean;
  footerLeftLabel?: string;
  confirmText?: string;
  confirmDisabled?: boolean;
  onConfirm?: (v: { rootId: string | null; folderId: string | null }) => void;

  allowRootCreate?: boolean;
  allowFolderCreate?: boolean;
  allowDeleteRoot?: boolean;
  allowDeleteFolder?: boolean;
  allowDeleteNote?: boolean;

  sectionClassName?: string;
}) {
  const isCreateMode = mode === "create";
  const isListMode = mode === "list";
  const headerSubtitleFinal =
    headerSubtitle ??
    (isCreateMode ? "저장할 위치를 선택하세요." : "열 노트를 선택하세요.");
  /* =========================
     ✅ ConfirmModal
  ========================= */
  const [confirmUI, setConfirmUI] = useState<{
    open: boolean;
    title: string;
    description?: string;
    tone?: "default" | "danger";
    confirmText?: string;
    cancelText?: string;
    confirmDisabled?: boolean;
    onConfirm?: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    tone: "default",
    confirmText: "확인",
    cancelText: "취소",
    confirmDisabled: false,
    onConfirm: undefined,
  });

  const closeConfirm = () =>
    setConfirmUI((p) => ({ ...p, open: false, onConfirm: undefined }));

  const openConfirm = (v: {
    title: string;
    description?: string;
    tone?: "default" | "danger";
    confirmText?: string;
    cancelText?: string;
    confirmDisabled?: boolean;
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmUI({
      open: true,
      title: v.title,
      description: v.description,
      tone: v.tone ?? "default",
      confirmText: v.confirmText ?? "확인",
      cancelText: v.cancelText ?? "취소",
      confirmDisabled: !!v.confirmDisabled,
      onConfirm: async () => {
        try {
          await v.onConfirm();
        } finally {
          closeConfirm();
        }
      },
    });
  };

  /* =========================
     ✅ Notes snapshot (트리 표기용)
     - 주의: 네 notes 테이블은 folder_id만 있고 root_id는 없음.
       그래서 notesNorm에서 rootId는 folders를 통해 역추적한다.
  ========================= */
  const noteRows = useTable("notes") as any[];

  const foldersNormForNote = useMemo(() => {
    return (folders ?? [])
      .map((f: any) => ({
        id: s(f?.id),
        rootId: s(f?.rootId ?? f?.root_id),
      }))
      .filter((f) => !!f.id && !!f.rootId);
  }, [folders]);

  const folderIdToRootId = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of foldersNormForNote) m.set(f.id, f.rootId);
    return m;
  }, [foldersNormForNote]);

  const notesNorm = useMemo((): NoteNode[] => {
    const list = (noteRows ?? [])
      .map((n: any) => {
        const id = s(n?.id);
        const folderId = s(n?.folderId ?? n?.folder_id) || null;
        const title = s(n?.title ?? n?.name ?? "노트");

        const directRootId = s(n?.rootId ?? n?.root_id) || "";
        const viaFolderRootId = folderId
          ? s(folderIdToRootId.get(folderId))
          : "";
        const rootId = directRootId || viaFolderRootId;

        // ✅ order도 쓰고 있다면 여기서 같이 넣어줘(없으면 빼도 됨)
        const orderRaw = (n as any)?.order;
        const order = Number.isFinite(Number(orderRaw))
          ? Number(orderRaw)
          : null;

        return { id, rootId, folderId, title, order };
      })
      .filter((n) => !!n.id && !!n.rootId);

    // ✅ (핵심) 같은 id가 2번 섞여 들어오면 1개만 남김
    const seen = new Set<string>();
    const uniq: any[] = [];
    for (const n of list) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      uniq.push(n);
    }
    return uniq as NoteNode[];
  }, [noteRows, folderIdToRootId]);

  /* =========================
     ✅ Favorites snapshot
  ========================= */
  const folderFavRows = useTable("user_folder_favorites") as any[];
  const rootFavRows = useTable("user_root_favorites") as any[];
  const noteFavRows = useTable("note_favorites") as any[];

  const baseFavoriteFolderIds = useMemo(() => {
    return new Set(
      (folderFavRows ?? []).map((r) => s(r?.folder_id)).filter(Boolean),
    );
  }, [folderFavRows]);

  const baseFavoriteRootIds = useMemo(() => {
    return new Set(
      (rootFavRows ?? []).map((r) => s(r?.root_id)).filter(Boolean),
    );
  }, [rootFavRows]);

  const baseFavoriteNoteIds = useMemo(() => {
    return new Set(
      (noteFavRows ?? []).map((r) => s(r?.note_id)).filter(Boolean),
    );
  }, [noteFavRows]);

  /* =========================
     ✅ 낙관적 UI override
  ========================= */
  const [favOverride, setFavOverride] = useState<Map<string, boolean>>(
    () => new Map(),
  );

  const favoriteFolderIds = useMemo(() => {
    const set = new Set(baseFavoriteFolderIds);
    for (const [k, v] of favOverride.entries()) {
      if (!k.startsWith("folder:")) continue;
      const id = k.slice("folder:".length);
      if (v) set.add(id);
      else set.delete(id);
    }
    return set;
  }, [baseFavoriteFolderIds, favOverride]);

  const favoriteRootIds = useMemo(() => {
    const set = new Set(baseFavoriteRootIds);
    for (const [k, v] of favOverride.entries()) {
      if (!k.startsWith("root:")) continue;
      const id = k.slice("root:".length);
      if (v) set.add(id);
      else set.delete(id);
    }
    return set;
  }, [baseFavoriteRootIds, favOverride]);

  const favoriteNoteIds = useMemo(() => {
    const set = new Set(baseFavoriteNoteIds);
    for (const [k, v] of favOverride.entries()) {
      if (!k.startsWith("note:")) continue;
      const id = k.slice("note:".length);
      if (v) set.add(id);
      else set.delete(id);
    }
    return set;
  }, [baseFavoriteNoteIds, favOverride]);

  /* =========================
     ✅ pending / error
  ========================= */
  const [favPending, setFavPending] = useState<Set<string>>(() => new Set());
  const favPendingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    favPendingRef.current = favPending;
  }, [favPending]);

  const [favError, setFavError] = useState<Map<string, string>>(
    () => new Map(),
  );

  const markPending = (key: string, on: boolean) => {
    setFavPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const setErr = (key: string, msg: string | null) => {
    setFavError((prev) => {
      const next = new Map(prev);
      if (!msg) next.delete(key);
      else next.set(key, msg);
      return next;
    });
  };

  const setOverride = (key: string, val: boolean | null) => {
    setFavOverride((prev) => {
      const next = new Map(prev);
      if (val === null) next.delete(key);
      else next.set(key, val);
      return next;
    });
  };

  const clearOverride = (key: string) => setOverride(key, null);

  /** ✅ 성공 후 DB refresh (즐겨찾기만) */
  async function syncFolderFavorites() {
    const fn = (db as any)?.refreshFolderFavorites;
    if (typeof fn === "function") await fn();
    else await (db as any)?.refresh?.();
  }
  async function syncRootFavorites() {
    const fn = (db as any)?.refreshRootFavorites;
    if (typeof fn === "function") await fn();
    else await (db as any)?.refresh?.();
  }
  async function syncNoteFavorites() {
    const fn = (db as any)?.refreshNoteFavorites;
    if (typeof fn === "function") await fn();
    else await (db as any)?.refresh?.();
  }

  function toggleFolderFavorite(folderId: string) {
    const key = `folder:${folderId}`;
    if (favPendingRef.current.has(key)) return;

    const api = (db as any)?.toggleFolderFavorite;
    if (typeof api !== "function") {
      console.error("db.toggleFolderFavorite 없음 (import/export 확인)");
      setErr(key, "toggle API 없음");
      return;
    }

    const wasFav = favoriteFolderIds.has(folderId);
    const nextFav = !wasFav;

    markPending(key, true);
    setErr(key, null);
    setOverride(key, nextFav);

    void Promise.resolve(api(folderId))
      .then(async () => {
        clearOverride(key);
        await syncFolderFavorites();
      })
      .catch((e: any) => {
        console.error("toggleFolderFavorite failed:", e);
        setOverride(key, wasFav);
        setErr(key, String(e?.message ?? "즐겨찾기 실패"));
      })
      .finally(() => {
        markPending(key, false);
      });
  }

  function toggleRootFavorite(rootId: string) {
    const key = `root:${rootId}`;
    if (favPendingRef.current.has(key)) return;

    const api = (db as any)?.toggleRootFavorite;
    if (typeof api !== "function") {
      console.error("db.toggleRootFavorite 없음 (import/export 확인)");
      setErr(key, "toggle API 없음");
      return;
    }

    const wasFav = favoriteRootIds.has(rootId);
    const nextFav = !wasFav;

    markPending(key, true);
    setErr(key, null);
    setOverride(key, nextFav);

    void Promise.resolve(api(rootId))
      .then(async () => {
        clearOverride(key);
        await syncRootFavorites();
      })
      .catch((e: any) => {
        console.error("toggleRootFavorite failed:", e);
        setOverride(key, wasFav);
        setErr(key, String(e?.message ?? "즐겨찾기 실패"));
      })
      .finally(() => {
        markPending(key, false);
      });
  }

  function toggleNoteFavorite(noteId: string) {
    const key = `note:${noteId}`;
    if (favPendingRef.current.has(key)) return;

    const api = (db as any)?.toggleFavorite; // ✅ index.ts에 존재 (note favorites)
    if (typeof api !== "function") {
      console.error("db.toggleFavorite 없음 (index.ts export 확인)");
      setErr(key, "toggle API 없음");
      return;
    }

    const wasFav = favoriteNoteIds.has(noteId);
    const nextFav = !wasFav;

    markPending(key, true);
    setErr(key, null);
    setOverride(key, nextFav);

    void Promise.resolve(api(noteId))
      .then(async () => {
        clearOverride(key);
        await syncNoteFavorites();
      })
      .catch((e: any) => {
        console.error("toggleFavorite(note) failed:", e);
        setOverride(key, wasFav);
        setErr(key, String(e?.message ?? "즐겨찾기 실패"));
      })
      .finally(() => {
        markPending(key, false);
      });
  }

  /* =========================
     선택/오픈 상태
  ========================= */
  const router = useRouter();

  const [pending, setPending] = useState<{
    rootId: string | null;
    folderId: string | null;
  }>({ rootId: selectedRootId, folderId: selectedFolderId });

  /** ✅ 노트목록용: 선택된 노트 */
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  useEffect(() => {
    setPending({ rootId: selectedRootId, folderId: selectedFolderId });
  }, [selectedRootId, selectedFolderId]);

  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  /* =========================
   ✅ 외부 선택(selectedRootId/selectedFolderId) 반영
   - 루트/폴더 자동 펼침
   - 해당 줄로 스크롤 이동
   - 잠깐 강조(플래시)
========================= */
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const rowElsRef = useRef<Map<string, HTMLElement>>(new Map());

  const setRowEl = useCallback((key: string) => {
    return (el: HTMLElement | null) => {
      if (!key) return;
      if (!el) rowElsRef.current.delete(key);
      else rowElsRef.current.set(key, el);
    };
  }, []);

  const [flashKey, setFlashKey] = useState<string | null>(null);

  useEffect(() => {
    // ✅ 외부에서 선택값이 들어오면 패널 내부 pending도 맞춤
    setPending({ rootId: selectedRootId, folderId: selectedFolderId });
  }, [selectedRootId, selectedFolderId]);

  useLayoutEffect(() => {
    // ✅ 선택된 루트/폴더 자동 펼침
    const ids: string[] = [];
    if (selectedRootId) ids.push(selectedRootId);
    const key = selectedFolderId ?? selectedRootId;
    if (!key) return;

    // ✅ root/folder면 조상까지 전부 펼쳐서 “key가 실제로 보이게”
    if (selectedFolderId && selectedRootId) {
      ensureOpenForFolder(selectedRootId, selectedFolderId);
    } else if (selectedRootId) {
      ensureOpen([selectedRootId]);
    }

    scrollToKey(key);
    setFlashKey(key);

    const t = window.setTimeout(() => setFlashKey(null), 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRootId, selectedFolderId]);

  useLayoutEffect(() => {
    // ✅ 모바일 포함: 내부 pending 변경도 PC UX(스크롤/플래시) 적용
    const key = pending.folderId ?? pending.rootId;
    if (!key) return;

    // ✅ 펼침 보장
    if (pending.rootId && pending.folderId) {
      ensureOpenForFolder(pending.rootId, pending.folderId);
    } else if (pending.rootId) {
      ensureOpen([pending.rootId]);
    }

    // ✅ 스크롤 + 플래시
    scrollToKey(key);
    setFlashKey(key);

    const t = window.setTimeout(() => setFlashKey(null), 650);
    return () => window.clearTimeout(t);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.rootId, pending.folderId]);

  useEffect(() => {
    const rootIds = (roots ?? []).map((r) => s(r.id)).filter(Boolean);
    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const id of rootIds) next.add(id);
      return next;
    });
  }, [roots]);

  const [createTarget, setCreateTarget] = useState<{
    rootId: string;
    parentId: string | null;
  } | null>(null);

  const [rootCreateOpen, setRootCreateOpen] = useState(false);
  const [newRootName, setNewRootName] = useState("");
  const [rootCreateError, setRootCreateError] = useState("");

  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string>("");

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  /** ✅ 패널 전체 ref로 outside-click 처리 */
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpenId) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      const root = panelRef.current;
      if (!root || !root.contains(t)) {
        setMenuOpenId(null);
        return;
      }

      const menuEl = root.querySelector(`[data-menu-open-id="${menuOpenId}"]`);
      if (menuEl && !menuEl.contains(t)) setMenuOpenId(null);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [menuOpenId]);

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function ensureOpen(ids: string[]) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  // ✅ folderId를 받으면: root + 조상 폴더들 + 자기 자신까지 전부 펼친다
  const folderIdToParentId = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const f of folders ?? []) {
      const id = s((f as any).id);
      if (!id) continue;
      const parentId = s((f as any).parentId ?? (f as any).parent_id) || null;
      m.set(id, parentId);
    }
    return m;
  }, [folders]);

  function ensureOpenForFolder(rootId: string, folderId: string) {
    const ids: string[] = [];
    if (rootId) ids.push(rootId);

    let cur: string | null = folderId;
    let guard = 0;

    while (cur && guard < 50) {
      ids.push(cur);
      cur = folderIdToParentId.get(cur) ?? null;
      guard += 1;
    }

    if (ids.length) ensureOpen(ids);
  }

  function getNextOrder(rootId: string, parentId: string | null) {
    const list = (folders ?? [])
      .map((f: any) => ({
        rootId: s(f.rootId ?? f.root_id),
        parentId: s(f.parentId ?? f.parent_id) || null,
        order: Number.isFinite(Number(f.order)) ? Number(f.order) : null,
      }))
      .filter((x) => x.rootId === rootId && x.parentId === parentId);

    let max = 0;
    for (const x of list) {
      if (typeof x.order === "number" && x.order > max) max = x.order;
    }
    return max + 1;
  }

  function scrollToKey(key: string) {
    const tryScroll = () => {
      const el = rowElsRef.current.get(key);
      if (!el) return false;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      return true;
    };

    if (tryScroll()) return;

    // ✅ 아직 ref가 없으면 다음 프레임에 재시도(모바일에서 더 자주 발생)
    requestAnimationFrame(() => {
      tryScroll();
    });
  }

  const { rootsSorted, treeByRoot, notesByFolder, notesByRoot } =
    useMemo(() => {
      const rootsSorted = [...(roots ?? [])]
        .map((r) => ({
          id: s(r.id),
          name: s(r.title ?? r.name ?? "루트"),
        }))
        .filter((r) => !!r.id)
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));

      const foldersNorm = (folders ?? [])
        .map((f) => {
          const rootId = s((f as any).rootId ?? (f as any).root_id);
          const parentId =
            s((f as any).parentId ?? (f as any).parent_id) || null;
          const name = s((f as any).name ?? (f as any).title ?? "폴더");
          return { id: s((f as any).id), rootId, parentId, name };
        })
        .filter((f) => !!f.id && !!f.rootId);

      const byRoot = new Map<string, Map<string, FolderNode>>();
      for (const f of foldersNorm) {
        if (!byRoot.has(f.rootId)) byRoot.set(f.rootId, new Map());
        byRoot.get(f.rootId)!.set(f.id, { ...f, children: [] });
      }

      for (const [, map] of byRoot.entries()) {
        for (const node of map.values()) {
          if (node.parentId && map.has(node.parentId)) {
            map.get(node.parentId)!.children.push(node);
          }
        }
        for (const node of map.values()) {
          node.children.sort((a, b) => a.name.localeCompare(b.name, "ko"));
        }
      }

      const treeByRoot = new Map<string, FolderNode[]>();
      for (const [rootId, map] of byRoot.entries()) {
        const tops = Array.from(map.values()).filter(
          (n) => !n.parentId || !map.has(n.parentId),
        );
        tops.sort((a, b) => a.name.localeCompare(b.name, "ko"));
        treeByRoot.set(rootId, tops);
      }

      const notesByFolder = new Map<string, NoteNode[]>();
      const notesByRoot = new Map<string, NoteNode[]>();

      for (const n of notesNorm) {
        // ✅ 루트 직속 노트
        if (n.folderId === null) {
          if (!n.rootId) continue;
          if (!notesByRoot.has(n.rootId)) notesByRoot.set(n.rootId, []);
          notesByRoot.get(n.rootId)!.push(n);
          continue;
        }

        // ✅ 폴더 아래 노트
        if (!notesByFolder.has(n.folderId)) notesByFolder.set(n.folderId, []);
        notesByFolder.get(n.folderId)!.push(n);
      }

      const cmpNote = (a: NoteNode, b: NoteNode) => {
        const ao = a.order;
        const bo = b.order;

        // ✅ 둘 다 order 있으면 order 우선
        if (ao !== null && bo !== null) return ao - bo;

        // ✅ 한쪽만 order 있으면 그쪽이 "예외 순번"이니까 앞으로
        if (ao !== null && bo === null) return -1;
        if (ao === null && bo !== null) return 1;

        // ✅ 둘 다 null이면 일반 폴더처럼 가나다
        return a.title.localeCompare(b.title, "ko");
      };

      for (const [, list] of notesByFolder.entries()) list.sort(cmpNote);
      for (const [, list] of notesByRoot.entries()) list.sort(cmpNote);

      return { rootsSorted, treeByRoot, notesByFolder, notesByRoot };
    }, [roots, folders, notesNorm]);

  /* =========================
     구조 변경(생성/삭제)
  ========================= */
  async function createFolder(
    rootId: string,
    parentId: string | null,
    name: string,
  ) {
    const fn = (db as any)?.createFolder;
    if (typeof fn !== "function") {
      throw new Error(
        "db.createFolder 함수가 없습니다 (import/export 확인 필요)",
      );
    }

    const order = getNextOrder(rootId, parentId);

    await fn({
      root_id: rootId,
      parent_id: parentId,
      name,
      order,
    });
  }

  async function deleteFolder(folderId: string) {
    const fn = (db as any)?.deleteFolder;
    if (typeof fn !== "function") {
      throw new Error(
        "db.deleteFolder 함수가 없습니다 (import/export 확인 필요)",
      );
    }
    await fn(folderId);
    await syncFolderFavorites();
  }

  async function createRoot(name: string) {
    const fn = (db as any)?.createRoot;
    if (typeof fn !== "function") {
      throw new Error(
        "db.createRoot 함수가 없습니다 (import/export 확인 필요)",
      );
    }

    try {
      await fn({ name });
    } catch {
      try {
        await fn({ title: name });
      } catch {
        await fn(name);
      }
    }
  }

  async function deleteRoot(rootId: string) {
    const fn = (db as any)?.deleteRoot;
    if (typeof fn !== "function") {
      throw new Error("db.deleteRoot 함수가 없습니다");
    }
    await fn(rootId);

    await syncRootFavorites();
    await syncFolderFavorites();
  }

  async function deleteNote(noteId: string) {
    const fn = (db as any)?.deleteNote;
    if (typeof fn !== "function") {
      throw new Error(
        "db.deleteNote 함수가 없습니다 (import/export 확인 필요)",
      );
    }
    await fn(noteId);
  }

  function renderCreateRow(
    rootId: string,
    parentId: string | null,
    depth: number,
  ) {
    const active =
      createTarget?.rootId === rootId && createTarget?.parentId === parentId;

    return (
      <CreateRow
        active={active}
        depth={depth}
        newName={newName}
        setNewName={(v) => {
          setCreateError("");
          setNewName(v);
        }}
        onCreate={async () => {
          const name = s(newName);
          if (!name) {
            setCreateError("폴더 이름을 입력해줘.");
            return;
          }

          try {
            await createFolder(rootId, parentId, name);

            setCreateTarget(null);
            setNewName("");
            setCreateError("");

            setOpenIds((prev) => {
              const next = new Set(prev);
              next.add(rootId);
              if (parentId) next.add(parentId);
              return next;
            });
          } catch (err: any) {
            console.error(err);
            setCreateError(String(err?.message ?? "폴더 생성 실패"));
          }
        }}
        onCancel={() => {
          setCreateTarget(null);
          setNewName("");
          setCreateError("");
        }}
        errorText={active ? createError : ""}
        placeholder={parentId ? "새 하위 폴더 이름" : "새 폴더 이름"}
        createLabel="생성"
      />
    );
  }

  async function handleDeleteFolder(folderId: string, rootId: string) {
    openConfirm({
      title: "폴더를 삭제할까요?",
      description: "이 폴더를 삭제하면 하위 폴더도 함께 삭제됩니다.",
      tone: "danger",
      confirmText: "삭제",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await deleteFolder(folderId);

          setPending((p) =>
            p.folderId === folderId ? { rootId, folderId: null } : p,
          );

          setOpenIds((prev) => {
            const next = new Set(prev);
            next.delete(folderId);
            return next;
          });

          setMenuOpenId(null);
        } catch (err) {
          console.error(err);
        }
      },
    });
  }

  async function handleDeleteRoot(rootId: string) {
    openConfirm({
      title: "루트를 삭제할까요?",
      description: "이 루트를 삭제하면 하위 폴더도 함께 삭제됩니다.",
      tone: "danger",
      confirmText: "삭제",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await deleteRoot(rootId);

          setPending((p) =>
            p.rootId === rootId ? { rootId: null, folderId: null } : p,
          );

          setOpenIds((prev) => {
            const next = new Set(prev);
            next.delete(rootId);
            return next;
          });

          setMenuOpenId(null);
        } catch (err) {
          console.error(err);
          openConfirm({
            title: "루트 삭제 실패",
            description:
              "루트 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            tone: "default",
            confirmText: "확인",
            cancelText: "닫기",
            onConfirm: async () => {},
          });
        }
      },
    });
  }

  async function handleDeleteNote(noteId: string, noteTitle: string) {
    openConfirm({
      title: "노트를 삭제할까요?",
      description:
        `"${noteTitle}"\n\n` +
        "이 노트를 삭제하면 연습풀이에 포함된 해당 문제들도 더 이상 생성되지 않습니다.",
      tone: "danger",
      confirmText: "삭제",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await deleteNote(noteId);
          setMenuOpenId(null);
        } catch (err) {
          console.error(err);
          openConfirm({
            title: "노트 삭제 실패",
            description:
              "노트 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            tone: "default",
            confirmText: "확인",
            cancelText: "닫기",
            onConfirm: async () => {},
          });
        }
      },
    });
  }

  function openCreate(rootId: string, parentId: string | null) {
    setMenuOpenId(null);
    setCreateTarget({ rootId, parentId });
    setNewName("");
    setCreateError("");
    ensureOpen([rootId, ...(parentId ? [parentId] : [])]);
  }

  function renderNoteRow(note: NoteNode, depth: number) {
    const nid = note.id;

    // ✅ 이게 빠져서 fav is not defined가 터짐
    const fav = favoriteNoteIds.has(nid);

    const favKey = `note:${nid}`;
    const favBusy = favPending.has(favKey);
    const favErr = favError.get(favKey);

    const active = isListMode && selectedNoteId === nid;

    return (
      <TreeRow
        key={nid}
        id={`note:${nid}`}
        depth={depth}
        kind="note"
        name={note.title}
        subText="노트"
        hasChildren={false}
        active={active}
        onClickMain={() => {
          // ✅ create(노트생성): 노트는 "선택 표시" 금지
          if (isCreateMode) {
            // 필요하면 위치만 맞춰주고 끝 (원하면 이것도 지워도 됨)
            setPending({
              rootId: note.rootId,
              folderId: note.folderId ?? null,
            });
            ensureOpen([
              note.rootId,
              ...(note.folderId ? [note.folderId] : []),
            ]);
            return;
          }

          // ✅ list(노트목록): 노트 선택 허용
          setSelectedNoteId(nid);
          setPending({ rootId: note.rootId, folderId: note.folderId ?? null });
          ensureOpen([note.rootId, ...(note.folderId ? [note.folderId] : [])]);
        }}
        right={
          <>
            <IconBtn
              title={
                favBusy ? "처리 중..." : fav ? "즐겨찾기 해제" : "즐겨찾기"
              }
              onClick={() => toggleNoteFavorite(nid)}
              active={false}
              disabled={favBusy}
            >
              <FiStar
                className={cx(
                  "h-4 w-4",
                  active
                    ? fav
                      ? "text-amber-300"
                      : "text-white/70"
                    : fav
                      ? "text-amber-500"
                      : "text-slate-400",
                )}
                fill={fav ? "currentColor" : "none"}
              />
            </IconBtn>

            {favErr ? (
              <div
                title={favErr}
                className="inline-flex h-8 items-center rounded-lg bg-rose-50 px-2 text-[10px] font-semibold text-rose-600"
              >
                ERR
              </div>
            ) : null}

            {allowDeleteNote ? (
              <div data-menu-open-id={`note:${nid}`}>
                <MoreMenu
                  open={menuOpenId === `note:${nid}`}
                  active={false}
                  onToggle={() =>
                    setMenuOpenId((prev) =>
                      prev === `note:${nid}` ? null : `note:${nid}`,
                    )
                  }
                  allowCreate={false}
                  allowDelete={true}
                  onDelete={() => handleDeleteNote(nid, note.title)}
                  deleteLabel="노트 삭제"
                />
              </div>
            ) : null}
          </>
        }
      />
    );
  }

  function renderFolderNode(
    rootId: string,
    node: FolderNode,
    depth: number,
  ): any {
    const fid = node.id;
    const opened = openIds.has(fid);

    const notesHere = notesByFolder.get(fid) ?? [];
    const notesCount = notesHere.length;

    const hasChildren = (node.children?.length ?? 0) > 0;

    // ✅ create에서만 “선택(active 검정)”을 씀
    const active =
      isCreateMode && pending.rootId === rootId && pending.folderId === fid;

    const fav = favoriteFolderIds.has(fid);
    const favKey = `folder:${fid}`;
    const favBusy = favPending.has(favKey);
    const favErr = favError.get(favKey);

    return (
      <div key={fid}>
        <div
          ref={setRowEl(fid)}
          className={cx(
            "rounded-lg transition",
            flashKey === fid && "bg-slate-900/[0.03]",
          )}
        >
          <TreeRow
            id={fid}
            depth={depth}
            kind="folder"
            name={node.name}
            subText={`하위 폴더 ${node.children?.length ?? 0} · 노트 ${notesCount}`}
            hasChildren={hasChildren || notesCount > 0}
            open={opened}
            active={active}
            onToggleOpen={() => toggleOpen(fid)}
            onClickMain={() => {
              // ✅ 폴더 클릭 = 항상 외부에도 “선택”을 알림
              setPending({ rootId, folderId: fid });
              onPick({ rootId, folderId: fid }); // ✅ 즐겨찾기에서 클릭 이벤트가 안 뜨던 원인 해결

              // ✅ list/create 모두: 펼침/접힘은 그대로
              if (hasChildren || notesCount > 0) toggleOpen(fid);
              ensureOpen([rootId, fid]);
            }}
            right={
              <>
                <IconBtn
                  title={
                    favBusy ? "처리 중..." : fav ? "즐겨찾기 해제" : "즐겨찾기"
                  }
                  onClick={() => toggleFolderFavorite(fid)}
                  active={false}
                  disabled={favBusy}
                >
                  <FiStar
                    className={cx(
                      "h-4 w-4",
                      active
                        ? fav
                          ? "text-amber-300"
                          : "text-white/70"
                        : fav
                          ? "text-amber-500"
                          : "text-slate-400",
                    )}
                    fill={fav ? "currentColor" : "none"}
                  />
                </IconBtn>

                {favErr ? (
                  <div
                    title={favErr}
                    className={cx(
                      "inline-flex h-8 items-center rounded-lg px-2 text-[10px] font-semibold",
                      active
                        ? "bg-white/10 text-white/80"
                        : "bg-rose-50 text-rose-600",
                    )}
                  >
                    ERR
                  </div>
                ) : null}

                {(allowFolderCreate || allowDeleteFolder) && (
                  <div data-menu-open-id={fid}>
                    <MoreMenu
                      open={menuOpenId === fid}
                      active={active}
                      onToggle={() =>
                        setMenuOpenId((prev) => (prev === fid ? null : fid))
                      }
                      allowCreate={allowFolderCreate}
                      onCreate={() => openCreate(rootId, fid)}
                      createLabel="하위 폴더 생성"
                      allowDelete={allowDeleteFolder}
                      onDelete={() => handleDeleteFolder(fid, rootId)}
                      deleteLabel="폴더 삭제"
                    />
                  </div>
                )}
              </>
            }
          />
        </div>

        {allowFolderCreate ? renderCreateRow(rootId, fid, depth + 1) : null}

        {opened ? (
          <div className="space-y-1">
            {hasChildren
              ? node.children.map((c) => renderFolderNode(rootId, c, depth + 1))
              : null}
            {notesHere.length ? (
              <div className="space-y-1">
                {notesHere.map((n) => renderNoteRow(n, depth + 1))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  // ✅ create: 루트 선택 필수(폴더는 선택 optional) / list: 노트 선택 필수
  const canConfirm = isCreateMode
    ? !!pending.rootId && !confirmDisabled
    : !!selectedNoteId && !confirmDisabled;

  // ✅ 버튼 라벨
  const confirmBtnLabel = isCreateMode
    ? pending.folderId
      ? "이 폴더로 저장"
      : "이 루트에 저장"
    : selectedNoteId
      ? "선택한 노트 열기"
      : "노트를 선택해 주세요";

  // ✅ 하단 왼쪽 안내 문구
  const defaultConfirmLabel = isCreateMode
    ? !pending.rootId
      ? "저장 위치를 선택해 주세요"
      : pending.folderId
        ? "저장할 폴더가 선택됐어요"
        : "저장할 루트가 선택됐어요"
    : selectedNoteId
      ? "선택한 노트를 열 준비가 됐어요"
      : "열 노트를 선택해 주세요";

  const finalConfirmText = confirmText ?? defaultConfirmLabel;

  return (
    <div
      className={cx("w-full h-full min-h-0 flex flex-col overflow-hidden")}
      ref={panelRef}
    >
      <section
        className={cx(
          "flex-1 min-h-0 h-full",
          "rounded-lg border border-slate-200 bg-white",
          "flex flex-col overflow-hidden",
          sectionClassName,
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900">
              {headerTitle}
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              {headerSubtitleFinal}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {showClose ? (
              <button
                type="button"
                onClick={() => onClose?.()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                title="닫기"
              >
                <FiX className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Root Create 폼 */}
        {allowRootCreate ? (
          <div className="shrink-0 border-b border-slate-200 bg-white">
            {/* ✅ 헤더와 붙어보이지 않게 상단 여백 + 좌우 패딩 정리 */}
            <div className="px-4 pt-3 pb-1">
              <CreateRow
                active={rootCreateOpen}
                depth={0}
                newName={newRootName}
                setNewName={(v) => {
                  setRootCreateError("");
                  setNewRootName(v);
                }}
                errorText={rootCreateOpen ? rootCreateError : ""}
                placeholder="새 루트 이름"
                createLabel="루트 생성"
                onCancel={() => {
                  setRootCreateOpen(false);
                  setNewRootName("");
                  setRootCreateError("");
                }}
                onCreate={async () => {
                  const name = s(newRootName);
                  if (!name) {
                    setRootCreateError("루트 이름을 입력해줘.");
                    return;
                  }

                  try {
                    await createRoot(name);
                    setRootCreateOpen(false);
                    setNewRootName("");
                    setRootCreateError("");
                  } catch (err: any) {
                    console.error(err);
                    setRootCreateError(
                      String(err?.message ?? "루트 생성 실패"),
                    );
                  }
                }}
              />
            </div>
          </div>
        ) : null}

        {/* List */}
        <div
          ref={listScrollRef}
          className="flex-1 min-h-0 overflow-y-auto py-2 pb-4"
        >
          <div className="space-y-1">
            {rootsSorted.map((r) => {
              const rootId = r.id;
              const rootName = r.name;

              const opened = openIds.has(rootId);
              const nodes = treeByRoot.get(rootId) ?? [];

              const rootSelected =
                isCreateMode && pending.rootId === rootId && !pending.folderId;

              const rootFav = favoriteRootIds.has(rootId);
              const favKey = `root:${rootId}`;
              const favBusy = favPending.has(favKey);
              const favErr = favError.get(favKey);

              return (
                <div key={rootId}>
                  <div
                    ref={setRowEl(rootId)}
                    className={cx(
                      "rounded-lg transition",
                      flashKey === rootId && "bg-slate-900/[0.03]",
                    )}
                  >
                    <TreeRow
                      id={rootId}
                      depth={0}
                      kind="root"
                      name={rootName}
                      subText={`폴더 ${nodes.length}`}
                      hasChildren={true}
                      open={opened}
                      active={rootSelected}
                      onToggleOpen={() => toggleOpen(rootId)}
                      onClickMain={() => {
                        setPending({ rootId, folderId: null });
                        onPick({ rootId, folderId: null }); // ✅ 외부 이벤트 발생
                        toggleOpen(rootId);
                      }}
                      right={
                        <>
                          <IconBtn
                            title={
                              favBusy
                                ? "처리 중..."
                                : rootFav
                                  ? "즐겨찾기 해제"
                                  : "즐겨찾기"
                            }
                            onClick={() => toggleRootFavorite(rootId)}
                            active={rootSelected}
                            disabled={favBusy}
                          >
                            <FiStar
                              className={cx(
                                "h-4 w-4",
                                rootSelected
                                  ? rootFav
                                    ? "text-amber-300"
                                    : "text-white/70"
                                  : rootFav
                                    ? "text-amber-500"
                                    : "text-slate-400",
                              )}
                              fill={rootFav ? "currentColor" : "none"}
                            />
                          </IconBtn>

                          {favErr ? (
                            <div
                              title={favErr}
                              className={cx(
                                "inline-flex h-8 items-center rounded-lg px-2 text-[10px] font-semibold",
                                rootSelected
                                  ? "bg-white/10 text-white/80"
                                  : "bg-rose-50 text-rose-600",
                              )}
                            >
                              ERR
                            </div>
                          ) : null}

                          {(allowFolderCreate || allowDeleteRoot) && (
                            <div data-menu-open-id={rootId}>
                              <MoreMenu
                                open={menuOpenId === rootId}
                                active={rootSelected}
                                onToggle={() =>
                                  setMenuOpenId((prev) =>
                                    prev === rootId ? null : rootId,
                                  )
                                }
                                allowCreate={allowFolderCreate}
                                onCreate={() => openCreate(rootId, null)}
                                createLabel="폴더 생성"
                                allowDelete={allowDeleteRoot}
                                onDelete={() => handleDeleteRoot(rootId)}
                                deleteLabel="루트 삭제"
                              />
                            </div>
                          )}
                        </>
                      }
                    />
                  </div>

                  {allowFolderCreate ? renderCreateRow(rootId, null, 1) : null}

                  {opened ? (
                    <div className="space-y-1">
                      {/* ✅ 루트 직속 노트 */}
                      {(notesByRoot.get(rootId) ?? []).length ? (
                        <div className="space-y-1">
                          {(notesByRoot.get(rootId) ?? []).map((n) =>
                            renderNoteRow(n, 1),
                          )}
                        </div>
                      ) : null}

                      {/* ✅ 폴더 트리 */}
                      <div className="space-y-1">
                        {nodes.map((n) => renderFolderNode(rootId, n, 1))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {/* ✅ 루트 추가 */}
            {allowRootCreate ? (
              <div className="px-2 pt-1">
                <button
                  type="button"
                  onPointerDown={stopBubble}
                  onMouseDown={stopBubble}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRootCreateOpen(true);
                    setNewRootName("");
                    setRootCreateError("");
                  }}
                  className={cx(
                    "w-full flex items-center gap-2 rounded-xl px-3 py-2",
                    "hover:bg-slate-50",
                  )}
                >
                  <div className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-slate-50">
                    <FiPlus className="h-4 w-4 text-slate-600" />
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-xs font-semibold text-slate-900">
                      루트 추가
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                      새 루트를 만들고 폴더를 구성하세요.
                    </div>
                  </div>

                  <div className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-600">
                    NEW
                  </div>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        {showFooter ? (
          <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-400">
                {footerLeftLabel}
              </div>
              <div className="mt-1 truncate text-xs font-bold text-slate-900">
                {finalConfirmText}
              </div>
            </div>

            <button
              type="button"
              aria-disabled={!canConfirm ? true : undefined}
              className={cx(
                "inline-flex h-9 items-center justify-center rounded-lg px-4 text-xs font-semibold whitespace-nowrap transition",
                canConfirm
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed",
              )}
              onPointerDown={stopBubble}
              onMouseDown={stopBubble}
              onClick={() => {
                if (confirmDisabled) return;

                // ✅ create: 위치 확정(onPick/onConfirm)
                if (isCreateMode) {
                  if (!pending.rootId) return;

                  onPick({
                    rootId: pending.rootId,
                    folderId: pending.folderId ?? null,
                  });

                  onConfirm?.({
                    rootId: pending.rootId,
                    folderId: pending.folderId ?? null,
                  });

                  return;
                }

                // ✅ list: 노트로 이동
                if (!selectedNoteId) return;
                router.push(`/notes/${selectedNoteId}`);
              }}
            >
              {confirmBtnLabel}
            </button>
          </div>
        ) : null}
      </section>

      <ConfirmModal
        open={confirmUI.open}
        title={confirmUI.title}
        description={confirmUI.description}
        tone={confirmUI.tone ?? "default"}
        confirmText={confirmUI.confirmText ?? "확인"}
        cancelText={confirmUI.cancelText ?? "취소"}
        confirmDisabled={confirmUI.confirmDisabled}
        onConfirm={() => confirmUI.onConfirm?.()}
        onCancel={closeConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}
