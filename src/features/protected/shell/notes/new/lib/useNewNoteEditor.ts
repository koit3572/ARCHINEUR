// src/features/protected/shell/notes/new/lib/useNewNoteEditor.ts
"use client";

import type { MutableRefObject } from "react";
import Heading from "@tiptap/extension-heading";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { useEditor } from "@tiptap/react";

import { cx } from "../lib/cx";
import { LinkAutoFormat } from "../lib/tiptap";
import {
  looksLikeMarkdown,
  markdownToHtmlForEditor,
  normalizePastedMarkdown,
} from "../lib/paste";

export type ViewMode = "write" | "note" | "problem" | "folder";

/* ✅ heading에서 Enter 눌러도 같은 heading 유지(한글 느낌) */
const HeadingKeep = Heading.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (this.editor.isActive("heading")) {
          return this.editor.commands.splitBlock();
        }
        return false;
      },
    };
  },
});

export function useNewNoteEditor({
  view,
  setView,
  dockOpen,
  setDockOpen,
  linkPanelOpen,
  closeLinkPanel,
  openLinkPanel,
  blankOnRef,
  setBlankOn,
  onCharCount,
  onUiTick,
  surfaceClassName,
}: {
  view: ViewMode;
  setView: (v: ViewMode) => void;

  dockOpen: boolean;
  setDockOpen: (v: boolean) => void;

  linkPanelOpen: boolean;
  closeLinkPanel: (refocusEditor: boolean) => void;
  openLinkPanel: () => void;

  blankOnRef: MutableRefObject<boolean>;
  setBlankOn: (v: boolean) => void;

  onCharCount: (n: number) => void;
  onUiTick: () => void;

  surfaceClassName: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit.configure({
        heading: false,
        italic: false,
        code: false,
        codeBlock: false,
        blockquote: false,

        // ✅ 핵심: LinkAutoFormat이 link 확장을 제공하므로
        // StarterKit의 link를 꺼서 중복 등록을 막는다.
        link: false,
      }),

      HeadingKeep.configure({ levels: [1, 2, 3] }),

      LinkAutoFormat.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
      }),

      Placeholder.configure({
        placeholder:
          "여기에 내용을 작성하세요.\n\n- 리스트로 정리해도 좋고\n--- 로 단원을 나눠서 문제로 만들 수도 있어요.\n\n빈칸: Blank 버튼(첫 클릭 '[' / 다시 클릭 ']')\n링크: Link 버튼(라벨/URL 입력) 또는 (라벨)[https://...] / [라벨](https://...)\n\n✅ 마크다운 통복사-붙여넣기 해도 헤딩/리스트/볼드/링크/--- 바로 적용돼요.",
      }),
    ],

    editorProps: {
      attributes: {
        class: cx(surfaceClassName),
      },

      handleKeyDown: (_view, event) => {
        if (event.key === "Escape") {
          if (view === "folder") {
            event.preventDefault();
            setView("write");
            return true;
          }

          if (linkPanelOpen) {
            event.preventDefault();
            closeLinkPanel(true);
            return true;
          }

          if (blankOnRef.current) {
            event.preventDefault();
            blankOnRef.current = false;
            setBlankOn(false);
            editor?.chain().focus().insertContent("]").run();
            return true;
          }

          return false;
        }

        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "b"
        ) {
          event.preventDefault();
          editor?.chain().focus().toggleBold().run();
          return true;
        }

        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "k"
        ) {
          event.preventDefault();
          openLinkPanel();
          return true;
        }

        return false;
      },

      handlePaste: (_view, event: any) => {
        const text = String(event?.clipboardData?.getData("text/plain") ?? "");
        const html = String(event?.clipboardData?.getData("text/html") ?? "");

        if (!text.trim()) return false;
        if (html.trim() && !looksLikeMarkdown(text)) return false;
        if (!looksLikeMarkdown(text)) return false;

        event.preventDefault();

        const normalized = normalizePastedMarkdown(text);
        const outHtml = markdownToHtmlForEditor(normalized);

        editor?.chain().focus().insertContent(outHtml).run();
        return true;
      },
    },

    onUpdate: ({ editor }) => {
      onCharCount(editor.getText().length);
      onUiTick();
    },
    onSelectionUpdate: () => {
      onUiTick();
    },
  });

  return editor;
}
