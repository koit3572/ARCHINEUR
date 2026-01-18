"use client";

import type { JSX } from "react";
import { useId, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { Element } from "hast";

import { MarkdownComponentMap } from "./MarkdownComponentMap";
import remarkConditionToken from "@/lib/markdown/remark-condition-token";
import ConditionToken from "./ConditionToken";

import {
  hashToUnit,
  useMarkdownTokenSettings,
} from "@/features/protected/shell/workbench/stream/lib/MarkdownTokenSettings";


type Props = {
  markdown: string;
  tokenMode: "text" | "input";
  seed?: string;
};

type ConditionTokenProps = {
  node: Element;
};

function resolveAnswerFromHastElement(node: Element): string {
  const propsUnknown: unknown = node.properties;

  if (!propsUnknown || typeof propsUnknown !== "object") return "";

  const props = propsUnknown as Record<string, unknown>;
  const answer = props["answer"];

  return typeof answer === "string" ? answer : "";
}

/** position 타입(필요한 값만) */
type UnistPoint = { offset?: number; line?: number; column?: number };
type UnistPosition = { start?: UnistPoint };

/** node에서 position 안전 추출 (any 금지) */
function resolvePosition(node: Element): UnistPosition | null {
  const unknownNode: unknown = node;
  if (!unknownNode || typeof unknownNode !== "object") return null;

  const record = unknownNode as Record<string, unknown>;
  const posUnknown = record["position"];
  if (!posUnknown || typeof posUnknown !== "object") return null;

  const pos = posUnknown as Record<string, unknown>;
  const startUnknown = pos["start"];
  if (!startUnknown || typeof startUnknown !== "object") return null;

  const start = startUnknown as Record<string, unknown>;
  const offset =
    typeof start["offset"] === "number" ? start["offset"] : undefined;
  const line = typeof start["line"] === "number" ? start["line"] : undefined;
  const column =
    typeof start["column"] === "number" ? start["column"] : undefined;

  return { start: { offset, line, column } };
}

function resolveOffset(node: Element): number {
  const pos = resolvePosition(node);
  const off = pos?.start?.offset;
  if (typeof off === "number") return off;

  const line = pos?.start?.line;
  const col = pos?.start?.column;
  if (typeof line === "number" && typeof col === "number") {
    return line * 10000 + col;
  }

  return 0;
}

export default function MarkdownRenderer({ markdown, tokenMode, seed }: Props) {
  const { effectiveHiddenPercent, seed: settingsSeed } =
    useMarkdownTokenSettings();

  // ✅ seed가 안 넘어오면(또는 동일하면) 카드마다 패턴이 똑같아지는 문제 발생
  // ✅ 따라서 카드 컴포넌트 인스턴스별로 고유한 useId()를 fallback seed로 사용
  const localId = useId();
  const cardSeed = useMemo(() => seed ?? localId, [seed, localId]);

  const components: Components & {
    conditionToken?: (props: ConditionTokenProps) => JSX.Element;
  } = {
    ...MarkdownComponentMap,

    conditionToken: ({ node }) => {
      const answer = resolveAnswerFromHastElement(node);
      const offset = resolveOffset(node);

      // ✅ 토큰별 숨김 여부 결정(안정적 + 카드마다 다르게)
      const key = `${settingsSeed}:${cardSeed}:${offset}:${answer}`;
      const u = hashToUnit(key);
      const hidden = u < effectiveHiddenPercent / 100;

      // tokenMode="text"면 강제 공개(전부 텍스트)
      const modeForThisToken: "text" | "input" =
        tokenMode === "text" ? "text" : hidden ? "input" : "text";

      return (
        <ConditionToken
          answer={answer}
          mode={modeForThisToken}
          seed={cardSeed}
        />
      );
    },
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkConditionToken]}
      components={components}
    >
      {markdown}
    </ReactMarkdown>
  );
}
