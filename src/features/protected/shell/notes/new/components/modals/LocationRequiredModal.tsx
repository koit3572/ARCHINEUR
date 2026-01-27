// src/features/protected/shell/notes/new/components/modals/LocationRequiredModal.tsx
"use client";

import ConfirmModal from "@/components/modal/ConfirmModal";

export default function LocationRequiredModal({
  open,
  onPickNow,
  onClose,
}: {
  open: boolean;
  onPickNow: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmModal
      open={open}
      title="저장 위치를 선택해야 저장할 수 있어요"
      description={
        "저장하려면 먼저 저장 위치(루트/폴더)를 선택해야 합니다."
      }
      confirmText="폴더 선택하기"
      cancelText="닫기"
      tone="default"
      onConfirm={onPickNow}
      onCancel={onClose}
      onClose={onClose}
    />
  );
}
