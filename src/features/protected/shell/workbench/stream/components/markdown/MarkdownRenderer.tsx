// src/features/protected/shell/workbench/stream/components/markdown/MarkdownRenderer.tsx
//
// ✅ 링크의 []가 빈칸 토큰으로 오인되는 문제 해결:
//    - 빈칸 파싱 전에 링크 구문 (라벨)[url], [라벨](url) 을 "보호"했다가 파싱 후 복원
// ✅ [[텍스트]] 는 빈칸 파싱에서 보호 → 최종에 [텍스트] 로 복원 (반쪽 괄호 먹는 버그 방지)
//    - applyBlankTokens 내부에서도 2중 방어 (안전)
// ✅ 링크 클릭 시 /notes/new/https://... 같은 내부 이동 방지:
//    - 외부 링크면 window.open으로 강제
// ✅ 빈칸 토큰: 양옆 [ ] 표시 제거 (요청사항)
// ✅ 빈칸이 아닌 [정답]은 일반 텍스트로 (제목이면 제목 스타일 그대로)
//
// ⚠️ rehype-raw 필요: npm i rehype-raw

"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

// ✅ 너가 만든 컴포넌트 경로로 맞춰서 사용
import ConditionToken from "./ConditionToken";

type TokenMode = "input" | "read";

