// src/features/protected/shell/(shell)/components/sidebar/Sidebar.tsx
"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FiPlus } from "react-icons/fi";

import SidebarContainer from "./SidebarContainer";
import SidebarHeader from "./SidebarHeader";
import TocPanel from "./panels/TocPanel";
import ModeNav from "./settings/ModeNav";
import HiddenRatioCard from "./settings/HiddenRatioCard";
import LogoutButton from "./footer/LogoutButton";

type Props = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenMobile: () => void;
};

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

declare global {
  interface Window {
    __ARCHINEUR_NOTE_NEW_GUARD__?: (next: () => void) => void;
  }
}

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
  onOpenMobile,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isStreamView = pathname.startsWith("/workbench/stream");
  const isNotesList = pathname === "/notes";
  const isNotesCreate = pathname === "/notes/new";
  const isNoteDetailView =
    pathname.startsWith("/notes/") && pathname !== "/notes" && !isNotesCreate;
  const isPostView = pathname.includes("/post/"); // legacy

  const showToc = isPostView || isNoteDetailView;

  const active = useMemo<"notes" | "stream" | null>(() => {
    if (isStreamView) return "stream";
    if (isNotesList) return "notes";
    return null;
  }, [isStreamView, isNotesList]);

  const guardedPush = useCallback(
    (href: string) => {
      onCloseMobile();

      const guard =
        typeof window !== "undefined"
          ? window.__ARCHINEUR_NOTE_NEW_GUARD__
          : undefined;

      if (typeof guard === "function") {
        guard(() => router.push(href));
        return;
      }

      router.push(href);
    },
    [router, onCloseMobile],
  );

  const goNotes = useCallback(() => {
    guardedPush("/notes");
  }, [guardedPush]);

  const goStream = useCallback(() => {
    guardedPush("/workbench/stream");
  }, [guardedPush]);

  const goCreateNote = useCallback(() => {
    if (isNotesCreate) return;
    guardedPush("/notes/new");
  }, [guardedPush, isNotesCreate]);

  const header = useMemo(() => {
    if (showToc) {
      return {
        title: "노트 목차",
        subtitle: "노트목록 / 연습풀이로 이동 가능",
        tone: "toc" as const,
        fabLabel: "목차",
      };
    }

    if (isStreamView) {
      return {
        title: "연습 설정",
        subtitle: "모드 선택 · 빈칸 비율 (feed)",
        tone: "default" as const,
        fabLabel: "메뉴",
      };
    }

    if (isNotesCreate) {
      return {
        title: "노트생성",
        subtitle: "새 폴더/파일 만들기",
        tone: "default" as const,
        fabLabel: "메뉴",
      };
    }

    if (isNotesList) {
      return {
        title: "노트",
        subtitle: "노트목록 · 연습풀이",
        tone: "default" as const,
        fabLabel: "메뉴",
      };
    }

    return {
      title: "메뉴",
      subtitle: "노트목록 · 연습풀이",
      tone: "default" as const,
      fabLabel: "메뉴",
    };
  }, [showToc, isStreamView, isNotesList, isNotesCreate]);

  const createActive = isNotesCreate;

  return (
    <SidebarContainer
      mobileOpen={mobileOpen}
      onCloseMobile={onCloseMobile}
      onOpenMobile={onOpenMobile}
      fabLabel={header.fabLabel}
    >
      <div className="h-full flex flex-col">
        <SidebarHeader
          title={header.title}
          subtitle={header.subtitle}
          tone={header.tone}
        />

        <div className="flex-1 overflow-y-auto p-5">
          <ModeNav active={active} onGoNotes={goNotes} onGoStream={goStream} />

          <div className="mt-3">
            <button
              type="button"
              onClick={(e) => {
                if (createActive) {
                  e.preventDefault();
                  return;
                }
                goCreateNote();
              }}
              aria-pressed={createActive}
              aria-current={createActive ? "page" : undefined}
              aria-disabled={createActive}
              tabIndex={createActive ? -1 : 0}
              className={cx(
                "w-full rounded-2xl border px-4 py-3 text-left transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                createActive
                  ? "border-slate-900 bg-slate-900 cursor-default pointer-events-none"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cx(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                    createActive
                      ? "bg-white/10 text-white"
                      : "bg-slate-100 text-slate-700",
                  )}
                >
                  <FiPlus className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={cx(
                      "text-sm font-semibold",
                      createActive ? "text-white" : "text-slate-900",
                    )}
                  >
                    노트생성
                  </div>
                  <div
                    className={cx(
                      "mt-0.5 truncate text-xs",
                      createActive ? "text-white/70" : "text-slate-500",
                    )}
                  >
                    새 폴더/파일 만들기
                  </div>
                </div>
              </div>
            </button>
          </div>

          {showToc ? (
            <div className="mt-5">
              <TocPanel onNavigate={onCloseMobile} />
            </div>
          ) : (
            <>
              {isStreamView ? (
                <div className="mt-5">
                  <HiddenRatioCard />
                </div>
              ) : null}

              <div className="h-6" />
            </>
          )}
        </div>

        <div className="shrink-0">
          <LogoutButton />
        </div>
      </div>
    </SidebarContainer>
  );
}
