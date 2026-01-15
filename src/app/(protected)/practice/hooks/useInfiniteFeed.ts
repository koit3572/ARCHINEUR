"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, useTable, type NoteRow } from "@/lib/data";

export type FeedProblem = {
  id: string; // `${note.id}-${blockIndex}`
  note_id: string;
  folder_id: string;
  title: string;
  markdown: string;
  block_index: number;
};

export type FeedItem = {
  instanceId: string;
  problem: FeedProblem;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/* --- 기준 문제 분리 (끝 --- 정리 포함) */
function splitMarkdown(content: string): string[] {
  const blocks = String(content ?? "")
    .split(/\n---\n/g)
    .map((b) =>
      b
        .replace(/^\s*---\s*/g, "")
        .replace(/\s*---\s*$/g, "")
        .trim()
    )
    .filter(Boolean);

  // 맨 앞 # 제목 제거
  if (blocks[0]?.startsWith("# ")) blocks.shift();

  return blocks;
}

/** ✅ 초기 3개: 렌더 중 랜덤 없이 */
function buildInitialItems(pool: FeedProblem[], count = 3): FeedItem[] {
  if (pool.length === 0) return [];

  const picked: FeedProblem[] = [];
  const used = new Set<string>();

  for (const p of pool) {
    if (picked.length >= count) break;
    if (used.has(p.id)) continue;

    const last = picked[picked.length - 1];
    if (last && last.note_id === p.note_id) continue;

    used.add(p.id);
    picked.push(p);
  }

  if (picked.length < count) {
    for (const p of pool) {
      if (picked.length >= count) break;
      if (used.has(p.id)) continue;
      used.add(p.id);
      picked.push(p);
    }
  }

  return picked.map((problem, i) => ({
    instanceId: `init-${problem.id}-${i}`,
    problem,
  }));
}

export function useInfiniteFeed() {
  useEffect(() => {
    db.ensure();
  }, []);

  const notes = useTable("notes") as NoteRow[];

  const POOL = useMemo<FeedProblem[]>(() => {
    const out: FeedProblem[] = [];

    for (const note of notes ?? []) {
      const blocks = splitMarkdown(note.content ?? "");

      blocks.forEach((md, index) => {
        out.push({
          id: `${note.id}-${index}`,
          note_id: String(note.id),
          folder_id: String(note.folder_id),
          title: String(note.title ?? "Untitled"),
          markdown: md,
          block_index: index,
        });
      });
    }

    return out;
  }, [notes]);

  const initialItems = useMemo(() => buildInitialItems(POOL, 3), [POOL]);
  const [items, setItems] = useState<FeedItem[]>(() => initialItems);

  /** ✅ instanceId 증가용 */
  const seqRef = useRef<number>(initialItems.length);

  /** ✅ 최근 뽑힌 문제 id(중복 방지) */
  const recentIdsRef = useRef<string[]>(initialItems.map((i) => i.problem.id));

  /** ✅ 최근 “번호(block_index)” 반복 방지 */
  const recentBlockIdxRef = useRef<number[]>(
    initialItems.map((i) => i.problem.block_index)
  );

  /** ✅ 직전 노트/번호(연속 피하기) */
  const lastMetaRef = useRef<{
    note_id: string | null;
    block_index: number | null;
  }>({
    note_id: initialItems[initialItems.length - 1]?.problem.note_id ?? null,
    block_index:
      initialItems[initialItems.length - 1]?.problem.block_index ?? null,
  });

  /**
   * ✅ 핵심: POOL이 줄어들면(삭제) 기존 items에 남아있던 카드 제거
   * - note 삭제/폴더 삭제/문제 분할 결과 변경 모두 반영
   */
  useEffect(() => {
    const validIds = new Set(POOL.map((p) => p.id));

    setItems((prev) => {
      const filtered = prev.filter((it) => validIds.has(it.problem.id));

      // 다 사라졌는데 pool은 있으면 최소 3개 재시드
      if (filtered.length === 0 && POOL.length > 0) {
        const seeded = buildInitialItems(POOL, 3);
        seqRef.current = seeded.length;
        recentIdsRef.current = seeded.map((i) => i.problem.id);
        recentBlockIdxRef.current = seeded.map((i) => i.problem.block_index);
        lastMetaRef.current = {
          note_id: seeded[seeded.length - 1]?.problem.note_id ?? null,
          block_index: seeded[seeded.length - 1]?.problem.block_index ?? null,
        };
        return seeded;
      }

      return filtered;
    });
  }, [POOL]);

  const pickNext = useCallback(
    (avoidIds: Set<string>) => {
      if (POOL.length === 0) return null;

      const lastNote = lastMetaRef.current.note_id;
      const lastBlock = lastMetaRef.current.block_index;

      const recentBlockSet = new Set(recentBlockIdxRef.current.slice(-10));
      const recentIdSet = new Set(recentIdsRef.current.slice(-25));

      for (let i = 0; i < 60; i++) {
        const p = randomPick(POOL);

        if (avoidIds.has(p.id)) continue;
        if (recentIdSet.has(p.id)) continue;

        if (i < 30) {
          if (lastNote && p.note_id === lastNote) continue;
          if (lastBlock !== null && p.block_index === lastBlock) continue;
          if (recentBlockSet.has(p.block_index)) continue;
        } else if (i < 45) {
          if (lastNote && p.note_id === lastNote) continue;
          if (lastBlock !== null && p.block_index === lastBlock) continue;
        } else {
          if (lastBlock !== null && p.block_index === lastBlock) continue;
        }

        return p;
      }

      const fallback =
        POOL.find((p) => !avoidIds.has(p.id)) ?? randomPick(POOL);
      return fallback;
    },
    [POOL]
  );

  const loadMore = useCallback(
    (count = 3) => {
      setItems((prev) => {
        const next: FeedItem[] = [];
        const avoidIds = new Set<string>([
          ...prev.slice(-25).map((v) => v.problem.id),
        ]);

        for (let i = 0; i < count; i++) {
          const p = pickNext(avoidIds);
          if (!p) break;

          avoidIds.add(p.id);

          recentIdsRef.current.push(p.id);
          recentBlockIdxRef.current.push(p.block_index);
          lastMetaRef.current = {
            note_id: p.note_id,
            block_index: p.block_index,
          };

          const seq = seqRef.current++;
          next.push({
            instanceId: `it-${p.id}-${seq}`,
            problem: p,
          });
        }

        return [...prev, ...next];
      });
    },
    [pickNext]
  );

  return { items, loadMore };
}
