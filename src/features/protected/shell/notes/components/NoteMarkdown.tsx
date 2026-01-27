// src/features/protected/shell/notes/components/NoteMarkdown.tsx
"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  toPlainText,
  cleanHeadingText,
  makeSlugger,
} from "../detail/lib/markdown";

type Props = {
  markdown: string;

  /** ✅ 노트 페이지처럼 heading에 id 부여(목차/앵커용) */
  withHeadingIds?: boolean;

  /** (선택) 외부에서 컴포넌트 덮어쓰기 */
  componentsOverride?: Partial<Components>;
};

/** ✅ (내용)[url] → 표준 [내용](url) 로 변환해서 표시 */
function normalizeCustomLinkSyntax(md: string) {
  return md.replace(/\(([^)\n]+)\)\[([^\]\n]+)\]/g, "[$1]($2)");
}

/** ✅ 리터럴 []: [[ ]] → [] 로 표시 */
function normalizeLiteralBrackets(md: string) {
  return md.replace(/\[\[\s*\]\]/g, "[]");
}

export default function NoteMarkdown({
  markdown,
  withHeadingIds = true,
  componentsOverride,
}: Props) {
  const normalized = useMemo(() => {
    const a = normalizeLiteralBrackets(markdown ?? "");
    const b = normalizeCustomLinkSyntax(a);
    return b;
  }, [markdown]);

  const mdComponents: Components = useMemo(() => {
    const { slugify } = makeSlugger();

    const H1 = ({ children }: { children: React.ReactNode }) => {
      if (!withHeadingIds) {
        return (
          <h2 className="scroll-mt-24 mb-4 mt-10 text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
            {children}
          </h2>
        );
      }
      const text = cleanHeadingText(toPlainText(children));
      const id = slugify(text);
      return (
        <h2
          id={id}
          className="scroll-mt-24 mb-4 mt-10 text-lg sm:text-xl font-semibold tracking-tight text-slate-900"
        >
          {children}
        </h2>
      );
    };

    const H2 = ({ children }: { children: React.ReactNode }) => {
      if (!withHeadingIds) {
        return (
          <h3 className="scroll-mt-24 mb-3 mt-9 text-base font-semibold tracking-tight text-slate-900">
            {children}
          </h3>
        );
      }
      const text = cleanHeadingText(toPlainText(children));
      const id = slugify(text);
      return (
        <h3
          id={id}
          className="scroll-mt-24 mb-3 mt-9 text-base font-semibold tracking-tight text-slate-900"
        >
          {children}
        </h3>
      );
    };

    const H3 = ({ children }: { children: React.ReactNode }) => {
      if (!withHeadingIds) {
        return (
          <h4 className="scroll-mt-24 mb-2 mt-7 text-sm font-semibold text-slate-900">
            {children}
          </h4>
        );
      }
      const text = cleanHeadingText(toPlainText(children));
      const id = slugify(text);
      return (
        <h4
          id={id}
          className="scroll-mt-24 mb-2 mt-7 text-sm font-semibold text-slate-900"
        >
          {children}
        </h4>
      );
    };

    const Code = ({
      inline,
      children,
    }: {
      inline?: boolean;
      children?: React.ReactNode;
    }) => {
      if (inline) {
        return (
          <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-800">
            {children}
          </code>
        );
      }
      return (
        <pre className="my-6 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800">
          <code>{children}</code>
        </pre>
      );
    };

    const base: Components = {
      h1: H1,
      h2: H2,
      h3: H3,

      p: ({ children }) => (
        <p className="my-2 text-sm leading-7 text-slate-800">{children}</p>
      ),

      ul: ({ children }) => <ul className="my-3 space-y-1.5">{children}</ul>,
      ol: ({ children }) => (
        <ol className="my-3 ml-5 list-decimal space-y-1.5">{children}</ol>
      ),
      li: ({ children }) => (
        <li className="ml-5 list-disc text-sm leading-7 text-slate-800">
          {children}
        </li>
      ),

      hr: () => (
        <div className="my-10">
          <div className="h-px w-full bg-slate-200/80" />
        </div>
      ),

      blockquote: ({ children }) => (
        <blockquote className="my-7 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
          {children}
        </blockquote>
      ),

      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-600"
        >
          {children}
        </a>
      ),

      code: Code as any,

      strong: ({ children }) => (
        <strong className="font-semibold text-slate-900">{children}</strong>
      ),
    };

    return { ...base, ...(componentsOverride ?? {}) };
  }, [withHeadingIds, componentsOverride]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {normalized}
    </ReactMarkdown>
  );
}
