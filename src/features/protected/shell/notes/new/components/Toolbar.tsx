// src/features/protected/shell/notes/new/components/Toolbar.tsx
"use client";

import type { ReactNode } from "react";
import {
  FiBold,
  FiHash,
  FiInfo,
  FiLink,
  FiList,
  FiMinus,
  FiSave,
  FiUploadCloud,
  FiLoader,
  FiCheck,
  FiAlertTriangle,
} from "react-icons/fi";
import { cx } from "../lib/cx";

export type ViewMode = "write" | "note" | "problem" | "folder";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function Toolbar({
  onH,
  onBold,
  onBlankToggle,
  onLinkToggle,
  onList,
  onDivider,
  active,
  blankOn,
  linkPanelOpen,
  right,
  bottom,

  // ✅ 임시저장
  onTempSave,
  tempSaveStatus = "idle",
  tempSaveDisabled = false,

  // ✅ 정식 저장
  onSave,
  saveStatus = "idle",
  saveDisabled = false, // ✅ "저장 불가 상태"지만 클릭은 받아서 모달을 띄울 것
}: {
  onH: (level: 1 | 2 | 3) => void;
  onBold: () => void;
  onBlankToggle: () => void;
  onLinkToggle: () => void;
  onList: () => void;
  onDivider: () => void;
  active: {
    h1: boolean;
    h2: boolean;
    h3: boolean;
    bold: boolean;
    inLink: boolean;
    list: boolean;
  };
  blankOn: boolean;
  linkPanelOpen: boolean;
  right?: ReactNode;
  bottom?: ReactNode;

  onTempSave: () => void;
  tempSaveStatus?: SaveStatus;
  tempSaveDisabled?: boolean;

  onSave: () => void;
  saveStatus?: SaveStatus;
  saveDisabled?: boolean;
}) {
  const keepSelection = (e: any) => e.preventDefault();

  const btn =
    "tip-btn relative inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 " +
    "bg-white/95 px-3 text-xs font-semibold text-slate-700 transition " +
    "hover:bg-slate-50 active:bg-white";
  const btnIcon = "h-3.5 w-3.5 shrink-0";
  const on =
    "border-slate-900/70 bg-slate-900/5 text-slate-900 ring-2 ring-slate-900/10";

  const actionBase =
    "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition";

  const ghost =
    "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50";
  const ghostDisabled = "opacity-60 pointer-events-none";

  // ✅ 저장 버튼: 항상 "활성처럼" 보이게 (saveDisabled여도 회색 금지)
  const primary =
    "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-900";
  const primaryHint = "ring-1 ring-slate-900/10"; // (선택) 살짝 힌트만

  const tempIcon = (() => {
    if (tempSaveStatus === "saving")
      return <FiLoader className="h-4 w-4 animate-spin" />;
    if (tempSaveStatus === "saved") return <FiCheck className="h-4 w-4" />;
    if (tempSaveStatus === "error")
      return <FiAlertTriangle className="h-4 w-4" />;
    return <FiSave className="h-4 w-4" />;
  })();

  const tempLabel = (() => {
    if (tempSaveStatus === "saving") return "임시저장 중…";
    if (tempSaveStatus === "saved") return "임시저장됨";
    if (tempSaveStatus === "error") return "임시저장 실패";
    return "임시저장";
  })();

  const saveIcon = (() => {
    if (saveStatus === "saving")
      return <FiLoader className="h-4 w-4 animate-spin" />;
    if (saveStatus === "saved") return <FiCheck className="h-4 w-4" />;
    if (saveStatus === "error") return <FiAlertTriangle className="h-4 w-4" />;
    return <FiUploadCloud className="h-4 w-4" />;
  })();

  const saveLabel = (() => {
    if (saveStatus === "saving") return "저장 중…";
    if (saveStatus === "saved") return "저장됨";
    if (saveStatus === "error") return "저장 실패";
    // ✅ 루트/폴더 없어서 저장 못하는 상태면 "안내 라벨"만
    if (saveDisabled) return "저장";
    return "저장";
  })();

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cx(btn, active.h1 && on)}
            onMouseDown={keepSelection}
            onClick={() => onH(1)}
            data-tip="# 제목"
            aria-pressed={active.h1}
          >
            <FiHash className={btnIcon} />
            <span className="whitespace-nowrap">H1</span>
          </button>

          <button
            type="button"
            className={cx(btn, active.h2 && on)}
            onMouseDown={keepSelection}
            onClick={() => onH(2)}
            data-tip="## 제목"
            aria-pressed={active.h2}
          >
            <span className="whitespace-nowrap">H2</span>
          </button>

          <button
            type="button"
            className={cx(btn, active.h3 && on)}
            onMouseDown={keepSelection}
            onClick={() => onH(3)}
            data-tip="### 제목"
            aria-pressed={active.h3}
          >
            <span className="whitespace-nowrap">H3</span>
          </button>

          <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

          <button
            type="button"
            className={cx(btn, active.bold && on)}
            onMouseDown={keepSelection}
            onClick={onBold}
            data-tip="**굵게**"
            aria-pressed={active.bold}
          >
            <FiBold className={btnIcon} />
            <span className="whitespace-nowrap">Bold</span>
          </button>

          <button
            type="button"
            className={cx(btn, blankOn && on)}
            onMouseDown={keepSelection}
            onClick={onBlankToggle}
            data-tip={`[정답] (첫 클릭 : "[" 다시 클릭 : "]")`}
            aria-pressed={blankOn}
          >
            <span
              className={cx(
                "inline-flex h-5 items-center justify-center rounded-md border px-2 text-xs font-bold leading-none",
                blankOn
                  ? "border-slate-900/20 bg-white text-slate-900"
                  : "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              [ ]
            </span>
            <span className="whitespace-nowrap">Blank</span>
          </button>

          <button
            type="button"
            className={cx(btn, (linkPanelOpen || active.inLink) && on)}
            onMouseDown={keepSelection}
            onClick={onLinkToggle}
            data-tip="[라벨](URL) · (라벨)[URL] · ⌘/Ctrl+K"
            aria-pressed={linkPanelOpen || active.inLink}
          >
            <FiLink className={btnIcon} />
            <span className="whitespace-nowrap">Link</span>
          </button>

          <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

          <button
            type="button"
            className={cx(btn, active.list && on)}
            onMouseDown={keepSelection}
            onClick={onList}
            data-tip="- 리스트 · 1. 리스트"
            aria-pressed={active.list}
          >
            <FiList className={btnIcon} />
            <span className="whitespace-nowrap">List</span>
          </button>

          <button
            type="button"
            className={btn}
            onMouseDown={keepSelection}
            onClick={onDivider}
            data-tip="Divider — ---"
          >
            <FiMinus className={btnIcon} />
            <span className="whitespace-nowrap">Divider</span>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {right ? right : null}

          {/* ✅ 임시저장 */}
          <button
            type="button"
            className={cx(actionBase, ghost, tempSaveDisabled && ghostDisabled)}
            onMouseDown={keepSelection}
            onClick={() => {
              if (tempSaveDisabled) return;
              onTempSave();
            }}
            aria-disabled={tempSaveDisabled}
          >
            {tempIcon}
            {tempLabel}
          </button>

          {/* ✅ 저장: saveDisabled여도 "활성처럼 보이게" + 클릭은 항상 onSave로 */}
          <button
            type="button"
            className={cx(actionBase, primary, saveDisabled && primaryHint)}
            onMouseDown={keepSelection}
            onClick={() => onSave()}
            aria-disabled={saveDisabled}
          >
            {saveIcon}
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <FiInfo className="h-3.5 w-3.5" />
          <span className="whitespace-nowrap">작성/노트/문제</span>
          <span className="text-slate-400">·</span>
          <span className="whitespace-nowrap">단축키: ⌘/Ctrl+B, ⌘/Ctrl+K</span>
        </div>

        {bottom ? <div className="ml-auto">{bottom}</div> : null}
      </div>

      <style jsx global>{`
        .tip-btn::before {
          content: attr(data-tip);
          position: absolute;
          left: 50%;
          top: calc(100% + 10px);
          transform: translateX(-50%);
          max-width: 500px;
          white-space: nowrap;
          padding: 7px 10px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.92);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: -0.01em;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 0.12s ease,
            transform 0.12s ease;
          z-index: 80;
        }

        .tip-btn::after {
          display: none !important;
          content: none !important;
        }

        .tip-btn:hover::before {
          opacity: 1;
        }

        @media (max-width: 480px) {
          .tip-btn::before {
            top: calc(100% + 12px);
            max-width: 260px;
          }
        }
      `}</style>
    </div>
  );
}

export function ViewSwitch({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold transition";
  const on = "bg-slate-900 text-white shadow-sm";
  const off = "text-slate-600 hover:bg-slate-100";

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
      <button
        type="button"
        className={cx(base, mode === "write" ? on : off)}
        onClick={() => onChange("write")}
      >
        작성
      </button>
      <button
        type="button"
        className={cx(base, mode === "note" ? on : off)}
        onClick={() => onChange("note")}
      >
        노트
      </button>
      <button
        type="button"
        className={cx(base, mode === "problem" ? on : off)}
        onClick={() => onChange("problem")}
      >
        문제
      </button>
    </div>
  );
}
