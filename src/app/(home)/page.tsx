"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import LoginButtons from "@/components/btn/LoginButtons";
import { supabase } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (user) {
        router.replace("/workbench/stream"); // 첫 protected 페이지
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <section className="text-center space-y-6">
        <h1 className="text-3xl font-bold">ARCHINEUR</h1>
        <p className="text-slate-500">당신만의 학습과 기록 공간</p>
        <LoginButtons />
      </section>
    </main>
  );
}
