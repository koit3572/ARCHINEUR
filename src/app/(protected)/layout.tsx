"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PageLoading from "@/components/layout/PageLoading";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      // 필요하면 여기서 로그인 가드
      // if (!user) router.replace("/");

      setChecking(false);
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) return <PageLoading />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {children}
    </main>
  );
}
