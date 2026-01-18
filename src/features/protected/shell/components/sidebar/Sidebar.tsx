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

  // ✅ /notes(목록)일 때만 notes 활성, /stream일 때만 stream 활성
  // ✅ /notes/[noteId]에서는 둘 다 비활성(null)
  // ✅ /notes/new 는 별도 create 카드가 활성 처리됨
  const active = useMemo<"notes" | "stream" | null>(() => {
    if (isStreamView) return "stream";
    if (isNotesList) return "notes";
    return null;
  }, [isStreamView, isNotesList]);

  const goNotes = useCallback(() => {
    onCloseMobile();
    router.push("/notes");
  }, [router, onCloseMobile]);

  const goStream = useCallback(() => {
    onCloseMobile();
    router.push("/workbench/stream");
  }, [router, onCloseMobile]);

  const goCreateNote = useCallback(() => {
    onCloseMobile();
    router.push("/notes/new");
  }, [router, onCloseMobile]);

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

          {/* ✅ 노트생성: /notes/new 일 때 검정 활성 */}
          <div className="mt-3">
            <button
              type="button"
              onClick={goCreateNote}
              aria-pressed={createActive}
              className={cx(
                "w-full rounded-2xl border px-4 py-3 text-left transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
                createActive
                  ? "border-slate-900 bg-slate-900"
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
                      "text-[13px] font-semibold",
                      createActive ? "text-white" : "text-slate-900",
                    )}
                  >
                    노트생성
                  </div>
                  <div
                    className={cx(
                      "mt-0.5 truncate text-[12px]",
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
