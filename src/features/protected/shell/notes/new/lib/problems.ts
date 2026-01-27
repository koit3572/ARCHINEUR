// src/features/protected/shell/notes/new/lib/problems.ts
/** ✅ --- 기준 문제 분리 */
export function splitProblems(mdRaw: string) {
  const parts = String(mdRaw ?? "").split(/\n\s*---\s*\n/g);
  return parts.map((p) => p.trim()).filter(Boolean);
}
