// src/features/protected/shell/notes/detail/lib/favorites.ts
export function isFavNote(n: any, favIds: string[]) {
  if (favIds.includes(String(n?.id ?? ""))) return true;
  return Boolean(n?.is_favorite || n?.favorite || n?.isFavorite);
}

export function readFavoriteIdsFromLocalStorage(): string[] {
  if (typeof window === "undefined") return [];

  const keys = [
    "practice:favorites",
    "practice:favoriteNoteIds",
    "practice:favNoteIds",
    "favorite_note_ids",
    "favoriteNoteIds",
  ];

  for (const k of keys) {
    const raw = window.localStorage.getItem(k);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);

      if (parsed && typeof parsed === "object") {
        const maybe = (parsed.ids || parsed.noteIds || parsed.favorites) as any;
        if (Array.isArray(maybe)) return maybe.map(String).filter(Boolean);
      }
    } catch {
      if (raw.includes(",")) {
        return raw
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }
    }
  }

  return [];
}
