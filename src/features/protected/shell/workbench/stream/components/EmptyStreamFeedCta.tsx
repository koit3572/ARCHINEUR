"use client";

import { FiArrowRight, FiFileText, FiPlus } from "react-icons/fi";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function EmptyFeedCta({
  onCreateNote,
  onGoNotes,
}: {
  onCreateNote: () => void;
  onGoNotes: () => void;
}) {
  return (
    <div className="min-h-[calc(100vh-340px)] w-full flex items-center justify-center">
      <section className="w-full max-w-[760px] px-4 sm:px-8">
        {/* ✅ 외곽 카드/그라데이션/블러/테두리/그림자 모두 제거 */}
        <div className="text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <FiFileText className="h-5 w-5 text-slate-700" />
          </div>

          <div className="mt-5 text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            아직 문제가 없어요
          </div>

          <div className="mt-2 text-sm leading-relaxed text-slate-600">
            노트 하나만 만들면 바로 시작돼요.
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onCreateNote}
              className={cx(
                "inline-flex items-center justify-center gap-2",
                "rounded-xl bg-slate-900 px-4 py-2.5",
                "text-sm font-semibold text-white transition",
                "hover:bg-slate-800 active:bg-slate-900",
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
              )}
            >
              <FiPlus className="h-4 w-4" />
              노트 만들기
              <FiArrowRight className="h-4 w-4 opacity-80" />
            </button>

            <button
              type="button"
              onClick={onGoNotes}
              className={cx(
                "inline-flex items-center justify-center gap-2",
                "rounded-xl border border-slate-200 bg-white px-4 py-2.5",
                "text-sm font-semibold text-slate-800 transition",
                "hover:bg-slate-50 active:bg-white",
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
              )}
            >
              노트 목록
              <FiArrowRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
