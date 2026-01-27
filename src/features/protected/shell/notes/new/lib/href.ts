// src/features/protected/shell/notes/new/lib/href.ts
export function normalizeHref(href: string) {
  const h = (href ?? "").trim();
  if (!h) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return h;
  if (/^(\/|#)/.test(h)) return h;
  return `https://${h.replace(/^\/+/, "")}`;
}
