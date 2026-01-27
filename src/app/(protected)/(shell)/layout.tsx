"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "@/features/protected/shell/components/sidebar/Sidebar";

import type { StreamMode } from "@/features/protected/shell/workbench/stream/lib/types";
import { MarkdownTokenSettingsProvider } from "@/features/protected/shell/workbench/stream/lib/MarkdownTokenSettings";

export default function ShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // 모바일 사이드바 열림 상태
  const [mobileOpen, setMobileOpen] = useState(false);
  const onOpenMobile = useCallback(() => setMobileOpen(true), []);
  const onCloseMobile = useCallback(() => setMobileOpen(false), []);

  // 화면 모드 결정(피드/노트)
  const isPostView = pathname.includes("/post/");
  const isStreamView = pathname.startsWith("/workbench/stream");

  const mode: StreamMode = useMemo(() => {
    if (isPostView) return "note";
    return isStreamView ? "feed" : "note";
  }, [isPostView, isStreamView]);

  // 새 노트 작성 화면에서 TopDock 높이만큼 상단 패딩 보정
  const isNoteNew = pathname === "/notes/new";

  return (
    <MarkdownTokenSettingsProvider mode={mode}>
      <main className="min-h-screen bg-white">
        <div
          className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:pr-[384px]"
          style={
            isNoteNew
              ? { paddingTop: "var(--note-new-dock-h, 0px)" }
              : undefined
          }
        >
          {children}
        </div>

        <Sidebar
          mobileOpen={mobileOpen}
          onCloseMobile={onCloseMobile}
          onOpenMobile={onOpenMobile}
        />
      </main>
    </MarkdownTokenSettingsProvider>
  );
}
