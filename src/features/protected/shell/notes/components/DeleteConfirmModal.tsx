"use client";

export default function DeleteConfirmModal({
  open,
  title,
  description,
  confirmText = "삭제",
  cancelText = "취소",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="px-5 py-4">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-2 text-xs leading-5 text-slate-600">
              {description}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
