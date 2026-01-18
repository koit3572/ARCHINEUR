"use client";

import type { ReactNode } from "react";
import { FiX, FiMenu } from "react-icons/fi";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function SidebarContainer({
  mobileOpen,
  onCloseMobile,
  onOpenMobile,
  fabLabel = "메뉴",
  children,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenMobile: () => void;
  fabLabel?: string;
  children: ReactNode;
}) {
  return (
    <>
      {/* ✅ 모바일 공통 FAB (모든 페이지 동일) */}
      {!mobileOpen ? (
        <button
          type="button"
          onClick={onOpenMobile}
          className={cx(
            "lg:hidden",
            "fixed right-5 top-5 z-[60]",
            "inline-flex items-center gap-2",
            "rounded-full border border-slate-200 bg-white/95",
            "px-4 py-2.5 text-[12px] font-semibold text-slate-800",
            "shadow-[0_10px_30px_rgba(15,23,42,0.10)]",
            "backdrop-blur",
            "hover:bg-white",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
          )}
        >
          <FiMenu className="h-4 w-4 text-slate-600" />
          {fabLabel}
        </button>
      ) : null}

      {/* ✅ 데스크톱: 우측 브라우저뷰에 고정 (기존 구조로 복구) */}
      <aside
        className={cx(
          "hidden lg:block",
          "fixed right-0 top-0 z-[40]",
          "h-dvh w-[340px]",
          "border-l border-slate-200",
          "bg-white/80 backdrop-blur",
          "shadow-[0_18px_60px_rgba(15,23,42,0.10)]",
        )}
      >
        <div className="h-full">{children}</div>
      </aside>

      {/* ✅ 모바일 드로어 */}
      <div className={cx("lg:hidden", mobileOpen ? "" : "pointer-events-none")}>
        {/* 오버레이 */}
        <div
          onClick={onCloseMobile}
          className={cx(
            "fixed inset-0 z-[55] bg-black/30 backdrop-blur-[1px] transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />

        {/* 패널 */}
        <div
          className={cx(
            "fixed right-0 top-0 z-[56] h-dvh w-[86vw] max-w-[360px]",
            "bg-white shadow-[0_18px_60px_rgba(15,23,42,0.22)]",
            "border-l border-slate-200",
            "transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* 모바일 닫기 */}
          <div className="flex items-center justify-end px-4 pt-4">
            <button
              type="button"
              onClick={onCloseMobile}
              className={cx(
                "inline-flex h-10 w-10 items-center justify-center rounded-full",
                "border border-slate-200 bg-white",
                "text-slate-700 shadow-sm",
                "hover:bg-slate-50",
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
              )}
              aria-label="Close sidebar"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          <div className="h-[calc(100dvh-56px)]">{children}</div>
        </div>
      </div>
    </>
  );
}
