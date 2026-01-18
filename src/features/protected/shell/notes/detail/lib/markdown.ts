// src/features/protected/shell/notes/detail/lib/markdown.ts
import type React from "react";

export function toPlainText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(toPlainText).join("");
  if (
    children &&
    typeof children === "object" &&
    "props" in (children as any)
  ) {
    return toPlainText((children as any).props?.children);
  }
  return "";
}

export function cleanHeadingText(s: string) {
  return s
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]/g, "$1")
    .trim();
}

export function makeSlugger() {
  const counts = new Map<string, number>();

  const slugify = (s: string) => {
    const base =
      s
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "") || "section";

    const cur = counts.get(base) ?? 0;
    const next = cur + 1;
    counts.set(base, next);

    return next === 1 ? base : `${base}-${next}`;
  };

  return { slugify };
}

/** post에서 문제용 [] 제거 / [[,]] → [,] 치환 (링크/레퍼런스는 최대한 보존) */
export function stripProblemBrackets(markdown: string) {
  const s0 = (markdown ?? "").replace(/\[\[/g, "[").replace(/\]\]/g, "]");

  return s0.replace(
    /\[([^\]\[]+?)\]/g,
    (m, inner: string, offset: number, str: string) => {
      const prev = offset > 0 ? str[offset - 1] : "";
      const next = str[offset + m.length] ?? "";

      if (prev === "!") return m; // ![alt](url)
      if (next === "(" || next === "[" || next === ":") return m; // [t](u) / [t][id] / [id]:
      if (inner.startsWith("^")) return m; // [^1]
      return inner; // token bracket 제거
    },
  );
}
