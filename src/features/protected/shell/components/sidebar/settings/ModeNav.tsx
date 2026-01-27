"use client";

import { FiBookOpen, FiLayers } from "react-icons/fi";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type Props = {
  active: "notes" | "stream" | null;
  onGoNotes: () => void;
  onGoStream: () => void;
};

export default function ModeNav({ active, onGoNotes, onGoStream }: Props) {
  const notesActive = active === "notes";
  const streamActive = active === "stream";

  const baseBtn =
    "w-full rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200";
  const activeCls = "border-slate-900 bg-slate-900 text-white shadow-sm";
  const idleCls = "border-slate-200 bg-white text-slate-900 hover:bg-slate-50";

  return (
    <section className="space-y-3">
      <div className="text-xs font-semibold text-slate-500">학습 영역</div>

      {/* 노트목록 */}
      <button
        type="button"
        onClick={onGoNotes}
        className={cx(baseBtn, notesActive ? activeCls : idleCls)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cx(
                "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg",
                notesActive
                  ? "bg-white/15"
                  : "bg-slate-50 border border-slate-200",
              )}
            >
              <FiBookOpen
                className={cx(
                  "h-4 w-4",
                  notesActive ? "text-white" : "text-slate-700",
                )}
              />
            </span>

            <div className="min-w-0">
              <div className="text-sm font-semibold">노트목록</div>
              <div
                className={cx(
                  "mt-1 text-xs",
                  notesActive ? "text-white/75" : "text-slate-500",
                )}
              >
                노트를 관리·확인
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* 연습풀이 */}
      <button
        type="button"
        onClick={onGoStream}
        className={cx(baseBtn, streamActive ? activeCls : idleCls)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cx(
                "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg",
                streamActive
                  ? "bg-white/15"
                  : "bg-slate-50 border border-slate-200",
              )}
            >
              <FiLayers
                className={cx(
                  "h-4 w-4",
                  streamActive ? "text-white" : "text-slate-700",
                )}
              />
            </span>

            <div className="min-w-0">
              <div className="text-sm font-semibold">연습풀이</div>
              <div
                className={cx(
                  "mt-1 text-xs",
                  streamActive ? "text-white/75" : "text-slate-500",
                )}
              >
                문제를 흐름으로 소화
              </div>
            </div>
          </div>
        </div>
      </button>
    </section>
  );
}
