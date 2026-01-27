"use client";

import type { ReactNode } from "react";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/** ✅ 여기서 절대 preventDefault 하지 말 것 */
function stopBubble(e: any) {
  e.stopPropagation?.();
}

/* =========================
   ✅ 공용 버튼
   - ❗disabled 속성(진짜 비활성) 사용 금지
   - 대신: aria-disabled + 내부 가드
========================= */
export default function IconBtn({
  title,
  onClick,
  children,
  active,
  disabled,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-disabled={disabled ? true : undefined}
      onPointerDown={stopBubble}
      onMouseDown={stopBubble}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
      className={cx(
        "inline-flex h-8 w-6 items-center justify-center rounded-lg transition",
        disabled ? "opacity-60" : "",
        active ? "hover:bg-white/10" : "hover:bg-slate-100",
      )}
    >
      {children}
    </button>
  );
}
