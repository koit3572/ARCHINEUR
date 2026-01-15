// src/lib/markdown/remark-condition-token.ts

type UnistNode = { type: string; [key: string]: unknown };
type UnistParent = UnistNode & { children: UnistNode[] };

type TextNode = UnistNode & { type: "text"; value: string };
type DefinitionNode = UnistNode & { type: "definition"; identifier?: string };
type LinkReferenceNode = UnistNode & {
  type: "linkReference";
  identifier?: string;
  label?: string;
  referenceType?: "shortcut" | "collapsed" | "full";
};

export type ConditionTokenNode = {
  type: "conditionToken";
  value: string;
  data: {
    hName: "conditionToken";
    hProperties: {
      answer: string;
    };
  };
};

function isParent(node: UnistNode): node is UnistParent {
  return Array.isArray((node as UnistParent).children);
}

function makeToken(answer: string): ConditionTokenNode {
  const value = answer.trim();
  return {
    type: "conditionToken",
    value,
    data: {
      hName: "conditionToken",
      hProperties: { answer: value },
    },
  };
}

function collectDefinitions(node: UnistNode, set: Set<string>) {
  if (node.type === "definition") {
    const id = (node as DefinitionNode).identifier;
    if (typeof id === "string" && id.trim()) set.add(id.trim().toLowerCase());
  }
  if (isParent(node)) {
    for (const child of node.children) collectDefinitions(child, set);
  }
}

function splitTextTokens(value: string): UnistNode[] {
  const re = /\[([^\[\]\n]+)\]/g;
  const out: UnistNode[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(value))) {
    const start = match.index;
    const end = re.lastIndex;
    const before = value.slice(lastIndex, start);
    const token = (match[1] ?? "").trim();

    if (before) out.push({ type: "text", value: before } as TextNode);
    if (token) out.push(makeToken(token));

    lastIndex = end;
  }

  const tail = value.slice(lastIndex);
  if (tail) out.push({ type: "text", value: tail } as TextNode);

  return out.length ? out : [{ type: "text", value } as TextNode];
}

function transform(node: UnistNode, definedRefs: Set<string>) {
  if (!isParent(node)) return;

  const next: UnistNode[] = [];

  for (const child of node.children) {
    // [백두산] 같은 케이스가 "shortcut reference link"로 파싱되는 경우를 토큰으로 치환
    if (child.type === "linkReference") {
      const lr = child as LinkReferenceNode;

      const id = (lr.identifier ?? "").trim().toLowerCase();
      const label = (lr.label ?? lr.identifier ?? "").trim();

      const isShortcut =
        lr.referenceType === "shortcut" || lr.referenceType === "collapsed";

      // 정의(definition)가 "없는" 참조만 토큰으로 처리 (실제 reference link는 보존)
      if (isShortcut && label && !definedRefs.has(id)) {
        next.push(makeToken(label));
        continue;
      }
    }

    // text 안에 남아있는 [정답] 패턴도 커버
    if (child.type === "text") {
      const t = child as TextNode;
      next.push(...splitTextTokens(t.value));
      continue;
    }

    transform(child, definedRefs);
    next.push(child);
  }

  node.children = next;
}

export default function remarkConditionToken() {
  return (tree: UnistNode) => {
    const definedRefs = new Set<string>();
    collectDefinitions(tree, definedRefs);
    transform(tree, definedRefs);
  };
}
