// src/app/(protected)/(shell)/notes/new/page.tsx
"use client";

import { useMemo } from "react";
import {
  FiArrowLeft,
  FiFolderPlus,
  FiChevronDown,
  FiHash,
  FiBold,
  FiItalic,
  FiCode,
  FiLink,
  FiList,
  FiCheckSquare,
  FiMinus,
  FiMessageSquare,
  FiLayout,
  FiLayers,
  FiInfo,
  FiStar,
} from "react-icons/fi";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------
   ✅ 디자인-only 버튼 (전부 비활성화)
------------------------------------------------------------------ */
function PrimaryBtn({
  children,
  className,
  disabled = true,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
        "cursor-not-allowed bg-slate-200 text-slate-500",
        className,
      )}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({
  children,
  className,
  disabled = true,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold",
        "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400",
        className,
      )}
    >
      {children}
    </button>
  );
}

function GhostBtn({
  children,
  className,
  disabled = true,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
        "cursor-not-allowed text-slate-300",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------
   ✅ 마크다운 “한글식” 단축 버튼 툴바(전부 비활성화)
------------------------------------------------------------------ */
function MarkdownToolbar() {
  const btn =
    "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700";
  const btn2 =
    "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700";

  const disabled =
    "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white disabled:active:bg-white";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Headings */}
      <div className="flex items-center gap-1.5">
        <button disabled className={cx(btn, disabled)} title="# 제목 (H1)">
          <FiHash className="h-3.5 w-3.5" />
          H1
        </button>
        <button disabled className={cx(btn2, disabled)} title="## 제목 (H2)">
          H2
        </button>
        <button disabled className={cx(btn2, disabled)} title="### 제목 (H3)">
          H3
        </button>
        <button disabled className={cx(btn2, disabled)} title="#### (H4)">
          H4
        </button>
        <button disabled className={cx(btn2, disabled)} title="##### (H5)">
          H5
        </button>
        <button disabled className={cx(btn2, disabled)} title="###### (H6)">
          H6
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* Inline */}
      <button disabled className={cx(btn, disabled)} title="굵게 **text**">
        <FiBold className="h-3.5 w-3.5" /> Bold
      </button>
      <button disabled className={cx(btn, disabled)} title="기울임 *text*">
        <FiItalic className="h-3.5 w-3.5" /> Italic
      </button>
      <button disabled className={cx(btn, disabled)} title="인라인 코드 `code`">
        <FiCode className="h-3.5 w-3.5" /> Code
      </button>
      <button disabled className={cx(btn, disabled)} title="링크 [title](url)">
        <FiLink className="h-3.5 w-3.5" /> Link
      </button>

      <div className="h-6 w-px bg-slate-200" />

      {/* Blocks */}
      <button disabled className={cx(btn, disabled)} title="리스트 - item">
        <FiList className="h-3.5 w-3.5" /> List
      </button>
      <button
        disabled
        className={cx(btn, disabled)}
        title="체크리스트 - [ ] item"
      >
        <FiCheckSquare className="h-3.5 w-3.5" /> Check
      </button>
      <button disabled className={cx(btn, disabled)} title="인용문 > quote">
        <FiMessageSquare className="h-3.5 w-3.5" /> Quote
      </button>
      <button disabled className={cx(btn, disabled)} title="구분선 ---">
        <FiMinus className="h-3.5 w-3.5" /> Divider
      </button>

      <div className="ml-auto hidden items-center gap-2 text-[12px] text-slate-500 lg:flex">
        <FiInfo className="h-3.5 w-3.5" />
        버튼은 디자인만(비활성)
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   ✅ 폴더 선택/생성 (전부 비활성화)
------------------------------------------------------------------ */
function FolderSelectRow() {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="flex-1">
        <div className="mb-1.5 text-[12px] font-semibold text-slate-600">
          저장 폴더
        </div>
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 opacity-60"
          title="폴더 선택(디자인)"
        >
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FiLayers className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="block font-semibold">소방산업기사</span>
              <span className="block text-[12px] text-slate-500">
                / 감지기 / 자동화재탐지
              </span>
            </span>
          </span>
          <FiChevronDown className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      <div className="pt-0 md:pt-6">
        <SecondaryBtn className="w-full">
          <FiFolderPlus className="h-4 w-4" />
          폴더 생성
        </SecondaryBtn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   ✅ 제목/태그 (제목 인풋만 더 높고 글씨 크게)
------------------------------------------------------------------ */
function TitleRow() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <div className="mb-1.5 text-[12px] font-semibold text-slate-600">
          노트 제목
        </div>
        <input
          disabled
          className={cx(
            "w-full cursor-not-allowed rounded-xl border border-slate-200 bg-white",
            "px-4 py-3 text-[15px] font-semibold text-slate-900",
            "placeholder:font-medium placeholder:text-slate-400",
            "opacity-80 focus:outline-none",
          )}
          placeholder="예) 우선경보 & 전층경보 요약"
        />
      </div>

      <div>
        <div className="mb-1.5 text-[12px] font-semibold text-slate-600">
          태그(선택)
        </div>
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 opacity-90">
          {["감지기", "경보", "NFC", "암기"].map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-700"
            >
              <FiStar className="h-3 w-3" />
              {t}
            </span>
          ))}
          <span className="text-[12px] text-slate-400">+ 입력은 나중에</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   ✅ 에디터 박스 (저장/자동저장 언급 제거, 툴바/버튼 비활성)
------------------------------------------------------------------ */
function EditorBox({
  heightClassName = "h-[360px]",
  placeholder = "여기에 마크다운을 작성하세요...\n\n# 제목\n- 항목\n- 항목\n\n---\n\n> 인용문",
}: {
  heightClassName?: string;
  placeholder?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <MarkdownToolbar />
      </div>
      <div className="p-4">
        <textarea
          disabled
          className={cx(
            "w-full cursor-not-allowed resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 opacity-80",
            "focus:outline-none",
            heightClassName,
          )}
          placeholder={placeholder}
        />
        <div className="mt-3 text-[12px] text-slate-500">0 글자 (디자인)</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   ✅ 1번(카드형) 확정: 제목 ↔ 폴더 위치 교체
   - 저장 관련 UI 제거
   - 모든 버튼/입력 비활성
------------------------------------------------------------------ */
export default function NewNotePage() {
  return (
    <main className="min-h-[calc(100dvh-24px)] bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 md:p-6">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        {/* 상단 카드 */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-slate-500">
                NOTES / NEW
              </div>
              <div className="text-[18px] font-bold text-slate-900">
                새 노트 만들기
              </div>
            </div>

            {/* 저장 관련 버튼은 제외. (디자인상 자리만 필요하면 아래를 켜도 됨) */}
            <div className="flex items-center gap-2">
              <GhostBtn>
                <FiArrowLeft className="h-4 w-4" />
                뒤로
              </GhostBtn>
              <PrimaryBtn>
                <FiLayout className="h-4 w-4" />
                생성
              </PrimaryBtn>
            </div>
          </div>

          {/* ✅ 요청: 제목 먼저 / 폴더는 아래로 */}
          <TitleRow />
          <div className="mt-4">
            <FolderSelectRow />
          </div>
        </div>

        {/* 에디터 */}
        <EditorBox />
      </div>
    </main>
  );
}
