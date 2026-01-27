"use client";

import { FiPlus, FiAlertTriangle } from "react-icons/fi";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/** ✅ 여기서 절대 preventDefault 하지 말 것 */
function stopBubble(e: any) {
  e.stopPropagation?.();
}

/* =========================
   ✅ 생성 Row (프리미엄 톤)
   - 로직/키다운/props 100% 유지
   - "배경 카드" 제거 → 라인/여백/타이포만
   - 버튼도 과장 없이 낮은 톤으로
========================= */
export default function CreateRow({
  active,
  depth,
  newName,
  setNewName,
  onCreate,
  onCancel,
  errorText,
  placeholder = "새 폴더 이름",
  createLabel = "생성",
}: {
  active: boolean;
  depth: number;
  newName: string;
  setNewName: (v: string) => void;
  onCreate: () => Promise<void> | void;
  onCancel: () => void;
  errorText?: string;
  placeholder?: string;
  createLabel?: string;
}) {
  if (!active) return null;

  return (
    <div
      className="px-3 pb-3"
      onPointerDown={stopBubble}
      onMouseDown={stopBubble}
      onClick={stopBubble}
    >
      <div
        className={cx(
          "rounded-lg border border-slate-200 bg-white",
          "px-3 py-2",
        )}
      >
        <div className="flex items-center gap-2">
          <div style={{ width: 10 + Math.min(depth, 10) * 16 }} />

          {/* ✅ 아이콘은 ‘박스’ 없이 작게만 */}
          <FiPlus className="h-4 w-4 text-slate-400" />

          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={placeholder}
            className={cx(
              "h-9 w-full rounded-md bg-transparent px-2 text-xs font-semibold text-slate-900 outline-none",
              "placeholder:text-slate-400",
              "ring-0 focus:ring-0",
            )}
            onPointerDown={stopBubble}
            onMouseDown={stopBubble}
            onClick={stopBubble}
            onKeyDown={async (e) => {
              if ((e as any).isComposing) return;

              if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                await onCreate();
              }
            }}
          />

          {/* ✅ Primary: 과장 없이 얇게 */}
          <button
            type="button"
            className={cx(
              "inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-semibold whitespace-nowrap transition",
              "bg-slate-900 text-white hover:bg-slate-800",
              "min-w-[76px]",
            )}
            onPointerDown={stopBubble}
            onMouseDown={stopBubble}
            onClick={async (e) => {
              e.stopPropagation();
              await onCreate();
            }}
          >
            {createLabel}
          </button>

          {/* ✅ Secondary: 진짜 ‘취소’ 톤 */}
          <button
            type="button"
            className={cx(
              "inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-semibold whitespace-nowrap transition",
              "bg-white text-slate-700 hover:bg-slate-50",
              "border border-slate-200",
              "min-w-[64px]",
            )}
            onPointerDown={stopBubble}
            onMouseDown={stopBubble}
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            취소
          </button>
        </div>

        {errorText ? (
          <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-rose-600">
            <FiAlertTriangle className="h-4 w-4" />
            {errorText}
          </div>
        ) : null}
      </div>
    </div>
  );
}
