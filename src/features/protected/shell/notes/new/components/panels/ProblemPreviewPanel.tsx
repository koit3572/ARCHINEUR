// src/features/protected/shell/notes/new/components/panels/ProblemPreviewPanel.tsx
"use client";

import MarkdownRenderer from "@/features/protected/shell/workbench/stream/components/markdown/MarkdownRenderer";

export default function ProblemPreviewPanel({
  problems,
}: {
  problems: string[];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="space-y-4">
        {problems.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6 text-sm text-slate-600">
            아직 문제가 없어요. 작성 화면에서{" "}
            <span className="font-semibold">Divider(---)</span>로 문제를
            분리해줘.
          </div>
        ) : (
          problems.map((p, idx) => (
            <article
              key={idx}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_40px_rgba(15,23,42,0.06)]"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-4 lg:border-b-0 lg:border-r">
                  <div className="truncate text-xs font-medium tracking-wide text-slate-400">
                    미리보기 / 문제
                  </div>

                  <div className="mt-2 text-sm font-semibold leading-snug text-slate-900">
                    문제 {idx + 1}
                  </div>

                  <div className="mt-4 text-xs leading-snug text-slate-500">
                    --- 로 분리됨
                  </div>
                </div>

                <div className="min-w-0 px-5 py-5">
                  <MarkdownRenderer
                    tokenMode="input"
                    markdown={p}
                    hiddenPercentOverride={50}
                  />
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
