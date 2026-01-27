// src/features/protected/shell/notes/new/lib/tiptap.ts
import Link from "@tiptap/extension-link";
import { InputRule } from "@tiptap/core";
import { normalizeHref } from "./href";

/* ✅ (라벨)[URL] / [라벨](URL) 입력 시: 라벨만 남기고 link mark 적용 */
export const LinkAutoFormat = Link.extend({
  addInputRules() {
    const rules: InputRule[] = [];

    // (네이버)[https://...]
    rules.push(
      new InputRule({
        find: /\(([^)\n]+)\)\[(https?:\/\/[^\]\s]+)\]$/,
        handler: ({ state, range, match }) => {
          const label = String(match[1] ?? "").trim();
          const href = normalizeHref(String(match[2] ?? "").trim());
          if (!label || !href) return null;

          const linkMark = state.schema.marks.link;
          if (!linkMark) return null;

          const tr = state.tr;
          tr.insertText(label, range.from, range.to);
          tr.addMark(
            range.from,
            range.from + label.length,
            linkMark.create({ href }),
          );
          return tr;
        },
      }),
    );

    // [네이버](https://...)
    rules.push(
      new InputRule({
        find: /\[([^\]\n]+)\]\((https?:\/\/[^\)\s]+)\)$/,
        handler: ({ state, range, match }) => {
          const label = String(match[1] ?? "").trim();
          const href = normalizeHref(String(match[2] ?? "").trim());
          if (!label || !href) return null;

          const linkMark = state.schema.marks.link;
          if (!linkMark) return null;

          const tr = state.tr;
          tr.insertText(label, range.from, range.to);
          tr.addMark(
            range.from,
            range.from + label.length,
            linkMark.create({ href }),
          );
          return tr;
        },
      }),
    );

    return rules;
  },
});
