"use client";

import { supabase } from "@/lib/supabase/client";

export default function LoginButtons() {
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const loginWithKakao = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={loginWithGoogle}
        className="
          rounded-full
          bg-white
          px-6 py-3
          text-sm font-medium
          text-slate-700
          shadow
          border
          hover:bg-slate-50
        "
      >
        Google로 시작하기
      </button>

      <button
        onClick={loginWithKakao}
        className="
          rounded-full
          bg-yellow-300
          px-6 py-3
          text-sm font-medium
          text-slate-800
          shadow
          hover:bg-yellow-400
        "
      >
        Kakao로 시작하기
      </button>
    </div>
  );
}
