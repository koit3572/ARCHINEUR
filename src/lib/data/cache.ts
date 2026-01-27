"use client";

import type { Snapshot, Tables } from "./types";

/* =========================
   In-memory Cache
========================= */
export const EMPTY: Snapshot = {
  roots: [],
  folders: [],
  notes: [],
  note_favorites: [],
  user_folder_favorites: [],
  user_root_favorites: [],
  note_recents: [],
  note_progress: [],
  note_drafts: [],
  _version: 0,
};

let cache: Snapshot = EMPTY;

export const listeners = new Set<() => void>();

export function emit() {
  for (const fn of listeners) fn();
}

export function bump(next: Tables): Snapshot {
  return {
    ...next,
    _version: (cache?._version ?? 0) + 1,
  };
}

export function setCache(next: Snapshot) {
  cache = next;
  emit();
}

export function getSnapshot(): Snapshot {
  return cache;
}

export function getServerSnapshot(): Snapshot {
  return EMPTY;
}
