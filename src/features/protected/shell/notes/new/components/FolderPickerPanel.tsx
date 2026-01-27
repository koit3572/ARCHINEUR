// src/features/protected/shell/notes/new/components/FolderPickerPanel.tsx
"use client";

import FolderTreePanel from "@/features/protected/shell/notes/components/FolderTreePanel";

type RootLike = {
  id: string;
  title?: string;
  name?: string;
};

type FolderLike = {
  id: string;
  title?: string;
  name?: string;

  rootId?: string;
  root_id?: string;

  parentId?: string | null;
  parent_id?: string | null;

  order?: number | null;
};

export default function FolderPickerPanel({
  mode = "create",
  roots,
  folders,
  selectedRootId,
  selectedFolderId,
  onPick,
  onClose,
}: {
  mode?: "create" | "list";
  roots: RootLike[];
  folders: FolderLike[];
  selectedRootId: string | null;
  selectedFolderId: string | null;
  onPick: (v: { rootId: string | null; folderId: string | null }) => void;
  onClose: () => void;
}) {
  const confirmLabel = !selectedRootId
    ? "미선택"
    : selectedFolderId
      ? "폴더 선택됨"
      : "루트 선택됨";

  const subtitle =
    mode === "list" ? "열 노트를 선택하세요." : "저장할 위치를 선택하세요.";

  return (
    <FolderTreePanel
      mode={mode}
      roots={roots}
      folders={folders}
      selectedRootId={selectedRootId}
      selectedFolderId={selectedFolderId}
      onPick={onPick}
      showClose
      onClose={onClose}
      showFooter
      headerSubtitle={subtitle} // ✅ 여기만 추가
      confirmText={confirmLabel}
      onConfirm={() => {
        onClose();
      }}
      sectionClassName={
        mode === "create"
          ? "min-h-[calc(100dvh-var(--note-new-dock-h)-275px)]"
          : undefined
      }
    />
  );

}
