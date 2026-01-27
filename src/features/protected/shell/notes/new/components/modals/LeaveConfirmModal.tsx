// src/features/protected/shell/notes/new/components/modals/LeaveConfirmModal.tsx
"use client";

import ConfirmModal from "@/components/modal/ConfirmModal";

export default function LeaveConfirmModal({
  open,
  onConfirmSaveAndLeave,
  onCancelLeave,
  onClose,
}: {
  open: boolean;
  onConfirmSaveAndLeave: () => void | Promise<void>;
  onCancelLeave: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmModal
      open={open}
      title="저장되지 않은 변경사항이 있습니다"
      description={
        "마지막 임시저장 이후 변경된 내용이 있습니다.\n\n" +
        "이 페이지를 벗어나면 해당 변경사항은 저장되지 않으며 복구할 수 없습니다.\n" +
        "임시저장 후 이동하시겠습니까?"
      }
      confirmText="임시저장 후 이동"
      cancelText="저장하지 않고 이동"
      tone="warning"
      onConfirm={onConfirmSaveAndLeave}
      onCancel={onCancelLeave}
      onClose={onClose}
    />
  );
}
