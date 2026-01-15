"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteFeed } from "../hooks/useInfiniteFeed";
import { db, useTable, type RootRow, type FolderRow } from "@/lib/data";
import MarkdownRenderer from "./markdown/MarkdownRenderer";

function InterCardDivider() {
  return (
    <div className="relative my-4">
      <div className="h-px bg-slate-200/70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center">
        <div className="w-full px-4 md:px-6">
          <div className="border-t border-dashed border-slate-300/70" />
        </div>
      </div>
    </div>
  );
}

export default function PracticeFeedView() {
  const [ready, setReady] = useState(false);
  const bootedRef = useRef(false);

  useEffect(() => {
    let alive = true;

    Promise.resolve(db.ensure())
      .then(() => {
        if (!alive) return;
        setReady(true);
      })
      .catch(() => {
        // ensure가 실패해도 화면이 영원히 멈추는 건 방지
        if (!alive) return;
        setReady(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  const roots = useTable("roots") as RootRow[];
  const folders = useTable("folders") as FolderRow[];

  const { items, loadMore } = useInfiniteFeed();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const pathMap = useMemo(() => {
    const rootMap = new Map((roots ?? []).map((r) => [r.id, r.title]));
    const folderMap = new Map(
      (folders ?? []).map((f) => [f.id, { name: f.name, root_id: f.root_id }])
    );

    return (folderId: string) => {
      const folder = folderMap.get(folderId);
      if (!folder) return "";
      const rootTitle = rootMap.get(folder.root_id);
      return rootTitle ? `${rootTitle} / ${folder.name}` : folder.name;
    };
  }, [roots, folders]);

  // ✅ 로그인 직후(첫 진입)에도 무조건 1번은 로드 걸어주기
  useEffect(() => {
    if (!ready) return;
    if (bootedRef.current) return;

    // 이미 hook이 초기 로드를 해줬다면 굳이 안 때림
    if (items.length > 0) {
      bootedRef.current = true;
      return;
    }

    bootedRef.current = true;
    loadMore(3);
  }, [ready, items.length, loadMore]);

  // ✅ db.ensure 이후에만 observer 연결
  useEffect(() => {
    if (!ready) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        loadMore(3);
      },
      { root: null, rootMargin: "240px", threshold: 0 }
    );

    observer.observe(el);

    // ✅ 관찰 시작 시점에 sentinel이 이미 화면 안이면 한번 더 보정
    requestAnimationFrame(() => {
      const now = sentinelRef.current;
      if (!now) return;
      const rect = now.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 240) {
        loadMore(3);
      }
    });

    return () => observer.disconnect();
  }, [ready, loadMore]);

  return (
    <div className="w-full">
      <section className="space-y-0">
        {items.map((item, idx) => (
          <div key={item.instanceId}>
            <article className="border border-slate-200 bg-white rounded-lg shadow-[0_16px_44px_rgba(15,23,42,0.06)] overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)]">
                {/* meta rail */}
                <div className="border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/60 px-4 py-4">
                  <div className="text-[11px] font-medium tracking-wide text-slate-400 truncate">
                    {pathMap(item.problem.folder_id)}
                  </div>

                  <div
                    className="mt-2 text-[14px] font-semibold tracking-[-0.01em] text-slate-900 leading-snug"
                    title={item.problem.title}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.problem.title}
                  </div>

                  <div className="mt-4 text-[12px] text-slate-500 leading-snug">
                    Practice · Blocks
                  </div>
                </div>

                {/* markdown */}
                <div className="px-5 py-5">
                  <MarkdownRenderer
                    tokenMode="input"
                    markdown={item.problem.markdown}
                  />
                </div>
              </div>
            </article>

            {idx !== items.length - 1 && <InterCardDivider />}
          </div>
        ))}
      </section>

      {/* ✅ sentinel은 반드시 “높이”를 줘야 안정적 */}
      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}
