"use client";

import { useMemo, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

type Props = {
  answer: string;
  mode: "text" | "input";
  seed?: string;
};

function isWideChar(codePoint: number) {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x11ff) || // Hangul Jamo
    (codePoint >= 0x3130 && codePoint <= 0x318f) || // Hangul Compatibility Jamo
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) || // Hangul Syllables
    (codePoint >= 0x3040 && codePoint <= 0x30ff) || // Hiragana/Katakana
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) || // CJK Unified Ideographs
    (codePoint >= 0xff01 && codePoint <= 0xff60) || // Fullwidth Forms
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  );
}

/** 정답 문자열을 "대략적인 ch 단위"로 환산 (한글/한자=2, ASCII=1) */
function measureChUnits(text: string) {
  let units = 0;
  for (const ch of text) {
    if (ch === " ") {
      units += 1; // 공백도 1로 (너무 줄면 보기 안좋아서)
      continue;
    }
    const cp = ch.codePointAt(0);
    if (!cp) continue;
    units += isWideChar(cp) ? 2 : 1;
  }
  return units;
}

export default function ConditionToken({ answer, mode }: Props) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);

  const widthStyle = useMemo(() => {
    const base = measureChUnits((answer ?? "").trim());

    // 너무 짧으면 못생김 / 너무 길면 폭발
    const ch = Math.min(Math.max(base, 4), 48);

    // ✅ 아이콘/우측 패딩(pr-10=2.5rem) + 좌측 패딩(px-3=0.75rem) + 버퍼(0.5rem)
    // Tailwind preflight는 border-box라 width에 padding 포함됨.
    const extra = "3rem";

    return {
      width: `calc(${ch}ch + ${extra})`,
      minWidth: "3rem",
      maxWidth: "100%",
    } as const;
  }, [answer]);

  if (mode === "text") return <>{answer}</>;

  const correct = value.trim() === (answer ?? "").trim();

  return (
    <span className="relative inline-flex align-baseline">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={widthStyle}
        className={[
          "h-9",
          "rounded-md border bg-white",
          "px-3 pr-10 text-sm text-slate-900",
          "shadow-[0_1px_0_rgba(0,0,0,0.02)]",
          "max-w-full",
          value === ""
            ? "border-slate-200"
            : correct
            ? "border-emerald-400 bg-emerald-50/60"
            : "border-rose-400 bg-rose-50/60",
        ].join(" ")}
      />

      {/* 👁 아이콘: input 안쪽 */}
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        aria-label={show ? "hide answer" : "show answer"}
        onMouseDown={(e) => e.preventDefault()}
      >
        {show ? (
          <FiEyeOff className="h-[15px] w-[15px]" />
        ) : (
          <FiEye className="h-[15px] w-[15px]" />
        )}
      </button>

      {/* 정답 박스: absolute 오버레이(레이아웃 안 밀림), 답만 */}
      {show && (
        <span
          style={{ minWidth: widthStyle.width }}
          className="
            absolute left-0 top-full z-20 mt-1
            max-w-[min(520px,80vw)]
            rounded-md border border-slate-200
            bg-white/95 px-2.5 py-1.5
            text-[12px] leading-snug text-slate-700
            shadow-[0_12px_32px_rgba(15,23,42,0.10)]
            backdrop-blur
            whitespace-pre-wrap
          "
        >
          {answer}
        </span>
      )}
    </span>
  );
}
