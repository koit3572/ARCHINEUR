// src/app/(protected)/practice/post/[noteId]/page.tsx
"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import {
  FiFileText,
  FiFolder,
  FiArrowRight,
  FiStar,
  FiCornerDownRight,
} from "react-icons/fi";

import { useDB, type RootRow, type FolderRow, type NoteRow } from "@/lib/data";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function toPlainText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(toPlainText).join("");
  if (
    children &&
    typeof children === "object" &&
    "props" in (children as any)
  ) {
    return toPlainText((children as any).props?.children);
  }
  return "";
}

function cleanHeadingText(s: string) {
  return s
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]/g, "$1")
    .trim();
}

function makeSlugger() {
  const counts = new Map<string, number>();

  const slugify = (s: string) => {
    const base =
      s
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "") || "section";

    const cur = counts.get(base) ?? 0;
    const next = cur + 1;
    counts.set(base, next);

    return next === 1 ? base : `${base}-${next}`;
  };

  return { slugify };
}

/** post에서 문제용 [] 제거 / [[,]] → [,] 치환 (링크/레퍼런스는 최대한 보존) */
function stripProblemBrackets(markdown: string) {
  const s0 = (markdown ?? "").replace(/\[\[/g, "[").replace(/\]\]/g, "]");

  return s0.replace(
    /\[([^\]\[]+?)\]/g,
    (m, inner: string, offset: number, str: string) => {
      const prev = offset > 0 ? str[offset - 1] : "";
      const next = str[offset + m.length] ?? "";

      if (prev === "!") return m; // ![alt](url)
      if (next === "(" || next === "[" || next === ":") return m; // [t](u) / [t][id] / [id]:
      if (inner.startsWith("^")) return m; // [^1]
      return inner; // token bracket 제거
    }
  );
}

type MockRoot = Pick<RootRow, "id" | "title">;
type MockFolder = Pick<FolderRow, "id" | "root_id" | "name">;
type MockNote = Pick<
  NoteRow,
  "id" | "folder_id" | "title" | "created_at" | "content"
>;

function metaPathOf(note: MockNote, rs: MockRoot[], fs: MockFolder[]) {
  const folder = fs.find((f) => f.id === note.folder_id) ?? null;
  const root = folder ? rs.find((r) => r.id === folder.root_id) ?? null : null;
  return `${root?.title ?? "Root"} / ${folder?.name ?? "Folder"}`;
}

function isFavNote(n: any, favIds: string[]) {
  if (favIds.includes(String(n?.id ?? ""))) return true;
  return Boolean(n?.is_favorite || n?.favorite || n?.isFavorite);
}

function readFavoriteIdsFromLocalStorage(): string[] {
  if (typeof window === "undefined") return [];

  const keys = [
    "practice:favorites",
    "practice:favoriteNoteIds",
    "practice:favNoteIds",
    "favorite_note_ids",
    "favoriteNoteIds",
  ];

  for (const k of keys) {
    const raw = window.localStorage.getItem(k);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);

      if (parsed && typeof parsed === "object") {
        const maybe = (parsed.ids || parsed.noteIds || parsed.favorites) as any;
        if (Array.isArray(maybe)) return maybe.map(String).filter(Boolean);
      }
    } catch {
      if (raw.includes(",")) {
        return raw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }
    }
  }

  return [];
}

