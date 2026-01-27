// src/features/protected/shell/notes/new/components/panels/FolderPickerView.tsx
"use client";

import FolderPickerPanel from "../FolderPickerPanel";

type RootLike = { id: string; title?: string; name?: string };
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

export default function FolderPickerView({
  roots,
  folders,
  selectedRootId,
  selectedFolderId,
  onPick,
  onClose,
}: {
  roots: RootLike[];
  folders: FolderLike[];
  selectedRootId: string | null;
  selectedFolderId: string | null;
  onPick: (v: { rootId: string | null; folderId: string | null }) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <FolderPickerPanel
        mode="create"
        roots={roots}
        folders={folders}
        selectedRootId={selectedRootId}
        selectedFolderId={selectedFolderId}
        onPick={onPick}
        onClose={onClose}
      />
    </div>
  );
}
