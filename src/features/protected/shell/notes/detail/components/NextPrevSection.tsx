// src/features/protected/shell/notes/detail/components/NextPrevSection.tsx
"use client";

import { useMemo } from "react";
import { FiArrowRight } from "react-icons/fi";
import type { RootRow, FolderRow, NoteRow } from "@/lib/data";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type MockRoot = Pick<RootRow, "id" | "title">;
type MockFolder = Pick<FolderRow, "id" | "root_id" | "name">;
type MockNote = Pick<
  NoteRow,
  "id" | "folder_id" | "title" | "created_at" | "content"
>;

function metaPathOf(note: MockNote, rs: MockRoot[], fs: MockFolder[]) {
  const folder = fs.find((f) => f.id === note.folder_id) ?? null;
  const root = folder
    ? (rs.find((r) => r.id === folder.root_id) ?? null)
    : null;
  return `${root?.title ?? "Root"} / ${folder?.name ?? "Folder"}`;
}

/** ✅ 이어서 읽기: 1번(양쪽 큰 버튼 2개) */
export default function NextPrevSection({
  nav,
  roots,
  folders,
  onGoNote,
}: {
  nav: { prev: MockNote | null; next: MockNote | null };
  roots: RootRow[];
  folders: FolderRow[];
  onGoNote: (id: string) => void;
}) {
  const rs = roots as any as MockRoot[];
  const fs = folders as any as MockFolder[];

  const prev = nav.prev;
  const next = nav.next;

  const prevMeta = useMemo(
    () => (prev ? metaPathOf(prev, rs, fs) : ""),
    [prev, rs, fs],
  );
  const nextMeta = useMemo(
    () => (next ? metaPathOf(next, rs, fs) : ""),
    [next, rs, fs],
  );

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
        onClick={() => n && onGoNote(n.id)}
        className={cx(
          "group relative w-full text-left",
          "p-5 sm:p-6",
          "transition-colors",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
          disabled ? "cursor-not-allowed opacity-55" : "hover:bg-slate-50",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className={cx(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                disabled
                  ? "border-slate-200 bg-slate-50 text-slate-500"
                  : "border-slate-200 bg-white text-slate-600",
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
              disabled ? "text-slate-500" : "text-slate-900",
            )}
          >
            <div className="font-semibold">
              {n?.title ?? "이동할 노트가 없습니다"}
            </div>

            <div
              className={cx(
                "flex items-center shrink-0 text-right text-[8px]",
                disabled ? "text-slate-400" : "text-slate-500",
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
              disabled ? "" : "group-hover:text-slate-500",
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
}
