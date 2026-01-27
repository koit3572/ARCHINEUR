// src/features/protected/shell/notes/new/lib/serialize.ts
type PMAny = any;

/** ✅ inline serializer (bold/link) */
function mdInline(node: PMAny): string {
  if (!node) return "";

  if (node.type === "text") {
    let t = node.text ?? "";

    const marks = Array.isArray(node.marks) ? node.marks : [];
    const bold = marks.find((m: any) => m.type === "bold");
    const link = marks.find((m: any) => m.type === "link");

    if (bold) t = `**${t}**`;
    if (link?.attrs?.href) {
      const href = String(link.attrs.href);
      t = `[${t}](${href})`;
    }
    return t;
  }

  if (node.type === "hardBreak") return "\n";

  if (Array.isArray(node.content)) {
    return node.content.map(mdInline).join("");
  }

  return "";
}

/** ✅ block serializer (H1~H3, p, list, hr) */
function mdBlock(node: PMAny, indent = ""): string {
  if (!node) return "";

  if (node.type === "heading") {
    const level = Math.min(3, Math.max(1, node.attrs?.level ?? 1));
    const text = mdInline(node).trim();
    return `${"#".repeat(level)} ${text}\n\n`;
  }

  if (node.type === "paragraph") {
    const text = mdInline(node).trimEnd();
    return text ? `${indent}${text}\n\n` : "\n";
  }

  if (node.type === "horizontalRule") {
    return `---\n\n`;
  }

  if (node.type === "bulletList") {
    const items = (node.content ?? []).map((li: any) => mdListItem(li, indent));
    return items.join("") + "\n";
  }

  if (node.type === "orderedList") {
    const items = (node.content ?? []).map((li: any, idx: number) =>
      mdListItem(li, indent, idx + 1),
    );
    return items.join("") + "\n";
  }

  if (Array.isArray(node.content)) {
    return node.content.map((c: any) => mdBlock(c, indent)).join("");
  }

  return "";
}

function mdListItem(li: PMAny, indent = "", order?: number) {
  const bullet = typeof order === "number" ? `${order}. ` : `- `;
  const subIndent = indent + "  ";

  const blocks = (li.content ?? []) as PMAny[];
  let out = "";
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "paragraph") {
      const line = mdInline(b).trimEnd();
      out += `${indent}${bullet}${line}\n`;
    } else if (b.type === "bulletList" || b.type === "orderedList") {
      out += mdBlock(b, subIndent);
    } else {
      out += mdBlock(b, subIndent);
    }
  }
  return out;
}

export function serializeToMarkdown(doc: PMAny): string {
  if (!doc?.content) return "";
  return doc.content
    .map((n: any) => mdBlock(n))
    .join("")
    .trimEnd();
}
