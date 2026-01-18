"use client";

import type { Components } from "react-markdown";

export const MarkdownComponentMap: Components = {
  /* 제목 */
  h1: ({ children }) => (
    <h3 className="mt-2 mb-4 text-[18px] font-semibold tracking-[-0.01em] text-slate-900">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h4 className="mt-6 mb-3 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="mt-5 mb-2 text-[14px] font-medium text-slate-900">
      {children}
    </h5>
  ),

  /* 문단 */
  p: ({ children }) => (
    <p className="text-[14px] leading-relaxed text-slate-800">{children}</p>
  ),

  /* 리스트 */
  ul: ({ children }) => <ul className="my-3 space-y-2">{children}</ul>,
  li: ({ children }) => (
    <li className="ml-5 list-disc text-[14px] leading-relaxed text-slate-800">
      {children}
    </li>
  ),

  /* 강조 */
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),

  /* 링크 */
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900 transition"
    >
      {children}
    </a>
  ),

  /* 이미지 */
  img: ({ src, alt }) => (
    <figure className="my-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src ?? ""}
        alt={alt ?? ""}
        className="mx-auto max-h-[460px] rounded-2xl border border-slate-200"
      />
      {alt && (
        <figcaption className="mt-2 text-center text-xs text-slate-400">
          {alt}
        </figcaption>
      )}
    </figure>
  ),

  /* 인라인 코드 */
  code: ({ children }) => (
    <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[12px] font-medium text-slate-900">
      {children}
    </code>
  ),

  /* 블록 코드 */
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-xs text-slate-100">
      {children}
    </pre>
  ),

  /* 표 */
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-900">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-200 px-3 py-2 text-slate-800">
      {children}
    </td>
  ),

  /* 인용 / 구분선 */
  blockquote: ({ children }) => (
    <blockquote className="my-5 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[13px] text-slate-700">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-t border-slate-200" />,
};
