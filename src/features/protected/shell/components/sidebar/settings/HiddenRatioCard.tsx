"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMarkdownTokenSettings } from "@/features/protected/shell/workbench/stream/lib/MarkdownTokenSettings";

function clampPercent(v: number) {
  return Math.max(0, Math.min(100, v));
}

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function HiddenRatioCard({ disabled }: { disabled: boolean }) {
  const { hiddenPercent, setHiddenPercent, effectiveHiddenPercent } =
    useMarkdownTokenSettings();

  // feed가 아니면 effectiveHiddenPercent는 0/100으로 고정될 수 있음
  const shownPercent = useMemo(() => {
    return Math.round(
      clampPercent(disabled ? effectiveHiddenPercent : hiddenPercent),
    );
  }, [disabled, effectiveHiddenPercent, hiddenPercent]);

  const [dragging, setDragging] = useState(false);
  const [percentInput, setPercentInput] = useState<string>(
    String(shownPercent),
  );
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPercentInput(String(shownPercent));
  }, [shownPercent]);

  const setByClientX = (clientX: number) => {
    const el = barRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = Math.max(rect.left, Math.min(rect.right, clientX));
    const ratio = (x - rect.left) / rect.width;
    setHiddenPercent(clampPercent(Math.round(ratio * 100)));
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => setByClientX(e.clientX);
    const onUp = () => setDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const commitPercentInput = () => {
    if (disabled) {
      setPercentInput(String(shownPercent));
      return;
    }

    const raw = percentInput.trim();
    if (raw === "") {
      setPercentInput(String(shownPercent));
      return;
    }

    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setPercentInput(String(shownPercent));
      return;
    }

    const clamped = clampPercent(Math.round(n));
    setHiddenPercent(clamped);
    setPercentInput(String(clamped));
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/60 px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold text-slate-900">
          빈칸 비율
        </div>

        <div className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={percentInput}
            disabled={disabled}
            onChange={(e) => setPercentInput(e.target.value)}
            onBlur={commitPercentInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitPercentInput();
                (e.currentTarget as HTMLInputElement).blur();
              } else if (e.key === "Escape") {
                setPercentInput(String(shownPercent));
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            className={cx(
              "w-[64px] rounded-md border px-2 py-1 text-right text-[12px] font-semibold bg-white",
              disabled
                ? "border-slate-200 text-slate-500 opacity-70 cursor-not-allowed"
                : "border-slate-200 text-slate-800 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200",
            )}
            aria-label="빈칸 비율 입력"
          />
          <span className="text-[12px] font-semibold text-slate-700">%</span>
        </div>
      </div>

      <div
        ref={barRef}
        className={cx(
          "mt-3 relative h-2 rounded-full bg-slate-200",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-ew-resize",
        )}
        onMouseDown={(e) => {
          if (disabled) return;
          setDragging(true);
          setByClientX(e.clientX);
        }}
        onTouchStart={(e) => {
          if (disabled) return;
          const x = e.touches[0]?.clientX;
          if (typeof x === "number") setByClientX(x);
        }}
        onTouchMove={(e) => {
          if (disabled) return;
          const x = e.touches[0]?.clientX;
          if (typeof x === "number") setByClientX(x);
        }}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shownPercent}
      >
        <div
          className="h-2 rounded-full bg-slate-900"
          style={{ width: `${shownPercent}%` }}
        />

        <div
          className={cx(
            "absolute top-1/2 -translate-y-1/2",
            disabled ? "opacity-70" : "opacity-100",
          )}
          style={{ left: `calc(${shownPercent}% - 8px)` }}
        >
          <div
            className={cx(
              "h-4 w-4 rounded-full border bg-white shadow-sm",
              disabled
                ? "border-slate-200"
                : dragging
                  ? "border-slate-400 ring-2 ring-slate-200"
                  : "border-slate-300",
            )}
          />
        </div>
      </div>

      <div className="mt-2 text-[12px] leading-snug text-slate-600">
        공개 토큰은 일반 텍스트, 비공개 토큰은 빈칸/입력.
        {disabled && (
          <span className="ml-1 text-slate-500">
            (연습풀이에서만 조절 가능합니다.)
          </span>
        )}
      </div>
    </div>
  );
}
