"use client";

import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiSliders } from "react-icons/fi";

import PageLoading from "@/components/layout/PageLoading";

// ✅ practice 전용
import PracticeSidebar from "./practice/components/PracticeSidebar";
import { TokenSettingsProvider } from "./practice/lib/TokenSettings";
import type { PracticeMode } from "./practice/types";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function isPracticeMode(v: string | null): v is PracticeMode {
  return v === "feed" || v === "note" || v === "exam";
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [checking, setChecking] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ auth check
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      setChecking(false);
    };

    checkAuth();
  }, [router]);

  // ✅ 여기부터 “훅 없이” 파생값만 계산 (조건부 return 전에 훅 추가 금지)
  const isPractice = pathname.startsWith("/practice");
  const isPostView = pathname.startsWith("/practice/post/");

  const urlMode = searchParams.get("mode");
  const modeFromUrl: PracticeMode = isPracticeMode(urlMode) ? urlMode : "feed";

  // /practice/post/* 에서는 note로 고정
  const mode: PracticeMode = isPractice
    ? isPostView
      ? "note"
      : modeFromUrl
    : "feed";

  // ✅ callbacks도 항상 동일하게 훅 호출
  const onChangeMode = useCallback(
    (next: PracticeMode) => {
      setMobileOpen(false);
      router.push(`/practice?mode=${next}`);
    },
    [router]
  );

  const onOpenMobile = useCallback(() => setMobileOpen(true), []);
  const onCloseMobile = useCallback(() => setMobileOpen(false), []);

  const title =
    isPostView || mode === "note"
      ? "정리노트"
      : mode === "exam"
      ? "실전풀이"
      : "연습풀이";

  // ✅ 기존 패턴 유지: /practice에서만 lockViewport
  const lockViewport =
    pathname === "/practice" && (mode === "note" || mode === "exam");

  // ✅ 이제 return 분기 (훅은 이미 다 호출됨)
  if (checking) return <PageLoading />;

  if (!isPractice) return <>{children}</>;

  return (
    <TokenSettingsProvider>
      <main
        className={cx(
          "bg-gradient-to-br from-slate-50 via-white to-slate-50",
          lockViewport ? "h-[100dvh] overflow-hidden" : "min-h-screen"
        )}
      >
        <div
          className={cx(
            "mx-auto max-w-[1320px] px-6 py-10 lg:pr-[360px]",
            lockViewport ? "h-full flex flex-col min-h-0" : ""
          )}
        >
          {/* 상단 타이틀 라인 */}
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="text-[12px] font-medium text-slate-500">
                Practice
              </div>
              <div className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-slate-900">
                {title}
              </div>
            </div>

            {/* 모바일: 설정 버튼 */}
            <button
              type="button"
              onClick={onOpenMobile}
              className="
                lg:hidden
                inline-flex items-center gap-2
                rounded-md border border-slate-200 bg-white
                px-3 py-2 text-sm font-medium text-slate-700
                shadow-[0_10px_30px_rgba(15,23,42,0.06)]
                hover:bg-slate-50
              "
            >
              <FiSliders className="h-4 w-4 text-slate-500" />
              설정
            </button>
          </div>

          <div className={lockViewport ? "min-h-0 flex-1" : ""}>{children}</div>
        </div>

        <PracticeSidebar
          mode={mode}
          onChangeMode={onChangeMode}
          mobileOpen={mobileOpen}
          onCloseMobile={onCloseMobile}
          onOpenMobile={onOpenMobile}
        />
      </main>
    </TokenSettingsProvider>
  );
}
