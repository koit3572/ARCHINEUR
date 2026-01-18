"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

import { db, useTable, type NoteRow } from "@/lib/data";

type TocItem = { id: string; text: string; level: 1 | 2 | 3 };

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function cleanHeadingText(s: string) {
  return s
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\[(.*?)\]/g, "$1")
    .trim();
}

function makeSlugger() {
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

function stripProblemBrackets(markdown: string) {
  const s0 = (markdown ?? "").replace(/\[\[/g, "[").replace(/\]\]/g, "]");

  return s0.replace(
    /\[([^\]\[]+?)\]/g,
    (m, inner: string, offset: number, str: string) => {
      const prev = offset > 0 ? str[offset - 1] : "";
      const next = str[offset + m.length] ?? "";

      if (prev === "!") return m;
      if (next === "(" || next === "[" || next === ":") return m;
      if (inner.startsWith("^")) return m;

      return inner;
    },
  );
}

function buildToc(markdown: string): TocItem[] {
  const { slugify } = makeSlugger();
  const lines = (markdown ?? "").split(/\r?\n/);

  let inFence = false;
  const out: TocItem[] = [];

  for (const raw of lines) {
    const line = raw ?? "";

    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(/^(#{1,3})\s+(.+)\s*$/);
    if (!m) continue;

    const level = m[1].length as 1 | 2 | 3;
    const text = cleanHeadingText(m[2] ?? "");
    if (!text) continue;

    const id = slugify(text);
    out.push({ id, text, level });
  }

  return out;
}

function extractNoteId(pathname: string) {
  const from = (key: "/post/" | "/notes/") => {
    const idx = pathname.indexOf(key);
    if (idx === -1) return null;

    const raw = pathname.slice(idx + key.length);
    if (!raw) return null;

    const base = raw.split("?")[0].split("#")[0];
    const first = base.split("/")[0] ?? "";
    return safeDecode(first);
  };

  return from("/notes/") ?? from("/post/");
}

function scrollToId(id: string) {
  const root =
    document.getElementById("practice-post-content") ?? document.body;

  const scroll = (el: HTMLElement) => {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const direct = root.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
  if (direct) {
    scroll(direct);
    return;
  }

  const headings = Array.from(
    root.querySelectorAll("h1,h2,h3,h4,h5,h6"),
  ) as HTMLElement[];

  const { slugify } = makeSlugger();
  for (const h of headings) {
    const text = cleanHeadingText(h.textContent ?? "");
    if (!text) continue;

    const genId = slugify(text);
    if (genId === id) {
      scroll(h);
      return;
    }
  }
}

export default function TocPanel({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    db.ensure();
  }, []);

  const notes = useTable("notes") as NoteRow[];
  const noteId = useMemo(() => extractNoteId(pathname), [pathname]);

  const note = useMemo(() => {
    if (!noteId) return null;
    return (notes ?? []).find((n) => String(n.id) === noteId) ?? null;
  }, [notes, noteId]);

  const toc = useMemo<TocItem[]>(() => {
    if (!note?.content) return [];
    return buildToc(stripProblemBrackets(note.content as string));
  }, [note]);

  const body = (() => {
    if (!note) {
      return (
        <div className="px-4 py-3 text-[12px] text-slate-600">
          노트를 찾을 수 없어요.
        </div>
      );
    }

    if (toc.length === 0) {
      return (
        <div className="px-4 py-3 text-[12px] text-slate-600">
          # / ## / ### 제목이 없어요.
        </div>
      );
    }

    return (
      <div className="max-h-[52vh] overflow-y-auto p-2">
        {toc.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => {
              onNavigate?.();
              requestAnimationFrame(() => scrollToId(it.id));
            }}
            className={cx(
              "group w-full rounded-lg px-3 py-2 text-left transition",
              "hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
            )}
            style={{ paddingLeft: 12 + (it.level - 1) * 14 }}
            title={it.text}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cx(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  it.level === 1
                    ? "bg-slate-700"
                    : it.level === 2
                      ? "bg-slate-500"
                      : "bg-slate-300",
                )}
              />
              <span className="min-w-0 line-clamp-1 text-[12px] text-slate-900">
                {it.text}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  })();

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ✅ 헤더(목차 + 노트제목 + 카운트) */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] font-semibold text-slate-900">목차</div>
          <div className="text-[11px] text-slate-500">
            {note ? toc.length : "—"}
          </div>
        </div>
        <div className="mt-1 truncate text-[12px] text-slate-500">
          {note?.title ?? "Note"}
        </div>
      </div>

      {/* ✅ 본문(상태/리스트) */}
      {body}
    </section>
  );
}
