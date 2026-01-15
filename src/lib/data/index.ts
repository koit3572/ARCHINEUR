"use client";

import { useSyncExternalStore } from "react";

/* =========================================================
   src/lib/data/index.ts
   - localStorage 단일 DB
   - useSyncExternalStore 안정(getSnapshot 캐싱)
   - db.ensure / CRUD
   - 나중에 Supabase로 갈 때 "이 파일만" 교체하면 됨
========================================================= */

/* =========================
   Row Types
========================= */
export type RootRow = {
  id: string;
  title: string;
  description?: string | null;
  created_at?: string;
};

export type FolderRow = {
  id: string;
  root_id: string;
  name: string;
  parent_id?: string | null;
  order?: number | null;
  created_at?: string;
};

export type NoteRow = {
  id: string;
  folder_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at?: string;
  // 즐겨찾기 같은 임시 필드가 붙어도 안전하게 처리
  [k: string]: any;
};

type Snapshot = {
  roots: RootRow[];
  folders: FolderRow[];
  notes: NoteRow[];
  _version: number;
};

/* =========================
   Storage
========================= */
const STORAGE_KEY = "archineur:db:v1";

/** 구버전/깨진 값 방어용 */
function normalizeSnapshot(raw: any): Snapshot | null {
  if (!raw || typeof raw !== "object") return null;

  const roots = Array.isArray(raw.roots) ? raw.roots : null;
  const folders = Array.isArray(raw.folders) ? raw.folders : null;
  const notes = Array.isArray(raw.notes) ? raw.notes : null;
  if (!roots || !folders || !notes) return null;

  const v =
    typeof raw._version === "number" && Number.isFinite(raw._version)
      ? raw._version
      : 0;

  return {
    roots: roots as RootRow[],
    folders: folders as FolderRow[],
    notes: notes as NoteRow[],
    _version: v,
  };
}

function readFromStorage(): Snapshot | null {
  if (typeof window === "undefined") return null;
  const s = window.localStorage.getItem(STORAGE_KEY);
  if (!s) return null;

  try {
    const parsed = JSON.parse(s);
    return normalizeSnapshot(parsed);
  } catch {
    return null;
  }
}

function writeToStorage(snap: Snapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
}

/* =========================
   Seed
========================= */
function makeSeed(): Snapshot {
  // ✅ seed는 여기서만 mock을 참조 (나중에 Supabase로 갈 땐 이 파일만 교체)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m = require("@/lib/mock/db");

  const roots = (m.roots ?? []) as RootRow[];
  const folders = (m.folders ?? []) as FolderRow[];
  const notes = (m.notes ?? []) as NoteRow[];

  return {
    roots: Array.isArray(roots) ? roots : [],
    folders: Array.isArray(folders) ? folders : [],
    notes: Array.isArray(notes) ? notes : [],
    _version: 1,
  };
}

/* =========================
   In-memory Cache (핵심)
   - getSnapshot이 매번 새 객체를 내면 무한루프 난다
========================= */
let cache: Snapshot | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function ensureCache() {
  if (typeof window === "undefined") return;

  if (cache) return;

  const stored = readFromStorage();
  if (stored) {
    cache = stored;
    return;
  }

  const seeded = makeSeed();
  cache = seeded;
  writeToStorage(seeded);
}

function setCache(next: Snapshot) {
  cache = next;
  writeToStorage(next);
  emit();
}

function bump(next: Omit<Snapshot, "_version">): Snapshot {
  const v = (cache?._version ?? 0) + 1;
  return { ...next, _version: v };
}

/* =========================
   Subscribe (multi-tab sync)
========================= */
function subscribe(cb: () => void) {
  ensureCache();
  listeners.add(cb);

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    const stored = readFromStorage();
    if (!stored) return;
    cache = stored; // ✅ 같은 참조 유지 규칙 준수: storage로 바뀌면 새 snapshot으로 교체
    emit();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Snapshot {
  ensureCache();
  return cache as Snapshot; // ensureCache로 null 방지
}

function getServerSnapshot(): Snapshot {
  // server에서는 빈 스냅샷 (이 파일은 client 전용이지만 안전장치)
  return { roots: [], folders: [], notes: [], _version: 0 };
}

/* =========================
   Public DB API
========================= */
export const db = {
  ensure() {
    ensureCache();
  },

  reset() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    cache = null;
    ensureCache();
    emit();
  },

  getTable<K extends keyof Omit<Snapshot, "_version">>(name: K): Snapshot[K] {
    return getSnapshot()[name];
  },

  setTable<K extends keyof Omit<Snapshot, "_version">>(
    name: K,
    rows: Snapshot[K]
  ) {
    const cur = getSnapshot();
    const next = bump({
      roots: cur.roots,
      folders: cur.folders,
      notes: cur.notes,
      [name]: rows,
    } as any);

    setCache(next);
  },

  insertRow<K extends keyof Omit<Snapshot, "_version">>(
    name: K,
    row: Snapshot[K] extends Array<infer R> ? R : never
  ) {
    const cur = getSnapshot();
    const arr = cur[name] as any[];
    const nextArr = [...arr, row];
    this.setTable(name, nextArr as any);
  },

  updateRow<K extends keyof Omit<Snapshot, "_version">>(
    name: K,
    id: string,
    patch: Partial<Snapshot[K] extends Array<infer R> ? R : never>
  ) {
    const cur = getSnapshot();
    const arr = cur[name] as any[];
    const nextArr = arr.map((r) =>
      String(r?.id) === id ? { ...r, ...patch } : r
    );
    this.setTable(name, nextArr as any);
  },

  deleteRow<K extends keyof Omit<Snapshot, "_version">>(name: K, id: string) {
    const cur = getSnapshot();
    const arr = cur[name] as any[];
    const nextArr = arr.filter((r) => String(r?.id) !== id);
    this.setTable(name, nextArr as any);
  },
} as const;

/* =========================
   Hooks
========================= */
export function useDB() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useTable<K extends keyof Omit<Snapshot, "_version">>(name: K) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return snap[name];
}

export default db;
