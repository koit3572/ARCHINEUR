// src/features/protected/shell/notes/detail/NoteDetailPage.tsx
"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

import { useDB, type RootRow, type FolderRow, type NoteRow } from "@/lib/data";

import Breadcrumb from "./components/Breadcrumb";
import NoteHeaderCard from "./components/NoteHeaderCard";
import NextPrevSection from "./components/NextPrevSection";
import FavoritesSection from "./components/FavoritesSection";

import {
  toPlainText,
  cleanHeadingText,
  makeSlugger,
  stripProblemBrackets,
} from "./lib/markdown";
import { readFavoriteIdsFromLocalStorage } from "./lib/favorites";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type MockRoot = Pick<RootRow, "id" | "title">;
type MockFolder = Pick<FolderRow, "id" | "root_id" | "name">;
type MockNote = Pick<
  NoteRow,
  "id" | "folder_id" | "title" | "created_at" | "content"
>;

export default function NoteDetailPage({ noteId }: { noteId: string }) {
  const router = useRouter();

  // ✅ 데이터 (항상 배열로 방어)
  const dbState = useDB();
  const roots = Array.isArray(dbState.roots)
    ? (dbState.roots as RootRow[])
    : [];
  const folders = Array.isArray(dbState.folders)
    ? (dbState.folders as FolderRow[])
    : [];
  const notes = Array.isArray(dbState.notes)
    ? (dbState.notes as NoteRow[])
    : [];

  const data = useMemo(() => {
    const note = (notes as any[]).find((n) => n.id === noteId) ?? null;
    if (!note) {
      return {
        note: null as MockNote | null,
        folder: null as MockFolder | null,
        root: null as MockRoot | null,
      };
    }

    const folder =
      (folders as any[]).find((f) => f.id === note.folder_id) ?? null;
    const root = folder
      ? ((roots as any[]).find((r) => r.id === folder.root_id) ?? null)
      : null;

    return {
      note: note as MockNote,
      folder: folder as MockFolder | null,
      root: root as MockRoot | null,
    };
  }, [noteId, notes, folders, roots]);

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const load = () => setFavoriteIds(readFavoriteIdsFromLocalStorage());
    load();

    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!data.note) {
    return (
      <div className="min-w-0">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-[14px] font-semibold text-slate-900">
            노트를 찾을 수 없어요
          </div>
          <div className="mt-2 text-[12px] text-slate-500">
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

  const mdComponents: Components = useMemo(() => {
    const { slugify } = makeSlugger();

    const H1 = ({ children }: { children: React.ReactNode }) => {
      const text = cleanHeadingText(toPlainText(children));
      const id = slugify(text);
      return (
        <h2
          id={id}
          className="scroll-mt-24 mb-4 mt-10 text-[18px] sm:text-[20px] font-semibold tracking-tight text-slate-900"
        >
          {children}
        </h2>
      );
    };

    const H2 = ({ children }: { children: React.ReactNode }) => {
      const text = cleanHeadingText(toPlainText(children));
      const id = slugify(text);
      return (
        <h3
          id={id}
          className="scroll-mt-24 mb-3 mt-9 text-[15px] sm:text-[16px] font-semibold tracking-tight text-slate-900"
        >
          {children}
        </h3>
      );
    };

    const H3 = ({ children }: { children: React.ReactNode }) => {
      const text = cleanHeadingText(toPlainText(children));
      const id = slugify(text);
      return (
        <h4
          id={id}
          className="scroll-mt-24 mb-2 mt-7 text-[13px] sm:text-[14px] font-semibold text-slate-900"
        >
          {children}
        </h4>
      );
    };

    return {
      h1: H1,
      h2: H2,
      h3: H3,

      p: ({ children }) => (
        <p className="my-2 text-[13.5px] sm:text-[14px] leading-7 text-slate-800">
          {children}
        </p>
      ),

      ul: ({ children }) => <ul className="my-3 space-y-1.5">{children}</ul>,
      ol: ({ children }) => (
        <ol className="my-3 space-y-1.5 list-decimal ml-5">{children}</ol>
      ),
      li: ({ children }) => (
        <li className="ml-5 list-disc text-[13.5px] sm:text-[14px] leading-7 text-slate-800">
          {children}
        </li>
      ),

      hr: () => (
        <div className="my-10">
          <div className="h-px w-full bg-slate-200/80" />
        </div>
      ),

      blockquote: ({ children }) => (
        <blockquote className="my-7 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[13.5px] sm:text-[14px] leading-7 text-slate-700">
          {children}
        </blockquote>
      ),

      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-600"
        >
          {children}
        </a>
      ),

      code: (props: any) => {
        const inline = Boolean(props?.inline);
        const children = props?.children;

        if (inline) {
          return (
            <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] text-slate-800">
              {children}
            </code>
          );
        }
        return (
          <pre className="my-6 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-[12px] leading-6 text-slate-800">
            <code>{children}</code>
          </pre>
        );
      },

      strong: ({ children }) => (
        <strong className="font-semibold text-slate-900">{children}</strong>
      ),
    };
  }, []);

  const nav = useMemo(() => {
    const allNotes = notes as any as MockNote[];
    const allFolders = folders as any as MockFolder[];

    const current = allNotes.find((n) => n.id === noteId) ?? null;
    if (!current)
      return { prev: null as MockNote | null, next: null as MockNote | null };

    const sameFolder = allNotes.filter(
      (n) => n.folder_id === current.folder_id,
    );

    const source =
      sameFolder.length >= 2
        ? sameFolder
        : (() => {
            const folderObj =
              allFolders.find((f) => f.id === current.folder_id) ?? null;
            const rootId = folderObj?.root_id;
            if (!rootId) return [current];

            const folderIds = new Set(
              allFolders.filter((f) => f.root_id === rootId).map((f) => f.id),
            );
            return allNotes.filter((n) => folderIds.has(n.folder_id));
          })();

    const sorted = [...source].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    });

    const idx = sorted.findIndex((n) => n.id === noteId);
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
              className="mx-auto w-full max-w-[920px]"
            >
              <ReactMarkdown components={mdComponents}>
                {displayContent}
              </ReactMarkdown>
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