export default function Page() {
  const router = useRouter();
  const params = useParams();

  // useParams()는 string | string[] 가능성 있음
  const rawParam = (params?.noteId as string | string[] | undefined) ?? "";
  const noteId = safeDecode(
    Array.isArray(rawParam) ? rawParam[0] ?? "" : rawParam
  );

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
      ? (roots as any[]).find((r) => r.id === folder.root_id) ?? null
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
    [note.content]
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
      (n) => n.folder_id === current.folder_id
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
              allFolders.filter((f) => f.root_id === rootId).map((f) => f.id)
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

  const goPost = (id: string) => {
    router.push(`/practice/post/${encodeURIComponent(id)}`);
  };

  const favoriteNotes = useMemo(() => {
    const all = notes as any[];
    const rs = roots as any as MockRoot[];
    const fs = folders as any as MockFolder[];

    const picked = all
      .filter((n) => isFavNote(n, favoriteIds))
      .map((n) => n as MockNote)
      .filter((n) => n && n.id !== noteId);

    picked.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    return picked.map((n) => ({
      note: n,
      meta: metaPathOf(n, rs, fs),
    }));
  }, [favoriteIds, noteId, notes, roots, folders]);

  /** ✅ 이어서 읽기: 1번(양쪽 큰 버튼 2개) */
  const NextPrevSection = () => {
    const rs = roots as any as MockRoot[];
    const fs = folders as any as MockFolder[];

    const prev = nav.prev;
    const next = nav.next;

    const prevMeta = prev ? metaPathOf(prev, rs, fs) : "";
    const nextMeta = next ? metaPathOf(next, rs, fs) : "";

    const BigNav = ({
      kind,
      n,
      meta,
    }: {
      kind: "prev" | "next";
      n: MockNote | null;
      meta: string;
    }) => {
      const disabled = !n;

      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => n && goPost(n.id)}
          className={cx(
            "group relative w-full text-left",
            "p-5 sm:p-6",
            "transition-colors",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
            disabled ? "cursor-not-allowed opacity-55" : "hover:bg-slate-50"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cx(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                  disabled
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : "border-slate-200 bg-white text-slate-600"
                )}
              >
                {kind === "prev" ? "이전" : "다음"}
                <span className="ml-2 text-[10px] tracking-widest text-slate-400">
                  {kind === "prev" ? "PREV" : "NEXT"}
                </span>
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div
              className={cx(
                "flex gap-1 min-w-0 line-clamp-2 text-[16px] leading-snug",
                disabled ? "text-slate-500" : "text-slate-900"
              )}
            >
              <div className="font-semibold">
                {n?.title ?? "이동할 노트가 없습니다"}
              </div>

              <div
                className={cx(
                  "flex items-center shrink-0 text-right text-[8px]",
                  disabled ? "text-slate-400" : "text-slate-500"
                )}
                title={meta || ""}
              >
                {meta || "—"}
              </div>
            </div>

            <FiArrowRight
              className={cx(
                "h-4 w-4 shrink-0 text-slate-300 transition",
                kind === "prev" ? "rotate-180" : "",
                disabled ? "" : "group-hover:text-slate-500"
              )}
            />
          </div>

          {!disabled ? (
            <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-transparent transition group-hover:ring-slate-900/5" />
          ) : null}
        </button>
      );
    };

    return (
      <section className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex gap-3">
            <div className="text-[12px] font-semibold text-slate-900">
              이어서 읽기
            </div>
          </div>
        </div>

        <div className="sm:grid sm:grid-cols-2">
          <div className="border-b border-slate-200 sm:border-b-0 sm:border-r">
            <BigNav kind="prev" n={nav.prev} meta={prevMeta} />
          </div>
          <div>
            <BigNav kind="next" n={nav.next} meta={nextMeta} />
          </div>
        </div>
      </section>
    );
  };

  /** ✅ 즐겨찾기: 4번(리스트형 + 번호 배지 + hover open) */
  const FavoritesSection = () => {
    return (
      <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FiStar className="h-4 w-4 text-slate-500" />
              <div className="text-[12px] font-semibold text-slate-900">
                즐겨찾기
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              {favoriteNotes.length}
            </div>
          </div>
        </div>

        {favoriteNotes.length === 0 ? (
          <div className="px-6 py-5 text-[12px] text-slate-500">
            즐겨찾기한 노트가 없어요.
          </div>
        ) : (
          <div className="max-h-[224px] overflow-y-auto">
            <div className="divide-y divide-slate-100">
              {favoriteNotes.map(({ note: n, meta }, idx) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => goPost(n.id)}
                  className="group w-full px-6 py-3 text-left transition hover:bg-slate-50"
                  style={{ height: 56 }}
                  title={n.title}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-[13px] font-semibold text-slate-900">
                        {n.title}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                        {meta}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 opacity-0 transition group-hover:opacity-100">
                      open <FiCornerDownRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* 경로 (데스크톱) */}
      <div className="hidden md:block">
        <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600 shadow-sm">
          <FiFolder className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">{metaPath}</span>
          <span className="text-slate-300">›</span>
          <span className="truncate font-semibold text-slate-800">
            {note.title}
          </span>
        </div>
      </div>

      {/* 헤더 */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="h-[3px] w-full bg-slate-900/5" />

        <div className="bg-gradient-to-b from-white to-slate-50/60 px-4 py-5 sm:px-8 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 shadow-sm">
              <FiFileText className="h-3.5 w-3.5 text-slate-400" />
              정리노트
            </span>
            <div className="shrink-0" />
          </div>

          <h1 className="mt-4 text-[24px] sm:text-[30px] lg:text-[34px] font-semibold tracking-tight text-slate-900">
            {note.title}
          </h1>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200/80" />
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <div className="h-px flex-1 bg-slate-200/80" />
          </div>
        </div>
      </section>

      {/* 본문 */}
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

      {/* ✅ 이어서 읽기(1) + 즐겨찾기(4) */}
      <NextPrevSection />
      <FavoritesSection />
    </div>
  );
}
