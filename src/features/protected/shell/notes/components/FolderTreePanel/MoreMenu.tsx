"use client";

import { FiMoreVertical, FiPlus, FiTrash2 } from "react-icons/fi";
import IconBtn from "./IconBtn";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/** ✅ 여기서 절대 preventDefault 하지 말 것 */
function stopBubble(e: any) {
  e.stopPropagation?.();
}

/* =========================
   ✅ 메뉴 (…)
========================= */
export default function MoreMenu({
  open,
  active,
  onToggle,
  onCreate,
  createLabel,
  onDelete,
  deleteLabel,
  allowCreate = false,
  allowDelete = false,
}: {
  open: boolean;
  active: boolean;
  onToggle: () => void;

  allowCreate?: boolean;
  onCreate?: () => void;
  createLabel?: string;

  allowDelete?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  return (
    <div className="relative">
      <IconBtn title="편집" onClick={onToggle} active={active}>
        <FiMoreVertical
          className={cx("h-4 w-4", active ? "text-white/80" : "text-slate-500")}
        />
      </IconBtn>

      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {allowCreate ? (
            <button
              type="button"
              onPointerDown={stopBubble}
              onMouseDown={stopBubble}
              onClick={(e) => {
                e.stopPropagation();
                onCreate?.();
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-800 hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-2">
                <FiPlus className="h-3.5 w-3.5 text-slate-500" />
                {createLabel ?? "폴더 생성"}
              </span>
              <span className="text-[10px] text-slate-400">NEW</span>
            </button>
          ) : null}

          {allowDelete ? (
            <button
              type="button"
              onPointerDown={stopBubble}
              onMouseDown={stopBubble}
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
            >
              <span className="inline-flex items-center gap-2">
                <FiTrash2 className="h-3.5 w-3.5" />
                {deleteLabel ?? "삭제"}
              </span>
              <span className="text-[10px] text-rose-400">DEL</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
