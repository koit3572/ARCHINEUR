"use client";

import type { ReactNode } from "react";
import {
  FiFileText,
  FiFolder,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/** ✅ 여기서 절대 preventDefault 하지 말 것 */
function stopBubble(e: any) {
  e.stopPropagation?.();
}

/* =========================
   ✅ Row 렌더
========================= */
export default function TreeRow({
  id,
  depth,
  kind,
  name,
  subText,
  hasChildren,
  open,
  active,
  onToggleOpen,
  onClickMain,
  right,
}: {
  id: string;
  depth: number;
  kind: "root" | "folder" | "note";
  name: string;
  subText?: string;
  hasChildren?: boolean;
  open?: boolean;
  active?: boolean;
  onToggleOpen?: () => void;
  onClickMain: () => void;
  right?: ReactNode;
}) {
  const iconColor = active ? "text-white/80" : "text-slate-400";
  const chevronColor = active ? "text-white" : "text-slate-500";

  const Icon = kind === "note" ? FiFileText : FiFolder;

  return (
    <div
      data-tree-node-id={id}
      className={cx(
        "flex select-none items-center gap-2 px-3 py-2 transition",
        active ? "bg-slate-900 text-white" : "hover:bg-slate-50",
      )}
      style={{ paddingLeft: 12 + depth * 16 }}
    >
      {hasChildren ? (
        <button
          type="button"
          onPointerDown={stopBubble}
          onMouseDown={stopBubble}
          onClick={(e) => {
            e.stopPropagation();
            onToggleOpen?.();
          }}
          className={cx(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg",
            active ? "hover:bg-white/10" : "hover:bg-slate-100",
          )}
          aria-label="toggle"
        >
          {open ? (
            <FiChevronUp className={cx("h-4 w-4", chevronColor)} />
          ) : (
            <FiChevronDown className={cx("h-4 w-4", chevronColor)} />
          )}
        </button>
      ) : (
        <div className="h-8 w-8" />
      )}

      <div className="shrink-0">
        <Icon className={cx("h-4 w-4", iconColor)} />
      </div>

      <button
        type="button"
        onClick={onClickMain}
        className="min-w-0 flex-1 text-left"
      >
        <div className={cx("truncate text-xs", "font-semibold")}>{name}</div>

        {subText ? (
          <div
            className={cx(
              "mt-0.5 text-[11px]",
              active ? "text-white/70" : "text-slate-500",
            )}
          >
            {subText}
          </div>
        ) : null}
      </button>

      {right ? <div className="flex items-center gap-1">{right}</div> : null}
    </div>
  );
}
