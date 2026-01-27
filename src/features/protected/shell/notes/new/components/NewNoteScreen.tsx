// src/features/protected/shell/notes/new/components/NewNoteScreen.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FiCheck,
  FiInfo,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiFolder,
} from "react-icons/fi";

import { db, useDB } from "@/lib/data";

import TopDock from "./TopDock";
import Toolbar, { ViewSwitch, type ViewMode, type SaveStatus } from "./Toolbar";

import { cx } from "../lib/cx";
import { normalizeHref } from "../lib/href";
import { serializeToMarkdown } from "../lib/serialize";
import { splitProblems } from "../lib/problems";

import DraftRestoreModal from "./modals/DraftRestoreModal";
import LeaveConfirmModal from "./modals/LeaveConfirmModal";
import LocationRequiredModal from "./modals/LocationRequiredModal";

import WriteEditorPanel from "./panels/WriteEditorPanel";
import NotePreviewPanel from "./panels/NotePreviewPanel";
import ProblemPreviewPanel from "./panels/ProblemPreviewPanel";
import FolderPickerView from "./panels/FolderPickerView";

import {
  DraftPayload,
  draftClear,
  draftGet,
  draftSave,
  nowIso,
  signatureOf,
} from "../lib/draft";

import {
  buildFoldersById,
  buildRootsById,
  buildSelectedPath,
  extractRootsFolders,
} from "../lib/location";

import { useNewNoteEditor } from "../lib/useNewNoteEditor";

declare global {
  interface Window {
    __ARCHINEUR_NOTE_NEW_GUARD__?: (next: () => void) => void;
  }
}