export default function MarkdownRenderer({
  markdown,
  tokenMode = "read",
  hiddenPercentOverride,
  className,
}: {
  markdown: string;
  tokenMode?: TokenMode;
  hiddenPercentOverride?: number;
  className?: string;
}) {
  const processed = useMemo(() => {
    const raw = String(markdown ?? "");

    // 1) 코드블록/인라인코드 보호 (토큰/링크 파싱에서 제외)
    const codeProtected = protectCode(raw);

    // 2) 링크 보호 (빈칸 파싱이 []를 건드리지 않게)
    const linkProtected = protectLinksForBlankParsing(
      codeProtected.protectedText,
    );

    // 2.5) [[텍스트]] 보호 (빈칸 파싱이 반쪽만 먹지 않게)
    const dblProtected = protectDoubleBrackets(linkProtected.protectedText);

    // 3) 토큰 처리 (빈칸/정답)
    const hiddenPercent =
      typeof hiddenPercentOverride === "number"
        ? clamp(hiddenPercentOverride, 0, 100)
        : 0;

    const tokenized = applyBlankTokens(dblProtected.protectedText, {
      tokenMode,
      hiddenPercent,
    });

    // 4) [[텍스트]] 복원 → 링크 복원 → 코드 복원
    const dblRestored = dblProtected.restore(tokenized);
    const linksRestored = linkProtected.restore(dblRestored);
    const codeRestored = codeProtected.restore(linksRestored);

    return codeRestored;
  }, [markdown, tokenMode, hiddenPercentOverride]);

  const components = useMemo<Components>(() => {
    const C: Components = {
      a: ({ children, href }) => {
        const raw = String(href ?? "").trim();
        const normalized = normalizeHref(raw);

        const externalHttp = /^https?:\/\//i.test(normalized);
        const externalOther = /^(mailto:|tel:)/i.test(normalized);
        const external = externalHttp || externalOther;

        return (
          <a
            href={normalized || "#"}
            className={cx(
              "font-semibold underline decoration-slate-400 underline-offset-4 text-slate-900",
              "hover:decoration-slate-600 hover:bg-slate-50 hover:rounded-md hover:px-0.5",
            )}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer noopener" : undefined}
            onClick={(e) => {
              if (!normalized) return;

              // ✅ 외부 링크는 항상 새 탭(내부 라우팅/상대경로 해석 방지)
              if (external) {
                e.preventDefault();
                if (typeof window !== "undefined") {
                  window.open(normalized, "_blank", "noopener,noreferrer");
                }
              }
            }}
          >
            {children}
          </a>
        );
      },

      h1: ({ children }) => (
        <h3 className="mb-4 mt-8 text-lg font-semibold text-slate-900">
          {children}
        </h3>
      ),
      h2: ({ children }) => (
        <h4 className="mb-3 mt-7 text-base font-semibold text-slate-900">
          {children}
        </h4>
      ),
      h3: ({ children }) => (
        <h5 className="mb-2 mt-6 text-sm font-medium text-slate-900">
          {children}
        </h5>
      ),

      p: ({ children }) => (
        <p className="my-2.5 text-sm leading-7 text-slate-800">{children}</p>
      ),

      ul: ({ children }) => (
        <ul className="my-3 list-disc space-y-1.5 pl-6 text-sm leading-7 text-slate-800">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="my-3 list-decimal space-y-1.5 pl-6 text-sm leading-7 text-slate-800">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="marker:text-slate-400">{children}</li>
      ),

      hr: () => <hr className="my-10 border-slate-200" />,

      // ✅ 우리가 삽입한 토큰 span 렌더
      span: ({ children, ...props }) => {
        const p: any = props;
        const kind = p["data-ct-kind"] as string | undefined;

        // literal: [[ ]] → "[]" 텍스트로 보여주되 빈칸 토큰 처리 X
        if (kind === "literal") {
          return (
            <span className="rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-600">
              []
            </span>
          );
        }

        // ✅ blank: [] 또는 [정답]가 숨김 처리된 경우
        // ❗요청사항: 양옆 [ ] 표시 제거
        if (kind === "blank") {
          const answer = String(p["data-ct-answer"] ?? "");
          const id = String(p["data-ct-id"] ?? "");

          if (tokenMode === "input") {
            return <ConditionToken answer={answer} mode="input" seed={id} />;
          }

          // read 모드: 밑줄만(정답 노출 X)
          return (
            <span className="inline-block h-[0.9em] w-[8.75rem] translate-y-[0.05em] align-baseline border-b-2 border-slate-300" />
          );
        }

        // ✅ 보이는 정답: 그냥 텍스트 (제목이면 제목 스타일 그대로)
        if (kind === "answer") {
          return <>{children}</>;
        }

        // 일반 span
        return <span {...props}>{children}</span>;
      },
    };

    return C;
  }, [tokenMode]);

  return (
    <div className={cx("markdown-renderer w-full", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

/* =========================
   Helpers
========================= */

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function normalizeHref(href: string) {
  const h = (href ?? "").trim();
  if (!h) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return h;
  if (/^(\/|#)/.test(h)) return h;
  return `https://${h.replace(/^\/+/, "")}`;
}

function escapeHtmlText(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(s: string) {
  return escapeHtmlText(s).replaceAll('"', "&quot;");
}

/**
 * ✅ 코드 보호
 * - ``` ... ``` , `...` 내부는 링크/토큰 파싱에서 제외
 */
function protectCode(input: string) {
  const bag: string[] = [];
  const keyOf = (i: number) => `@@__CODE_${i}__@@`;

  let out = input.replace(/```[\s\S]*?```/g, (m) => {
    const i = bag.length;
    bag.push(m);
    return keyOf(i);
  });

  out = out.replace(/`[^`\n]+`/g, (m) => {
    const i = bag.length;
    bag.push(m);
    return keyOf(i);
  });

  const restore = (s: string) =>
    s.replace(/@@__CODE_(\d+)__@@/g, (_m, n) => bag[Number(n)] ?? _m);

  return { protectedText: out, restore };
}

/**
 * ✅ [[텍스트]] 보호/복원
 * - applyBlankTokens의 /\[(.*?)\]/ 가 [[...]] 를 반쪽만 먹는 문제 방지
 * - 최종에는 [텍스트] 로 보이게 복원
 * - 단, [[ ]] (리터럴 빈칸) 은 그대로 둠
 */
function protectDoubleBrackets(input: string) {
  const bag: string[] = [];
  const keyOf = (i: number) => `@@__DBR_${i}__@@`;

  const out = input.replace(/\[\[([^\]\n]*?)\]\]/g, (m, inner) => {
    const content = String(inner ?? "");
    if (content.trim() === "") return m; // [[ ]] 는 그대로
    const i = bag.length;
    bag.push(`[${content}]`); // 최종 표시는 [텍스트]
    return keyOf(i);
  });

  const restore = (s: string) =>
    s.replace(/@@__DBR_(\d+)__@@/g, (_m, n) => bag[Number(n)] ?? _m);

  return { protectedText: out, restore };
}

/**
 * ✅ 링크 보호/복원
 * - (라벨)[url]  → 보호 후 표준 [라벨](url)로 복원
 * - [라벨](url)  → 보호 후 그대로 복원
 */
function protectLinksForBlankParsing(input: string) {
  const bag: string[] = [];
  const keyOf = (i: number) => `@@__LINK_${i}__@@`;

  let out = input.replace(
    /\(([^)\n]+)\)\[(https?:\/\/[^\]\s]+)\]/g,
    (_m, label, url) => {
      const i = bag.length;
      bag.push(
        `[${String(label).trim()}](${normalizeHref(String(url).trim())})`,
      );
      return keyOf(i);
    },
  );

  out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m) => {
    const i = bag.length;
    const mm = /\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(m);
    if (mm) {
      const label = String(mm[1]).trim();
      const url = normalizeHref(String(mm[2]).trim());
      bag.push(`[${label}](${url})`);
    } else {
      bag.push(m);
    }
    return keyOf(i);
  });

  const restore = (s: string) =>
    s.replace(/@@__LINK_(\d+)__@@/g, (_m, n) => bag[Number(n)] ?? _m);

  return { protectedText: out, restore };
}

function applyBlankTokens(
  input: string,
  opts: { tokenMode: "input" | "read"; hiddenPercent: number },
) {
  // ✅ 2중 방어: [[...]] 를 먼저 전부 보호해둔다 (반쪽 괄호 버그 근본 차단)
  const DBAG: string[] = [];
  const dKey = (i: number) => `@@__DBL_${i}__@@`;

  let out = input.replace(/\[\[([^\]\n]*?)\]\]/g, (m, inner) => {
    const content = String(inner ?? "");
    const i = DBAG.length;
    if (content.trim() === "") {
      DBAG.push(`@@__LITERAL_EMPTY__@@`); // [[ ]] 는 literal 빈칸
    } else {
      DBAG.push(`[${content}]`); // [[텍스트]] 는 최종에 [텍스트]
    }
    return dKey(i);
  });

  const LIT = "@@__LITERAL_EMPTY__@@";
  out = out.replaceAll(LIT, `<span data-ct-kind="literal"></span>`);

  let idx = 0;

  out = out.replace(/\[(.*?)\]/g, (_m, inner) => {
    const rawInner = String(inner ?? "");

    // [] 인 경우
    if (rawInner === "") {
      const id = `b${idx++}`;
      return `<span data-ct-kind="blank" data-ct-id="${id}" data-ct-answer=""></span>`;
    }

    const answer = rawInner.trim();

    // 안전장치: URL 같은 건 토큰으로 취급 안 함
    if (/^https?:\/\//i.test(answer)) return `[${rawInner}]`;

    const id = `t${idx++}`;
    const hide = rollHide(answer, idx, opts.hiddenPercent);

    if (hide) {
      return `<span data-ct-kind="blank" data-ct-id="${id}" data-ct-answer="${escapeAttr(
        answer,
      )}"></span>`;
    }

    // 보이는 정답: "그냥 텍스트"로 (제목 스타일 따라감)
    return `<span data-ct-kind="answer">${escapeHtmlText(answer)}</span>`;
  });

  // ✅ 더블 브라켓 복원
  out = out.replace(/@@__DBL_(\d+)__@@/g, (_m, n) => DBAG[Number(n)] ?? _m);

  return out;
}

function rollHide(answer: string, idx: number, hiddenPercent: number) {
  if (hiddenPercent <= 0) return false;
  if (hiddenPercent >= 100) return true;

  let h = 0;
  const s = `${answer}::${idx}`;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  const r = h % 100;
  return r < hiddenPercent;
}
