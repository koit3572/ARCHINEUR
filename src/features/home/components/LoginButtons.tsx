// src/features/home/components/LoginButtons.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { FaGoogle } from "react-icons/fa6";
import { SiKakaotalk } from "react-icons/si";

export default function LoginButtons() {
  const supabase = createClient();

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const loginWithKakao = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: window.location.origin },
    });
  };

  // 카드 래퍼
  const wrap =
    "relative rounded-3xl bg-white/70 ring-1 ring-slate-200/70 backdrop-blur " +
    "shadow-[0_14px_40px_rgba(15,23,42,0.06)]";

  // 로그인 버튼
  const btn =
    "group relative flex w-full items-center justify-between rounded-2xl px-4 py-3 " +
    "text-left transition " +
    "hover:bg-white/80 active:bg-white " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50";

  // 아이콘 박스
  const iconBox =
    "grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 " +
    "ring-1 ring-slate-200/70 text-slate-700 transition " +
    "group-hover:bg-white group-hover:ring-slate-200";

  return (
    <div className={wrap}>
      {/* subtle top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-3xl bg-gradient-to-b from-white/80 to-transparent" />

      <div className="p-2">
        <button type="button" onClick={loginWithGoogle} className={btn}>
          <span className="flex min-w-0 items-center gap-3">
            <span className={iconBox} aria-hidden="true">
              <FaGoogle className="h-4 w-4" />
            </span>

            <span className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                Google로 계속
              </div>
              <div className="mt-0.5 text-xs leading-5 text-slate-500">
                개인 워크스페이스로 바로 이동
              </div>
            </span>
          </span>

          <span className="ml-3 text-xs font-semibold text-slate-400 transition group-hover:text-slate-500">
            →
          </span>
        </button>

        <div className="mx-4 h-px bg-slate-200/70" />

        <button type="button" onClick={loginWithKakao} className={btn}>
          <span className="flex min-w-0 items-center gap-3">
            <span className={iconBox} aria-hidden="true">
              <SiKakaotalk className="h-4 w-4" />
            </span>

            <span className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                Kakao로 계속
              </div>
              <div className="mt-0.5 text-xs leading-5 text-slate-500">
                로그인 후 작업공간으로 이동
              </div>
            </span>
          </span>

          <span className="ml-3 text-xs font-semibold text-slate-400 transition group-hover:text-slate-500">
            →
          </span>
        </button>
      </div>
    </div>
  );
}
