// src/features/home/HomePage.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import LoginButtons from "@/features/home/components/LoginButtons";
import { createClient } from "@/lib/supabase/client";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (user) {
        router.replace("/workbench/stream");
        return;
      }

      setChecking(false);
    };

    check();

    return () => {
      mounted = false;
    };
  }, [router]);

  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[660px] w-[660px] -translate-x-1/2 rounded-full bg-slate-200/40 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-[820px] w-[820px] -translate-x-1/2 rounded-full bg-slate-100/70 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-lg items-center px-5 py-10 sm:px-6 sm:py-14">
        <section className="w-full">
          {/* Brand */}
          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              Personal Workspace
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              ARCHINEUR
            </h1>

            <p className="mx-auto mt-3 max-w-[820px] text-sm leading-7 text-slate-600 sm:text-[15px]">
              당신만의 학습과 기록 공간.
              <br className="hidden sm:block" />
              정리노트와 연습을 한 곳에서 자연스럽게 이어가세요.
            </p>
          </div>

          {/* Login area */}
          <div className="mx-auto mt-10 w-full">
            <div className="rounded-3xl bg-white/55 p-6 ring-1 ring-slate-200/60 backdrop-blur sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    시작하기
                  </div>
                  <div className="mt-1 text-xs leading-6 text-slate-600">
                    로그인 후 바로 작업공간으로 이동합니다.
                  </div>
                </div>

                <div
                  className={cx(
                    "shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ring-1",
                    checking
                      ? "bg-slate-100/70 text-slate-600 ring-slate-200/70"
                      : "bg-white/60 text-slate-600 ring-slate-200/60",
                  )}
                >
                  <span
                    className={cx(
                      "h-1.5 w-1.5 rounded-full",
                      checking ? "bg-slate-400" : "bg-slate-300",
                    )}
                  />
                  {checking ? "Checking…" : "Ready"}
                </div>
              </div>

              <div className="mt-7">
                <LoginButtons />
                <div className="mt-3 text-center text-xs text-slate-500">
                  {checking ? "로그인 상태 확인 중…" : "로그인해서 시작하세요."}
                </div>
              </div>

              <div className="mt-7 text-center text-[11px] text-slate-500">
                © {year} ARCHINEUR
              </div>
            </div>

            <div className="mt-4 text-center text-[11px] text-slate-500">
              로그인하면 바로{" "}
              <span className="font-semibold text-slate-700">workbench</span>로
              이동합니다.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
