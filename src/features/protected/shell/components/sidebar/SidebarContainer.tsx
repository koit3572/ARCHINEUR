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
      {/* 모바일 FAB */}
      {!mobileOpen ? (
        <button
          type="button"
          onClick={onOpenMobile}
          className={cx(
            "lg:hidden",
            "fixed right-5 top-5 z-[9999]",
            "inline-flex items-center gap-2",
            "rounded-full border border-slate-200 bg-white/95",
            "px-4 py-2.5 text-xs font-semibold text-slate-800",
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

      {/* 데스크톱 고정 사이드바 */}
      <aside
        className={cx(
          "hidden lg:block",
          "fixed right-0 top-0 z-[40]",
          "h-dvh w-[360px]",
          "border-l border-slate-200",
          "bg-white/80 backdrop-blur",
          "shadow-[0_18px_24px_rgba(15,23,42,0.10)]",
        )}
      >
        <div className="h-full">{children}</div>
      </aside>

      {/* 모바일 드로어 */}
      <div className={cx("lg:hidden", mobileOpen ? "" : "pointer-events-none")}>
        {/* 오버레이 */}
        <div
          onClick={onCloseMobile}
          className={cx(
            "fixed inset-0 z-[1000] bg-black/30 backdrop-blur-[1px] transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />

        {/* 패널 */}
        <div
          className={cx(
            "fixed right-0 top-0 z-[1001] h-dvh w-[86vw] max-w-[360px]",
            "bg-white ",
            "border-l border-slate-200",
            "transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="h-[calc(100dvh-806px)]">{children}</div>
        </div>
      </div>
    </>
  );
}