export default function NewNoteScreen() {
  const pathname = usePathname();
  const router = useRouter();

  const [dockH, setDockH] = useState(0);

  const [title, setTitle] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [uiTick, setUiTick] = useState(0);
  const [sigTick, setSigTick] = useState(0);
  const [view, setView] = useState<ViewMode>("write");

  const [dockOpen, setDockOpen] = useState(true);

  const [blankOn, setBlankOn] = useState(false);
  const blankOnRef = useRef(false);

  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const linkRangeRef = useRef<{ from: number; to: number } | null>(null);
  const linkLabelRef = useRef<HTMLInputElement | null>(null);

  // ✅ 임시저장 상태
  const [tempSaveStatus, setTempSaveStatus] = useState<SaveStatus>("idle");
  const tempSaveResetTimer = useRef<number | null>(null);

  // ✅ 정식 저장 상태
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveResetTimer = useRef<number | null>(null);

  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const draftRef = useRef<DraftPayload | null>(null);

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const leaveNextRef = useRef<(() => void) | null>(null);
  const allowPopOnce = useRef(false);

  const lastSavedSigRef = useRef<string>("");

  /** ✅ 최신 dirty 상태 ref */
  const isDirtyRef = useRef(false);

  // ✅ 저장 시 위치 미선택 안내 모달 (정식 저장에서만 사용)
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // =========================
  // ✅ Folder selection
  // =========================
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const dbState = useDB() as any;

  const { rootsRaw, foldersRaw } = useMemo(
    () => extractRootsFolders(dbState),
    [dbState],
  );

  const rootsById = useMemo(() => buildRootsById(rootsRaw), [rootsRaw]);
  const foldersById = useMemo(() => buildFoldersById(foldersRaw), [foldersRaw]);

  const selectedPath = useMemo(() => {
    return buildSelectedPath({
      selectedRootId,
      selectedFolderId,
      rootsById,
      foldersById,
    });
  }, [selectedRootId, selectedFolderId, rootsById, foldersById]);

  const onOpenFolderPicker = useCallback(() => {
    setView("folder");
  }, []);

  const onCloseFolderPicker = useCallback(() => {
    setView("write");
  }, []);

  const onPickLocation = useCallback(
    (v: { rootId: string | null; folderId: string | null }) => {
      let rootId = v.rootId ?? null;

      // ✅ rootId가 비어왔는데 folderId가 있으면 foldersById로 루트를 역추적
      if (!rootId && v.folderId) {
        const f = foldersById.get(v.folderId);
        const derived = (f as any)?.rootId ?? (f as any)?.root_id ?? null;
        rootId = derived ? String(derived) : null;
      }

      // ✅ rootId가 끝내 없으면, 기존 selectedRootId를 null로 덮어쓰지 않음
      setSelectedRootId((prev) => rootId ?? prev ?? null);
      setSelectedFolderId(v.folderId ?? null);
      setView("write");
    },
    [foldersById],
  );

  // ✅ 정식 저장은 folder_id가 필수라서 "폴더 선택"이 기준
  const hasFolderSelected = useMemo(() => {
    return !!selectedFolderId;
  }, [selectedFolderId]);

  // =========================
  // Init
  // =========================
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ✅ px 고정 유지 (미디어쿼리 rem 오염 방지)
    const isMobile = window.matchMedia("(max-width: 760.5px)").matches;
    if (isMobile) setDockOpen(false);
  }, []);

  useEffect(() => {
    if (!dockOpen && linkPanelOpen) {
      setLinkPanelOpen(false);
      setLinkLabel("");
      setLinkUrl("https://");
    }
  }, [dockOpen, linkPanelOpen]);

  useEffect(() => {
    return () => {
      if (tempSaveResetTimer.current) {
        window.clearTimeout(tempSaveResetTimer.current);
        tempSaveResetTimer.current = null;
      }
      if (saveResetTimer.current) {
        window.clearTimeout(saveResetTimer.current);
        saveResetTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--note-new-dock-h",
      `${dockH}px`,
    );
    return () => {
      document.documentElement.style.removeProperty("--note-new-dock-h");
    };
  }, [dockH]);

  function openLinkPanel() {
    if (!editor) return;
    if (!dockOpen) setDockOpen(true);

    const { from, to } = editor.state.selection;
    linkRangeRef.current = { from, to };

    const selectedText =
      to > from ? editor.state.doc.textBetween(from, to, " ") : "";

    setLinkLabel(selectedText.trim());
    setLinkUrl("https://");
    setLinkPanelOpen(true);

    setTimeout(() => {
      linkLabelRef.current?.focus();
      linkLabelRef.current?.select();
    }, 0);
  }

  function closeLinkPanel(refocusEditor: boolean) {
    setLinkPanelOpen(false);
    setLinkLabel("");
    setLinkUrl("https://");
    if (refocusEditor) setTimeout(() => editor?.chain().focus().run(), 0);
  }

  function applyLinkFromPanel() {
    if (!editor) return;

    const href = normalizeHref(linkUrl);
    if (!href) return;

    const saved = linkRangeRef.current;
    if (saved) editor.chain().focus().setTextSelection(saved).run();
    else editor.chain().focus().run();

    const { from, to } = editor.state.selection;
    const hasSelection = to > from;

    if (hasSelection) {
      editor.chain().focus().setLink({ href }).run();
      closeLinkPanel(true);
      return;
    }

    const label = (linkLabel || "").trim() || href;
    const start = editor.state.selection.from;

    editor.chain().focus().insertContent(label).run();
    const end = editor.state.selection.from;

    editor
      .chain()
      .focus()
      .setTextSelection({ from: start, to: end })
      .setLink({ href })
      .run();

    editor.chain().focus().setTextSelection(end).run();
    closeLinkPanel(true);
  }

  function onBlankToggle() {
    if (!editor) return;
    if (!dockOpen) setDockOpen(true);

    const next = !blankOnRef.current;
    blankOnRef.current = next;
    setBlankOn(next);

    const { from, to, empty } = editor.state.selection;
    const insertAt = empty ? from : to;

    editor
      .chain()
      .focus()
      .setTextSelection(insertAt)
      .insertContent(next ? "[" : "]")
      .run();
  }

  function onLinkToggle() {
    if (!editor) return;
    if (linkPanelOpen) {
      closeLinkPanel(true);
      return;
    }
    openLinkPanel();
  }

  // =========================
  // TipTap (분리)
  // =========================
  const editor = useNewNoteEditor({
    view,
    setView,
    dockOpen,
    setDockOpen,
    linkPanelOpen,
    closeLinkPanel,
    openLinkPanel,
    blankOnRef,
    setBlankOn,
    onCharCount: setCharCount,
    onUiTick: () => setUiTick((v) => v + 1),
    surfaceClassName: cx(
      "tiptap-surface w-full h-full min-h-[calc(100dvh-var(--note-new-dock-h)-275px)] rounded-2xl border border-slate-200 bg-white px-6 py-6 outline-none",
      // ✅ text-[0.9375rem] 제거 → 프리셋
      "text-sm leading-8 text-slate-900",
      "[&_p]:my-2.5",
      // ✅ 오염값 정리 + 프리셋 사용
      "[&_h1]:mt-8 [&_h1]:mb-2.5 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-slate-900",
      "[&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900",
      "[&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900",
      "[&_strong]:font-semibold",
      "[&_a]:font-semibold [&_a]:underline [&_a]:decoration-slate-400 [&_a]:underline-offset-4 [&_a]:text-slate-900",
      "[&_a:hover]:decoration-slate-600 [&_a:hover]:bg-slate-50 [&_a:hover]:rounded-md [&_a:hover]:px-0.5",
      "[&_hr]:my-10 [&_hr]:border-slate-200",
      "[&_ul]:my-3 [&_ul]:pl-7 [&_ul]:list-disc [&_ul]:space-y-1.5",
      "[&_ol]:my-3 [&_ol]:pl-7 [&_ol]:list-decimal [&_ol]:space-y-1.5",
      "[&_li]:my-0 [&_li]:marker:text-slate-400",
      "[&_li>p]:my-0",
    ),
  });

  const isEmptyNow = useMemo(() => {
    if (!editor) return true;
    const t = (title || "").trim();
    const body = editor.getText().trim();
    return t.length === 0 && body.length === 0;
  }, [editor, title, uiTick]);

  const currentSig = useMemo(() => {
    if (!editor) return "";
    return signatureOf((title || "").trim(), editor.getJSON());
  }, [editor, title, uiTick, sigTick]);

  const isDirty = useMemo(() => {
    if (!editor) return false;
    if (isEmptyNow) return false;

    const base = lastSavedSigRef.current || "";
    const cur = currentSig || "";
    if (!cur) return false;
    return base !== cur;
  }, [editor, isEmptyNow, currentSig]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const active = useMemo(() => {
    if (!editor) {
      return {
        h1: false,
        h2: false,
        h3: false,
        bold: false,
        inLink: false,
        list: false,
      };
    }
    return {
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bold: editor.isActive("bold"),
      inLink: editor.isActive("link"),
      list: editor.isActive("bulletList") || editor.isActive("orderedList"),
    };
  }, [editor, uiTick]);

  const mdRaw = useMemo(() => {
    if (!editor) return "";
    return serializeToMarkdown(editor.getJSON());
  }, [editor, uiTick]);

  const problems = useMemo(() => splitProblems(mdRaw), [mdRaw]);

  useEffect(() => {
    if (!editor) return;
    if (!isEmptyNow) return;
    if (lastSavedSigRef.current) return;

    lastSavedSigRef.current = signatureOf(
      (title || "").trim(),
      editor.getJSON(),
    );
    setSigTick((v) => v + 1);
  }, [editor, isEmptyNow, title, uiTick]);

  // =========================
  // ✅ 임시저장
  // =========================
  const onTempSave = useCallback(async () => {
    if (!editor) return;
    if (tempSaveStatus === "saving") return;

    if (tempSaveResetTimer.current) {
      window.clearTimeout(tempSaveResetTimer.current);
      tempSaveResetTimer.current = null;
    }

    setTempSaveStatus("saving");

    try {
      const payload: DraftPayload = {
        title: (title || "").trim(),
        doc: editor.getJSON(),
        text: editor.getText().trim(),
        updated_at: nowIso(),
      };

      await draftSave(db as any, payload);

      lastSavedSigRef.current = signatureOf(payload.title, payload.doc);
      isDirtyRef.current = false;
      setSigTick((v) => v + 1);

      setTempSaveStatus("saved");
      tempSaveResetTimer.current = window.setTimeout(() => {
        setTempSaveStatus("idle");
        tempSaveResetTimer.current = null;
      }, 1600);
    } catch {
      setTempSaveStatus("error");
      tempSaveResetTimer.current = window.setTimeout(() => {
        setTempSaveStatus("idle");
        tempSaveResetTimer.current = null;
      }, 2000);
    } finally {
      window.setTimeout(() => {
        setTempSaveStatus((s) => (s === "saving" ? "idle" : s));
      }, 6000);
    }
  }, [editor, title, tempSaveStatus]);

  // =========================
  // ✅ 정식 저장(DB)
  // =========================
  const onSave = useCallback(async () => {
    if (!editor) return;
    if (saveStatus === "saving") return;

    if (!selectedRootId) {
      setLocationModalOpen(true);
      return;
    }

    const t = (title || "").trim();
    const bodyText = editor.getText().trim();
    if (!t && !bodyText) return;

    if (saveResetTimer.current) {
      window.clearTimeout(saveResetTimer.current);
      saveResetTimer.current = null;
    }

    setSaveStatus("saving");

    try {
      const payload = {
        root_id: selectedRootId,
        folder_id: selectedFolderId ?? null,
        title: t || "제목 없음",
        content: mdRaw,
      };

      const res = await (db as any).createNote(payload);

      // ✅ createNote가 { error } 형태로 반환하는 케이스까지 대응
      if (res?.error) throw res.error;

      await draftClear(db as any);
      draftRef.current = null;

      lastSavedSigRef.current = signatureOf(
        (t || "제목 없음").trim(),
        editor.getJSON(),
      );
      isDirtyRef.current = false;
      setSigTick((v) => v + 1);

      setSaveStatus("saved");
      saveResetTimer.current = window.setTimeout(() => {
        setSaveStatus("idle");
        saveResetTimer.current = null;
      }, 1600);

      router.push("/workbench/stream");
    } catch (e: any) {
      console.error("createNote failed (raw):", e);
      console.error("createNote failed (detail):", {
        message: e?.message,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
        status: e?.status,
      });

      setSaveStatus("error");
      saveResetTimer.current = window.setTimeout(() => {
        setSaveStatus("idle");
        saveResetTimer.current = null;
      }, 2000);
    } finally {
      window.setTimeout(() => {
        setSaveStatus((s) => (s === "saving" ? "idle" : s));
      }, 6000);
    }
  }, [
    editor,
    saveStatus,
    selectedRootId,
    selectedFolderId,
    title,
    mdRaw,
    router,
  ]);

  // =========================
  // ✅ Draft restore on enter
  // =========================
  useEffect(() => {
    if (!editor) return;
    if (pathname !== "/notes/new") return;

    (async () => {
      const draft = await draftGet(db as any);
      draftRef.current = draft;

      const hasSomething =
        !!draft &&
        ((draft.title || "").trim().length > 0 ||
          (draft.text || "").trim().length > 0);

      if (!hasSomething) return;
      if (!isEmptyNow && isDirtyRef.current) return;
      if (isEmptyNow) setDraftModalOpen(true);
    })();
  }, [editor, pathname, isEmptyNow]);

  const applyDraft = useCallback(() => {
    const draft = draftRef.current;
    if (!editor || !draft || !draft.doc) {
      setDraftModalOpen(false);
      return;
    }

    try {
      setTitle((draft.title || "").trim());
      editor.commands.setContent(draft.doc as any);

      lastSavedSigRef.current = signatureOf(
        (draft.title || "").trim(),
        draft.doc,
      );
      isDirtyRef.current = false;
      setSigTick((v) => v + 1);
    } finally {
      setDraftModalOpen(false);
    }
  }, [editor]);

  const discardDraft = useCallback(async () => {
    try {
      await draftClear(db as any);
    } finally {
      draftRef.current = null;
      setDraftModalOpen(false);

      if (editor) {
        lastSavedSigRef.current = signatureOf(
          (title || "").trim(),
          editor.getJSON(),
        );
        isDirtyRef.current = false;
        setSigTick((v) => v + 1);
      }
    }
  }, [editor, title]);

  // =========================
  // ✅ Leave guard
  // =========================
  const requestLeave = useCallback((next: () => void) => {
    if (!isDirtyRef.current) {
      next();
      return;
    }
    leaveNextRef.current = next;
    setLeaveModalOpen(true);
  }, []);

  useEffect(() => {
    window.__ARCHINEUR_NOTE_NEW_GUARD__ = (next: () => void) =>
      requestLeave(next);
    return () => {
      delete window.__ARCHINEUR_NOTE_NEW_GUARD__;
    };
  }, [requestLeave]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isDirty) return;

    try {
      history.pushState({ __noteNew: true }, "", window.location.href);
    } catch {}

    const onPop = () => {
      if (allowPopOnce.current) {
        allowPopOnce.current = false;
        return;
      }
      try {
        history.pushState({ __noteNew: true }, "", window.location.href);
      } catch {}

      requestLeave(() => {
        allowPopOnce.current = true;
        history.back();
      });
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isDirty, requestLeave]);

  // ✅ text-[0.75rem] 제거 → text-xs
  const foldBtn =
    "inline-flex h-6 w-14 items-center justify-center gap-2 rounded-full " +
    "border border-slate-200 bg-white/95 px-3 text-xs font-semibold text-slate-700 " +
    "shadow-[0_0.625rem_1.875rem_rgba(15,23,42,0.08)] transition hover:bg-slate-50 active:bg-white";

  // ✅ text-[0.75rem] 제거 → text-xs
  const folderBtnClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-full " +
    "border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 " +
    "hover:bg-slate-50 active:bg-white";

  const saveDisabled = !editor || saveStatus === "saving";

  return (
    <main className="relative min-h-0 bg-white">
      <DraftRestoreModal
        open={draftModalOpen}
        onConfirm={applyDraft}
        onCancel={discardDraft}
        onClose={() => setDraftModalOpen(false)}
      />

      <LeaveConfirmModal
        open={leaveModalOpen}
        onConfirmSaveAndLeave={async () => {
          setLeaveModalOpen(false);
          await onTempSave(); // ✅ 이탈 모달은 "임시저장"만 유지
          const next = leaveNextRef.current;
          leaveNextRef.current = null;
          next?.();
        }}
        onCancelLeave={() => {
          setLeaveModalOpen(false);
          const next = leaveNextRef.current;
          leaveNextRef.current = null;
          next?.();
        }}
        onClose={() => {
          setLeaveModalOpen(false);
          leaveNextRef.current = null;
        }}
      />

      <LocationRequiredModal
        open={locationModalOpen}
        onPickNow={() => {
          setLocationModalOpen(false);
          onOpenFolderPicker();
        }}
        onClose={() => setLocationModalOpen(false)}
      />

      <TopDock
        onHeightChange={(h) => {
          setDockH(h);
          document.documentElement.style.setProperty(
            "--note-new-dock-h",
            `${h}px`,
          );
        }}
      >
        <div className="flex w-full flex-nowrap items-center justify-between gap-3 px-6 py-4 md:px-10">
          <div className="min-w-[160px]">
            <div className="text-xs font-semibold text-slate-500">
              NOTES / NEW
            </div>
            <div className="text-sm font-semibold text-slate-900">새 노트</div>
            <div />
          </div>

          <ViewSwitch mode={view} onChange={setView} />
          <div className="min-w-[160px] items-center gap-2" />
        </div>

        <div className="relative border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="px-4 sm:px-6 md:px-10">
            <div
              className={cx(
                "overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out",
                dockOpen
                  ? "max-h-[820px] opacity-100 translate-y-0"
                  : "max-h-0 opacity-0 -translate-y-1",
              )}
            >
              <div className="py-4">
                <Toolbar
                  onH={(lv) =>
                    editor?.chain().focus().toggleHeading({ level: lv }).run()
                  }
                  onBold={() => editor?.chain().focus().toggleBold().run()}
                  onBlankToggle={onBlankToggle}
                  onLinkToggle={onLinkToggle}
                  onList={() =>
                    editor?.chain().focus().toggleBulletList().run()
                  }
                  onDivider={() =>
                    editor?.chain().focus().setHorizontalRule().run()
                  }
                  active={active}
                  blankOn={blankOn}
                  linkPanelOpen={linkPanelOpen}
                  onTempSave={onTempSave}
                  tempSaveStatus={tempSaveStatus}
                  tempSaveDisabled={!editor || tempSaveStatus === "saving"}
                  onSave={onSave}
                  saveStatus={saveStatus}
                  saveDisabled={!selectedRootId}
                />

                {linkPanelOpen ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr_auto] sm:items-center">
                      <input
                        ref={linkLabelRef}
                        value={linkLabel}
                        onChange={(e) => setLinkLabel(e.target.value)}
                        placeholder="라벨(표시 텍스트) — 예: 네이버"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-300"
                      />
                      <input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="URL — 예: https://www.naver.com"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 outline-none focus:border-slate-300"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyLinkFromPanel();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            closeLinkPanel(true);
                          }
                        }}
                      />
                      <div className="flex items-center gap-2 sm:justify-end">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={applyLinkFromPanel}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          <FiCheck className="h-4 w-4" />
                          적용
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => closeLinkPanel(true)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <FiX className="h-4 w-4" />
                          취소
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      선택/커서 위치를 저장해두기 때문에, 패널에서 입력 후
                      적용해도 원래 위치에 들어가요. (⌘/Ctrl+K)
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute left-0 right-0 bottom-6">
            <div className="relative h-0">
              <button
                type="button"
                className={cx(
                  foldBtn,
                  "pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2 translate-y-1/2",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setDockOpen((v) => !v)}
              >
                {dockOpen ? (
                  <FiChevronUp className="h-4 w-4" />
                ) : (
                  <FiChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </TopDock>

      <div className="flex flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 md:px-10">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="pt-4 md:pt-6">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={cx(
                  "w-full rounded-xl bg-transparent",
                  // ✅ 프리셋으로 통일 (오염값 방지)
                  "text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl",
                  "placeholder:text-slate-300",
                  "focus:outline-none",
                )}
                placeholder="제목을 입력하세요"
              />

              <div className="relative mt-3">
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    {selectedPath ? (
                      <div className="truncate text-sm font-semibold text-slate-600">
                        {selectedPath}
                      </div>
                    ) : (
                      <div className="truncate text-sm font-semibold text-slate-300">
                        &nbsp;
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className={folderBtnClass}
                    onClick={onOpenFolderPicker}
                  >
                    <FiFolder className="h-4 w-4" />
                    폴더선택
                  </button>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden py-5">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {view === "write" ? <WriteEditorPanel editor={editor} /> : null}
                {view === "note" ? <NotePreviewPanel mdRaw={mdRaw} /> : null}
                {view === "problem" ? (
                  <ProblemPreviewPanel problems={problems} />
                ) : null}
                {view === "folder" ? (
                  <FolderPickerView
                    roots={rootsRaw as any}
                    folders={foldersRaw as any}
                    selectedRootId={selectedRootId}
                    selectedFolderId={selectedFolderId}
                    onPick={onPickLocation}
                    onClose={onCloseFolderPicker}
                  />
                ) : null}
              </div>

              <div className="mt-5 flex shrink-0 items-center justify-between text-xs text-slate-500">
                <span>{charCount.toLocaleString()} 글자</span>
                <span className="hidden items-center gap-2 sm:inline-flex">
                  <FiInfo className="h-3.5 w-3.5" />
                  {view === "problem" ? "문제=연습풀이 렌더 + 50%" : "미리보기"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          .tiptap-editor .ProseMirror {
            outline: none;
            height: 100%;
          }
          .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #94a3b8;
            pointer-events: none;
            height: 0;
            white-space: pre-line;
          }
        `}</style>
      </div>
    </main>
  );
}
