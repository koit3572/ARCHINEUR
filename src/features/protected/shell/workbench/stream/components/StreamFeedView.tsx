// src/features/protected/shell/workbench/stream/components/StreamFeedView.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useInfiniteFeed } from "../hooks/useInfiniteFeed";
import { db, useTable, type RootRow, type FolderRow } from "@/lib/data";
import MarkdownRenderer from "./markdown/MarkdownRenderer";
import EmptyStreamFeedCta from "./EmptyStreamFeedCta";
import { useMarkdownTokenSettings } from "@/features/protected/shell/workbench/stream/lib/MarkdownTokenSettings";

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

export default function StreamFeedView() {
  const router = useRouter();
  const { effectiveHiddenPercent } = useMarkdownTokenSettings();

  const [ready, setReady] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const bootedRef = useRef(false);

  useEffect(() => {
    let alive = true;

    Promise.resolve(db.ensure())
      .then(() => {
        if (!alive) return;
        setReady(true);
      })
      .catch(() => {
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
      (folders ?? []).map((f) => [f.id, { name: f.name, root_id: f.root_id }]),
    );

    return (folderId: string) => {
      const folder = folderMap.get(folderId);
      if (!folder) return "";
      const rootTitle = rootMap.get(folder.root_id);
      return rootTitle ? `${rootTitle} / ${folder.name}` : folder.name;
    };
  }, [roots, folders]);

  useEffect(() => {
    if (!ready) return;
    if (bootedRef.current) return;

    if (items.length > 0) {
      bootedRef.current = true;
      setInitialLoadDone(true);
      return;
    }

    bootedRef.current = true;

    Promise.resolve(loadMore(3))
      .finally(() => {
        setInitialLoadDone(true);
      })
      .catch(() => {
        setInitialLoadDone(true);
      });
  }, [ready, items.length, loadMore]);

  useEffect(() => {
    if (!ready) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        loadMore(3);
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );

    observer.observe(el);

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

  const showEmpty = ready && initialLoadDone && items.length === 0;

  if (showEmpty) {
    const NOTE_CREATE_PATH = "/notes/new";
    const NOTE_LIST_PATH = "/notes";

    return (
      <div className="w-full">
        <EmptyStreamFeedCta
          onCreateNote={() => router.push(NOTE_CREATE_PATH)}
          onGoNotes={() => router.push(NOTE_LIST_PATH)}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <section className="space-y-0">
        {items.map((item, idx) => (
          <div key={item.instanceId}>
            <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1rem_40.25rem_rgba(15,23,42,0.06)]">
              {/* ✅ md → lg 로 올려서 “중간폭”에서 찌그러짐 방지 */}
              <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)]">
                {/* meta rail */}
                <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-4 lg:border-b-0 lg:border-r">
                  <div className="truncate text-xs font-medium tracking-wide text-slate-400">
                    {pathMap(item.problem.folder_id)}
                  </div>

                  <div
                    className="mt-2 text-sm font-semibold leading-snug tracking-[-0.01em] text-slate-900"
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

                  <div className="mt-4 text-xs leading-snug text-slate-500">
                    Scream · Feed
                  </div>
                </div>

                {/* markdown */}
                <div className="min-w-0 px-5 py-5">
                  <MarkdownRenderer
                    tokenMode="input"
                    hiddenPercentOverride={effectiveHiddenPercent}
                    markdown={item.problem.markdown}
                  />
                </div>
              </div>
            </article>

            {idx !== items.length - 1 && <InterCardDivider />}
          </div>
        ))}
      </section>

      <div ref={sentinelRef} className="h-10" />
    </div>
  );
}
