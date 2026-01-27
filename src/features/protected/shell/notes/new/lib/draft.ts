// src/features/protected/shell/notes/new/lib/draft.ts
"use client";

export type DraftPayload = {
  title: string;
  doc: unknown; // TipTap JSON
  text: string; // ✅ 핵심 (임시저장본 존재 판정용)
  updated_at?: string;
};

/** ✅ local fallback key (db draft key랑 별개로 유지) */
export const DRAFT_KEY = "archineur:new_note_draft_v1";

export function stableStringify(v: unknown) {
  const seen = new WeakSet<object>();

  const walk = (x: any): any => {
    if (x && typeof x === "object") {
      if (seen.has(x)) return null;
      seen.add(x);

      if (Array.isArray(x)) return x.map(walk);

      const keys = Object.keys(x).sort();
      const out: any = {};
      for (const k of keys) out[k] = walk(x[k]);
      return out;
    }
    return x;
  };

  return JSON.stringify(walk(v));
}

export function signatureOf(title: string, doc: unknown) {
  const t = (title || "").trim();
  return stableStringify({ t, doc });
}

export function nowIso() {
  try {
    return new Date().toISOString();
  } catch {
    return "";
  }
}

export async function draftGet(db: any): Promise<DraftPayload | null> {
  try {
    const getFn = db?.getNewNoteDraft;
    if (typeof getFn === "function") {
      const v = (await getFn()) as DraftPayload | null;
      if (v && typeof v === "object") {
        const title = String((v as any).title ?? "");
        const doc = (v as any).doc;
        const text = String((v as any).text ?? "");
        const updated_at = (v as any).updated_at;
        return { title, doc, text, updated_at };
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as any;
    if (!v || typeof v !== "object") return null;
    return {
      title: String(v.title ?? ""),
      doc: v.doc,
      text: String(v.text ?? ""),
      updated_at: v.updated_at,
    };
  } catch {
    return null;
  }
}

export async function draftSave(db: any, payload: DraftPayload) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {}

  try {
    const saveFn = db?.saveNewNoteDraft;
    if (typeof saveFn === "function") {
      await Promise.race([
        saveFn(payload),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DRAFT_SAVE_TIMEOUT")), 4000),
        ),
      ]);
    }
  } catch {}
}

export async function draftClear(db: any) {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}

  try {
    const clearFn = db?.clearNewNoteDraft;
    if (typeof clearFn === "function") {
      await Promise.race([
        clearFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DRAFT_CLEAR_TIMEOUT")), 4000),
        ),
      ]);
    }
  } catch {}
}
