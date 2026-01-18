"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "@/features/protected/shell/components/sidebar/Sidebar";

import type { StreamMode } from "@/features/protected/shell/workbench/stream/lib/types";
import { MarkdownTokenSettingsProvider } from "@/features/protected/shell/workbench/stream/lib/MarkdownTokenSettings";

export default function ShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const onOpenMobile = useCallback(() => setMobileOpen(true), []);
  const onCloseMobile = useCallback(() => setMobileOpen(false), []);

  const isPostView = pathname.includes("/post/");
  const isStreamView = pathname.startsWith("/workbench/stream");

  // ✅ query(mode=feed) 제거: 라우트로만 판단
  const mode: StreamMode = useMemo(() => {
    if (isPostView) return "note";
    return isStreamView ? "feed" : "note";
  }, [isPostView, isStreamView]);

  return (
    <MarkdownTokenSettingsProvider mode={mode}>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* ✅ 사이드바 공간 확보 */}
        <div className="mx-auto max-w-[1320px] px-6 py-10 lg:pr-[360px]">
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
