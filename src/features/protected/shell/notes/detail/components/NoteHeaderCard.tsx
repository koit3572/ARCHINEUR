// src/features/protected/shell/notes/detail/components/NoteHeaderCard.tsx
"use client";

import { FiFileText } from "react-icons/fi";

export default function NoteHeaderCard({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="h-[3px] w-full bg-slate-900/5" />

      <div className="bg-gradient-to-b from-white to-slate-50/60 px-4 py-5 sm:px-8 sm:py-7">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            <FiFileText className="h-3.5 w-3.5 text-slate-400" />
            정리노트
          </span>
          <div className="shrink-0" />
        </div>

        <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200/80" />
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <div className="h-px flex-1 bg-slate-200/80" />
        </div>
      </div>
    </section>
  );
}
