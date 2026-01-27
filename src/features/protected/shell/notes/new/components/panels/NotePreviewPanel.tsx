// src/features/protected/shell/notes/new/components/panels/NotePreviewPanel.tsx
"use client";

import MarkdownRenderer from "@/features/protected/shell/workbench/stream/components/markdown/MarkdownRenderer";

export default function NotePreviewPanel({ mdRaw }: { mdRaw: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {!mdRaw.trim() ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6 text-sm text-slate-600">
          아직 내용이 없어요. 작성 탭에서 내용을 입력해줘.
        </div>
      ) : (
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_40px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-200 bg-slate-50/60 px-5 py-4">
            <div className="truncate text-xs font-medium tracking-wide text-slate-400">
              미리보기 / 노트
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              노트 미리보기
            </div>
          </div>

          <div className="min-w-0 px-5 py-5">
            <MarkdownRenderer tokenMode={"text" as any} markdown={mdRaw} />
          </div>
        </article>
      )}
    </div>
  );
}
