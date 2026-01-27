// src/features/protected/shell/notes/new/lib/cx.ts
export function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}
