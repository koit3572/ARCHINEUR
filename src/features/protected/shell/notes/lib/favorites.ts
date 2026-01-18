export const FAVORITES_KEY = "practice:favoriteNoteIds";

export function readFavoriteIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const raw = window.localStorage.getItem(FAVORITES_KEY);
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed))
      return new Set(parsed.map(String).filter(Boolean));
    return new Set();
  } catch {
    if (raw.includes(",")) {
      return new Set(
        raw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      );
    }
    return new Set();
  }
}

export function writeFavoriteIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)));
}
