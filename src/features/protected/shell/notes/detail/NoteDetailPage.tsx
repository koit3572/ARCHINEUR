// src/features/protected/shell/notes/detail/NoteDetailPage.tsx
"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  db,
  useDB,
  useTable,
  type RootRow,
  type FolderRow,
  type NoteRow,
} from "@/lib/data";

import Breadcrumb from "./components/Breadcrumb";
import NoteHeaderCard from "./components/NoteHeaderCard";
import NextPrevSection from "./components/NextPrevSection";
import FavoritesSection from "./components/FavoritesSection";

import { stripProblemBrackets } from "./lib/markdown";

import NoteMarkdown from "@/features/protected/shell/notes/components/NoteMarkdown";

type MockRoot = Pick<RootRow, "id" | "title">;
type MockFolder = Pick<FolderRow, "id" | "root_id" | "name">;
type MockNote = Pick<
  NoteRow,
  "id" | "folder_id" | "title" | "created_at" | "content"
>;

export default function NoteDetailPage({ noteId }: { noteId: string }) {
  const router = useRouter();

  // ✅ 데이터 (항상 배열로 방어)
  const dbState = useDB() as any;

  const roots: RootRow[] = Array.isArray(dbState?.roots)
    ? dbState.roots
    : Array.isArray(dbState?.data?.roots)
      ? dbState.data.roots
      : [];

  const folders: FolderRow[] = Array.isArray(dbState?.folders)
    ? dbState.folders
    : Array.isArray(dbState?.data?.folders)
      ? dbState.data.folders
      : [];

  const notes: NoteRow[] = Array.isArray(dbState?.notes)
    ? dbState.notes
    : Array.isArray(dbState?.data?.notes)
      ? dbState.data.notes
      : [];

  // ✅ note favorites: DB 기반 (localStorage 철회)
  const noteFavRows = useTable("note_favorites") as any[];
  const favoriteIds = useMemo(() => {
    return (noteFavRows ?? [])
      .map((r) => String(r?.note_id ?? ""))
      .filter(Boolean);
  }, [noteFavRows]);

  // ✅ (옵션) noteDetail에서 별도 토글 필요하면 사용
  // const toggleFavorite = async (id: string) => {
  //   try {
  //     await (db as any)?.toggleFavorite?.(id);
  //   } catch (e) {
  //     console.error("[NoteDetail] toggleFavorite failed:", e);
  //   }
  // };

  const data = useMemo(() => {
    const note =
      (notes as any[]).find((n) => String(n.id) === String(noteId)) ?? null;
    if (!note) {
      return {
        note: null as MockNote | null,
        folder: null as MockFolder | null,
        root: null as MockRoot | null,
      };
    }

    const folder =
      (folders as any[]).find((f) => String(f.id) === String(note.folder_id)) ??
      null;
    const root = folder
      ? ((roots as any[]).find(
          (r) => String(r.id) === String(folder.root_id),
        ) ?? null)
      : null;

    return {
      note: note as MockNote,
      folder: folder as MockFolder | null,
      root: root as MockRoot | null,
    };
  }, [noteId, notes, folders, roots]);

  if (!data.note) {
    return (
      <div className="min-w-0">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            노트를 찾을 수 없어요
          </div>
          <div className="mt-2 text-xs text-slate-500">
            삭제되었거나 잘못된 링크일 수 있어요.
          </div>
        </div>
      </div>
    );
  }

  const note = data.note;
  const folder = data.folder;
  const root = data.root;

  const metaPath = `${root?.title ?? "Root"} / ${folder?.name ?? "Folder"}`;

  const displayContent = useMemo(
    () => stripProblemBrackets(note.content ?? ""),
    [note.content],
  );

  const nav = useMemo(() => {
    const allNotes = notes as any as MockNote[];
    const allFolders = folders as any as MockFolder[];

    const current =
      allNotes.find((n) => String(n.id) === String(noteId)) ?? null;
    if (!current)
      return { prev: null as MockNote | null, next: null as MockNote | null };

    const sameFolder = allNotes.filter(
      (n) => String(n.folder_id) === String(current.folder_id),
    );

    const source =
      sameFolder.length >= 2
        ? sameFolder
        : (() => {
            const folderObj =
              allFolders.find(
                (f) => String(f.id) === String(current.folder_id),
              ) ?? null;
            const rootId = folderObj?.root_id;
            if (!rootId) return [current];

            const folderIds = new Set(
              allFolders
                .filter((f) => String(f.root_id) === String(rootId))
                .map((f) => String(f.id)),
            );
            return allNotes.filter((n) => folderIds.has(String(n.folder_id)));
          })();

    const sorted = [...source].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    });

    const idx = sorted.findIndex((n) => String(n.id) === String(noteId));
    if (idx < 0 || sorted.length === 0) return { prev: null, next: null };

    const len = sorted.length;
    const prev = sorted[(idx - 1 + len) % len] ?? null;
    const next = sorted[(idx + 1) % len] ?? null;

    return { prev, next };
  }, [noteId, notes, folders]);

  const goNote = (id: string) => {
    router.push(`/notes/${encodeURIComponent(id)}`);
  };

  return (
    <div className="min-w-0 space-y-6">
      <Breadcrumb metaPath={metaPath} title={note.title} />

      <NoteHeaderCard title={note.title} />

      <section className="bg-transparent">
        <article>
          <div className="px-6 py-7 sm:px-10 sm:py-10">
            <div
              id="practice-post-content"
              className="mx-auto w-full max-w-[91.25rem]"
            >
              <NoteMarkdown markdown={displayContent} withHeadingIds />
            </div>
          </div>
        </article>
      </section>

      <NextPrevSection
        nav={nav}
        roots={roots}
        folders={folders}
        onGoNote={goNote}
      />

      <FavoritesSection
        favoriteIds={favoriteIds}
        noteId={noteId}
        notes={notes}
        roots={roots}
        folders={folders}
        onGoNote={goNote}
      />
    </div>
  );
}
