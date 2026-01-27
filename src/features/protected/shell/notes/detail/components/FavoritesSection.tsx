// src/features/protected/shell/notes/detail/components/FavoritesSection.tsx
"use client";

import { useMemo } from "react";
import { FiCornerDownRight, FiStar } from "react-icons/fi";
import type { RootRow, FolderRow, NoteRow } from "@/lib/data";
import { isFavNote } from "../lib/favorites";

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

/** ✅ 즐겨찾기: 4번(리스트형 + 번호 배지 + hover open) */
export default function FavoritesSection({
  favoriteIds,
  noteId,
  notes,
  roots,
  folders,
  onGoNote,
}: {
  favoriteIds: string[];
  noteId: string;
  notes: NoteRow[];
  roots: RootRow[];
  folders: FolderRow[];
  onGoNote: (id: string) => void;
}) {
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

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiStar className="h-4 w-4 text-slate-500" />
            <div className="text-xs font-semibold text-slate-900">즐겨찾기</div>
          </div>
          <div className="text-xs text-slate-500">{favoriteNotes.length}</div>
        </div>
      </div>

      {favoriteNotes.length === 0 ? (
        <div className="px-6 py-5 text-xs text-slate-500">
          즐겨찾기한 노트가 없어요.
        </div>
      ) : (
        <div className="max-h-[21.5rem] overflow-y-auto">
          <div className="divide-y divide-slate-100">
            {favoriteNotes.map(({ note: n, meta }, idx) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onGoNote(n.id)}
                className="group w-full px-6 py-3 text-left transition hover:bg-slate-50"
                style={{ height: 56 }}
                title={n.title}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-600">
                    {String(idx + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold text-slate-900">
                      {n.title}
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {meta}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">
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
}
