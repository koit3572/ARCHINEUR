// src/features/protected/shell/notes/new/components/panels/WriteEditorPanel.tsx
"use client";

import { EditorContent, type Editor } from "@tiptap/react";

export default function WriteEditorPanel({
  editor,
}: {
  editor: Editor | null;
}) {
  return (
    <div className="tiptap-editor flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0">
        {editor ? <EditorContent editor={editor} /> : null}
      </div>
    </div>
  );
}
