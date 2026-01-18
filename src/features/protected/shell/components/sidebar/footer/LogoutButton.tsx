"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiLogOut } from "react-icons/fi";
import { supabase } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-200/70 p-5">
      <button
        onClick={logout}
        disabled={loading}
        className={[
          "inline-flex w-full items-center justify-center gap-2",
          "rounded-md border border-slate-200 bg-white px-4 py-2.5",
          "text-sm font-semibold text-slate-700 shadow-sm transition",
          loading ? "opacity-60" : "hover:bg-slate-50",
        ].join(" ")}
      >
        <FiLogOut className="h-4 w-4 text-slate-500" />
        {loading ? "로그아웃 중..." : "로그아웃"}
      </button>
    </div>
  );
}
