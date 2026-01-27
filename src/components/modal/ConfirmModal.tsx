// src/components/modal/ConfirmModal.tsx
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle, FiInfo, FiX } from "react-icons/fi";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소",
  tone = "default",
  onConfirm,
  onCancel,
  onClose,
  confirmDisabled,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel?: () => void;
  onClose: () => void;
  confirmDisabled?: boolean;
}) {
  // ESC로 닫기
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // 스크롤 잠금(모달 열릴 때만)
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;

    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const icon =
    tone === "danger" ? (
      <FiAlertTriangle className="h-5 w-5" />
    ) : (
      <FiInfo className="h-5 w-5" />
    );

  const iconWrap = cx(
    "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
    tone === "danger"
      ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
      : "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
  );

  // 버튼 스타일(기본/취소/확인)
  const btnBase =
    "inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold transition";
  const cancelBtn =
    "inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 active:bg-white";
  const confirmDefault =
    "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-900";
  const confirmDanger =
    "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-600";

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div
          className={cx(
            "w-full max-w-[820px] overflow-hidden",
            "rounded-3xl border border-slate-200",
            "bg-white shadow-[0_30px_80px_rgba(2,6,23,0.20)]",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="relative px-6 pt-6 pb-5">
            <button
              type="button"
              onClick={onClose}
              className={cx(
                "absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl",
                "border border-slate-200 bg-white text-slate-700 transition",
                "hover:bg-slate-50 active:bg-white",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15",
              )}
              aria-label="닫기"
            >
              <FiX className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className={iconWrap} aria-hidden="true">
                {icon}
              </div>

              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
                  {title}
                </div>

                {description ? (
                  <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {description}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-6 py-4">
            <button
              type="button"
              className={cancelBtn}
              onClick={() => (onCancel ? onCancel() : onClose())}
            >
              {cancelText}
            </button>

            <button
              type="button"
              className={cx(
                btnBase,
                tone === "danger" ? confirmDanger : confirmDefault,
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15",
                confirmDisabled ? "opacity-50 pointer-events-none" : "",
              )}
              onClick={onConfirm}
              disabled={!!confirmDisabled}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
