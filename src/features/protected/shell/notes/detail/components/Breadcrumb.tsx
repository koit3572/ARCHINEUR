// src/features/protected/shell/notes/detail/components/Breadcrumb.tsx
"use client";

import { FiFolder } from "react-icons/fi";

export default function Breadcrumb({
  metaPath,
  title,
}: {
  metaPath: string;
  title: string;
}) {
  return (
    <div className="hidden md:block">
      <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600 shadow-sm">
        <FiFolder className="h-3.5 w-3.5 text-slate-400" />
        <span className="truncate">{metaPath}</span>
        <span className="text-slate-300">›</span>
        <span className="truncate font-semibold text-slate-800">{title}</span>
      </div>
    </div>
  );
}
