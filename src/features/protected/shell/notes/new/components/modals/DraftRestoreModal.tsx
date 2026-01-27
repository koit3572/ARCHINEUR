// src/features/protected/shell/notes/new/components/modals/DraftRestoreModal.tsx
"use client";

import ConfirmModal from "@/components/modal/ConfirmModal";

export default function DraftRestoreModal({
  open,
  onConfirm,
  onCancel,
  onClose,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmModal
      open={open}
      title="임시저장된 노트가 있습니다"
      description={
        "이전에 작성 중이던 임시저장본이 발견되었습니다.\n\n" +
        "복원하면 해당 내용을 이어서 작성할 수 있습니다.\n" +
        "삭제를 선택하면 임시저장된 내용은 영구적으로 제거됩니다."
      }
      confirmText="임시저장본 복원"
      cancelText="임시저장본 삭제"
      tone="default"
      onConfirm={onConfirm}
      onCancel={onCancel}
      onClose={onClose}
    />
  );
}
