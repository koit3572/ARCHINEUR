// src/app/(protected)/practice/components/PracticeSidebar.tsx
"use client";

import type { ElementType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FiBookOpen,
  FiLayers,
  FiX,
  FiLogOut,
  FiList,
  FiArrowLeft,
} from "react-icons/fi";

import type { PracticeMode } from "../types";
import { useTokenSettings } from "../lib/TokenSettings";
import { supabase } from "@/lib/supabase/client";

import { db, useTable, type NoteRow } from "@/lib/data";

type Props = {
  mode: PracticeMode;
  onChangeMode: (mode: PracticeMode) => void;

  /** 모바일 전용 */
  mobileOpen: boolean;
  onCloseMobile: () => void;

  /** ✅ (선택) 모바일에서 우측상단 "목차" 버튼 눌러 사이드바 열기 */
  onOpenMobile?: () => void;
};

function clampPercent(v: number) {
  return Math.max(0, Math.min(100, v));
}

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/* =========================
   TOC (post 전용)
========================= */
type TocItem = { id: string; text: string; level: 1 | 2 | 3 };

function cleanHeadingText(s: string) {
  return s
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]/g, "$1")
    .trim();
}

function makeSlugger() {
  const counts = new Map<string, number>();

  const slugify = (s: string) => {
    const base =
      s
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "") || "section";

    const cur = counts.get(base) ?? 0;
    const next = cur + 1;
    counts.set(base, next);

    return next === 1 ? base : `${base}-${next}`;
  };

  return { slugify };
}

/** ✅ post 표시 컨텐츠와 TOC의 기준을 동일하게 맞추기 위해 사용 */
function stripProblemBrackets(markdown: string) {
  const s0 = (markdown ?? "").replace(/\[\[/g, "[").replace(/\]\]/g, "]");

  return s0.replace(
    /\[([^\]\[]+?)\]/g,
    (m, inner: string, offset: number, str: string) => {
      const prev = offset > 0 ? str[offset - 1] : "";
      const next = str[offset + m.length] ?? "";

      // 이미지 alt: ![alt](url) → 유지
      if (prev === "!") return m;

      // 링크/레퍼런스: [text](url), [text][id], [id]: url → 유지
      if (next === "(" || next === "[" || next === ":") return m;

      // 각주: [^1] → 유지
      if (inner.startsWith("^")) return m;

      // 그 외는 문제 토큰으로 보고 [] 제거
      return inner;
    }
  );
}

