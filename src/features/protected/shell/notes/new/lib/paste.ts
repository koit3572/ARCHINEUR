// src/features/protected/shell/notes/new/lib/paste.ts
import { normalizeHref } from "./href";

export function looksLikeMarkdown(s: string) {
  const t = s ?? "";
  return (
    /(^|\n)\s*#{1,3}\s+/.test(t) ||
    /(^|\n)\s*[-*]\s+/.test(t) ||
    /(^|\n)\s*\d+\.\s+/.test(t) ||
    /(^|\n)\s*---\s*$/.test(t) ||
    /\*\*[^*]+\*\*/.test(t) ||
    /\[[^\]\n]+\]\([^)]+\)/.test(t) ||
    /\([^)]+\)\[https?:\/\/[^\]\s]+\]/.test(t)
  );
}

// (라벨)[URL] 을 [라벨](URL)로 통일 (붙여넣기용)
export function normalizePastedMarkdown(md: string) {
  return String(md ?? "").replace(
    /\(([^)\n]+)\)\[(https?:\/\/[^\]\s]+)\]/g,
    (_m, label, url) => `[${String(label).trim()}](${String(url).trim()})`,
  );
}

function escapeHtmlText(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function inlineToHtml(text: string) {
  let s = escapeHtmlText(text);

  // bold **...**
  s = s.replace(/\*\*([^*]+)\*\*/g, (_m, inner) => {
    return `<strong>${escapeHtmlText(String(inner))}</strong>`;
  });

  // [label](url)
  s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    const href = normalizeHref(String(url).trim());
    const lb = escapeHtmlText(String(label).trim());
    return `<a href="${href}">${lb}</a>`;
  });

  // (label)[url]
  s = s.replace(/\(([^)\n]+)\)\[(https?:\/\/[^\]\s]+)\]/g, (_m, label, url) => {
    const href = normalizeHref(String(url).trim());
    const lb = escapeHtmlText(String(label).trim());
    return `<a href="${href}">${lb}</a>`;
  });

  // 줄바꿈 유지(문단 내부)
  s = s.replace(/\n/g, "<br/>");
  return s;
}

// ✅ 아주 “필요한 만큼만” 파싱: h1~h3 / p / ul/ol/li / strong / a / hr
export function markdownToHtmlForEditor(md: string) {
  const lines = String(md ?? "")
    .replaceAll("\r\n", "\n")
    .split("\n");

  let i = 0;
  const out: string[] = [];

  const flushParagraph = (buf: string[]) => {
    if (buf.length === 0) return;
    const joined = buf.join("\n").trim();
    if (!joined) return;
    out.push(`<p>${inlineToHtml(joined)}</p>`);
    buf.length = 0;
  };

  const parseList = () => {
    const isOl = /^\s*\d+\.\s+/.test(lines[i] ?? "");
    const tag = isOl ? "ol" : "ul";
    const itemRe = isOl ? /^\s*(\d+)\.\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;

    const items: string[] = [];
    while (i < lines.length && itemRe.test(lines[i] ?? "")) {
      const m = itemRe.exec(lines[i] ?? "");
      const raw = isOl ? String(m?.[2] ?? "") : String(m?.[1] ?? "");
      items.push(`<li>${inlineToHtml(raw.trim())}</li>`);
      i += 1;
    }
    out.push(`<${tag}>${items.join("")}</${tag}>`);
  };

  const pbuf: string[] = [];

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (!line.trim()) {
      flushParagraph(pbuf);
      i += 1;
      continue;
    }

    if (/^\s*---\s*$/.test(line)) {
      flushParagraph(pbuf);
      out.push("<hr />");
      i += 1;
      continue;
    }

    const hm = /^\s*(#{1,3})\s+(.*)$/.exec(line);
    if (hm) {
      flushParagraph(pbuf);
      const level = hm[1].length;
      const text = String(hm[2] ?? "").trim();
      out.push(`<h${level}>${inlineToHtml(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      flushParagraph(pbuf);
      parseList();
      continue;
    }

    pbuf.push(line);
    i += 1;
  }

  flushParagraph(pbuf);
  return `<div>${out.join("")}</div>`;
}