function buildToc(markdown: string): TocItem[] {
  const { slugify } = makeSlugger();
  const lines = (markdown ?? "").split(/\r?\n/);

  let inFence = false;
  const out: TocItem[] = [];

  for (const raw of lines) {
    const line = raw ?? "";

    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(/^(#{1,3})\s+(.+)\s*$/);
    if (!m) continue;

    const level = m[1].length as 1 | 2 | 3;
    const text = cleanHeadingText(m[2] ?? "");
    if (!text) continue;

    const id = slugify(text);
    out.push({ id, text, level });
  }

  return out;
}

function extractPostNoteId(pathname: string) {
  // pathname: "/practice/post/<noteId>"
  const prefix = "/practice/post/";
  if (!pathname.startsWith(prefix)) return null;
  const raw = pathname.slice(prefix.length);
  if (!raw) return null;
  return safeDecode(raw);
}

export default function PracticeSidebar({
  mode,
  onChangeMode,
  mobileOpen,
  onCloseMobile,
  onOpenMobile,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ localStorage mock DB seed 보장
  useEffect(() => {
    db.ensure();
  }, []);

  // ✅ notes는 data adapter로만
  const notes = useTable("notes") as NoteRow[];

  const isPostView = pathname.startsWith("/practice/post/");

  // ✅ post에서 "정리노트로"
  const goBackToNotes = useCallback(() => {
    onChangeMode("note");
    router.push("/practice?mode=note");
    onCloseMobile();
  }, [onChangeMode, router, onCloseMobile]);

  const postNoteId = useMemo(
    () => extractPostNoteId(pathname) ?? null,
    [pathname]
  );

  const postNote = useMemo(() => {
    if (!isPostView || !postNoteId) return null;
    return (
      (notes ?? []).find((n) => String((n as any).id) === postNoteId) ?? null
    );
  }, [isPostView, postNoteId, notes]);

  // ✅ TOC는 표시 컨텐츠(브라켓 제거) 기준으로 생성해서 id 불일치 방지
  const postToc = useMemo(() => {
    if (!isPostView) return [];
    const raw = (postNote?.content as string | undefined) ?? "";
    const content = stripProblemBrackets(raw);
    return buildToc(content);
  }, [isPostView, postNote?.content]);

  /**
   * ✅ 핵심 수정:
   * window.scrollTo는 "윈도우 스크롤"만 움직임.
   * 레이아웃에 overflow-hidden / 내부 스크롤 컨테이너가 있으면 안 움직여서
   * scrollIntoView로 변경 (윈도우든 div든 알아서 찾아 스크롤됨)
   */
  const scrollToId = (id: string) => {
    const root =
      document.getElementById("practice-post-content") ?? document.body;

    const scroll = (el: HTMLElement) => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    // 1) 가장 빠른 케이스: id가 실제로 존재
    const direct = root.querySelector(
      `#${CSS.escape(id)}`
    ) as HTMLElement | null;
    if (direct) {
      scroll(direct);
      return;
    }

    // 2) fallback: DOM에 있는 heading들을 같은 slug 규칙으로 다시 만들면서 id 매칭
    const headings = Array.from(
      root.querySelectorAll("h1,h2,h3,h4,h5,h6")
    ) as HTMLElement[];

    const { slugify } = makeSlugger();
    for (const h of headings) {
      const text = cleanHeadingText(h.textContent ?? "");
      if (!text) continue;
      const genId = slugify(text);
      if (genId === id) {
        scroll(h);
        return;
      }
    }
  };

  // ✅ 모바일: 스크롤을 좀 내린 뒤, sidebar가 닫혀있으면 우측상단 "목차" 버튼
  const [showMobileTocFab, setShowMobileTocFab] = useState(false);

  useEffect(() => {
    if (!isPostView) {
      setShowMobileTocFab(false);
      return;
    }

    const onScroll = () => {
      const y = window.scrollY || 0;
      setShowMobileTocFab(y > 220);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isPostView]);

  /* =========================
     기존 학습설정 로직 (post가 아닐 때만 UI로 노출)
  ========================= */
  const { hiddenPercent, setHiddenPercent, effectiveHiddenPercent } =
    useTokenSettings();

  const barRef = useRef<HTMLDivElement | null>(null);

  const [dragging, setDragging] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [percentInput, setPercentInput] = useState<string>("");

  const isFeed = mode === "feed";

  const shownPercent = useMemo(() => {
    const v = isFeed ? hiddenPercent : effectiveHiddenPercent;
    return Math.round(clampPercent(v));
  }, [isFeed, hiddenPercent, effectiveHiddenPercent]);

  useEffect(() => {
    setPercentInput(String(shownPercent));
  }, [shownPercent]);

  const setByClientX = (clientX: number) => {
    const el = barRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = Math.max(rect.left, Math.min(rect.right, clientX));
    const ratio = (x - rect.left) / rect.width;
    setHiddenPercent(clampPercent(ratio * 100));
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => setByClientX(e.clientX);
    const onUp = () => setDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const commitPercentInput = () => {
    if (!isFeed) return;

    const raw = percentInput.trim();
    if (raw === "") {
      setPercentInput(String(shownPercent));
      return;
    }

    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setPercentInput(String(shownPercent));
      return;
    }

    const clamped = clampPercent(Math.round(n));
    setHiddenPercent(clamped);
    setPercentInput(String(clamped));
  };

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } finally {
      setLogoutLoading(false);
    }
  };

  // ✅ 실전풀이(exam) 제거: note/feed만 유지
  const item = (
    key: Exclude<PracticeMode, "exam">,
    label: string,
    desc: string,
    Icon: ElementType
  ) => {
    const active = mode === key;

    return (
      <button
        onClick={() => onChangeMode(key)}
        className={[
          "w-full text-left px-4 py-3 transition",
          active
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-50",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <Icon
            className={[
              "h-4 w-4",
              active ? "text-white" : "text-slate-400",
            ].join(" ")}
          />
          <div className="text-sm font-medium">{label}</div>
        </div>
        <div
          className={[
            "mt-0.5 pl-6 text-xs",
            active ? "text-slate-300" : "text-slate-400",
          ].join(" ")}
        >
          {desc}
        </div>
      </button>
    );
  };

  const TocList = () => {
    if (!postNote) {
      return (
        <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3 text-[12px] text-slate-600">
          노트를 찾을 수 없어요.
        </div>
      );
    }

    if (postToc.length === 0) {
      return (
        <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3 text-[12px] text-slate-600">
          # / ## / ### 제목이 없어서 목차가 비어있어요.
        </div>
      );
    }

    return (
      <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2">
        <div className="max-h-[68dvh] overflow-y-auto overscroll-contain pr-1">
          <div className="space-y-1">
            {postToc.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  // ✅ 모바일이면 먼저 닫고, 애니메이션 프레임 후 이동
                  if (mobileOpen) {
                    onCloseMobile();
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => scrollToId(it.id));
                    });
                    return;
                  }
                  scrollToId(it.id);
                }}
                className={cx(
                  "w-full rounded-md px-3 py-2 text-left transition",
                  "hover:bg-white",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
                )}
                style={{ paddingLeft: 12 + (it.level - 1) * 14 }}
                title={it.text}
              >
                <div
                  className={cx(
                    "truncate text-[12px]",
                    it.level === 1
                      ? "font-semibold text-slate-900"
                      : it.level === 2
                      ? "font-medium text-slate-800"
                      : "font-medium text-slate-700"
                  )}
                >
                  {it.text}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      <div
        onClick={onCloseMobile}
        className={[
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          "lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* ✅ post 모바일: 스크롤 내려서 목차가 안 보이는 느낌일 때 우측상단 버튼 */}
      {isPostView && !mobileOpen && showMobileTocFab && onOpenMobile ? (
        <button
          type="button"
          onClick={onOpenMobile}
          className={cx(
            "fixed right-4 top-4 z-[60] lg:hidden",
            "inline-flex items-center gap-2 rounded-full",
            "border border-slate-200 bg-white px-3 py-2 shadow-sm",
            "text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
          )}
        >
          <FiList className="h-4 w-4 text-slate-500" />
          목차
        </button>
      ) : null}

      {/* 사이드바 */}
      <aside
        className={[
          "fixed top-0 right-0 z-50",
          "h-[100dvh] w-[320px]",
          "border-l border-slate-200",
          "bg-white/90 backdrop-blur",
          "shadow-[-10px_0_30px_rgba(15,23,42,0.05)]",
          "transform transition-transform duration-300 ease-out",
          "lg:translate-x-0 lg:z-30",
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          {/* 헤더 */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-semibold text-slate-900">
                    {isPostView ? "목차" : "학습 설정"}
                  </div>

                  {isPostView ? (
                    <div className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                      {postToc.length}
                    </div>
                  ) : null}
                </div>

                <div className="mt-1 text-[12px] text-slate-500 truncate">
                  {isPostView ? postNote?.title ?? "Note" : "모드 / 빈칸 비율"}
                </div>
              </div>

              <button
                onClick={onCloseMobile}
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Close"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-200/70" />

          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto p-5">
            {isPostView ? (
              <div className="space-y-3">
                <div className="text-[12px] text-slate-500">
                  제목을 클릭하면 해당 위치로 이동
                </div>

                {/* ✅ 정리노트로 (post 전용) */}
                <button
                  type="button"
                  onClick={goBackToNotes}
                  className={cx(
                    "w-full inline-flex items-center justify-center gap-2",
                    "rounded-md border border-slate-200 bg-white px-4 py-2.5",
                    "text-[13px] font-semibold text-slate-700 shadow-sm transition",
                    "hover:bg-slate-50"
                  )}
                >
                  <FiArrowLeft className="h-4 w-4 text-slate-500" />
                  정리노트로
                </button>

                <TocList />
              </div>
            ) : (
              <>
                <nav className="space-y-2">
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    {item("note", "정리노트", "개념을 읽고 정리", FiBookOpen)}
                    <div className="h-px bg-slate-200/70" />
                    {item("feed", "연습풀이", "문제를 흐름으로 소화", FiLayers)}
                  </div>
                </nav>

                {/* 비율 카드 */}
                <div className="mt-5 rounded-md border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="text-[12px] font-semibold text-slate-900">
                        빈칸 비율
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={1}
                        value={percentInput}
                        disabled={!isFeed}
                        onChange={(e) => setPercentInput(e.target.value)}
                        onBlur={commitPercentInput}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitPercentInput();
                            (e.currentTarget as HTMLInputElement).blur();
                          } else if (e.key === "Escape") {
                            setPercentInput(String(shownPercent));
                            (e.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        className={[
                          "w-[64px] rounded-md border px-2 py-1 text-right text-[12px] font-semibold",
                          "bg-white",
                          isFeed
                            ? "border-slate-200 text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            : "border-slate-200 text-slate-500 opacity-70 cursor-not-allowed",
                        ].join(" ")}
                        aria-label="빈칸 비율 입력"
                      />
                      <span className="text-[12px] font-semibold text-slate-700">
                        %
                      </span>
                    </div>
                  </div>

                  <div
                    ref={barRef}
                    className={[
                      "mt-3 relative h-2 rounded-full bg-slate-200",
                      isFeed
                        ? "cursor-ew-resize"
                        : "opacity-60 cursor-not-allowed",
                    ].join(" ")}
                    onMouseDown={(e) => {
                      if (!isFeed) return;
                      setDragging(true);
                      setByClientX(e.clientX);
                    }}
                    onTouchStart={(e) => {
                      if (!isFeed) return;
                      const x = e.touches[0]?.clientX;
                      if (typeof x === "number") setByClientX(x);
                    }}
                    onTouchMove={(e) => {
                      if (!isFeed) return;
                      const x = e.touches[0]?.clientX;
                      if (typeof x === "number") setByClientX(x);
                    }}
                    role="slider"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={shownPercent}
                  >
                    <div
                      className="h-2 rounded-full bg-slate-900"
                      style={{ width: `${shownPercent}%` }}
                    />

                    <div
                      className={[
                        "absolute top-1/2 -translate-y-1/2",
                        isFeed ? "opacity-100" : "opacity-70",
                      ].join(" ")}
                      style={{ left: `calc(${shownPercent}% - 8px)` }}
                    >
                      <div
                        className={[
                          "h-4 w-4 rounded-full border bg-white shadow-sm",
                          isFeed
                            ? dragging
                              ? "border-slate-400 ring-2 ring-slate-200"
                              : "border-slate-300"
                            : "border-slate-200",
                        ].join(" ")}
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-[12px] leading-snug text-slate-600">
                    공개 토큰은 일반 텍스트, 비공개 토큰은 빈칸/입력.
                    {!isFeed && (
                      <span className="ml-1 text-slate-500">
                        (현재 모드에서는 고정)
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-6" />
              </>
            )}
          </div>

          {/* ✅ 로그아웃 (post에서도 유지) */}
          <div className="border-t border-slate-200/70 p-5">
            <button
              onClick={handleLogout}
              disabled={logoutLoading}
              className={[
                "inline-flex w-full items-center justify-center gap-2",
                "rounded-md border border-slate-200",
                "bg-white px-4 py-2.5 text-sm font-semibold",
                "text-slate-700 shadow-sm transition",
                logoutLoading
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-slate-50",
              ].join(" ")}
            >
              <FiLogOut className="h-4 w-4 text-slate-500" />
              {logoutLoading ? "로그아웃 중..." : "로그아웃"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
