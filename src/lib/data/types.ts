"use client";

/* =========================
   Row Types (앱에서 쓰는 형태)
========================= */
export type RootRow = {
  id: string;
  title: string;
  description?: string | null;
  created_at?: string;
};

export type FolderRow = {
  id: string;
  root_id: string;
  name: string;
  parent_id?: string | null;
  order?: number | null;
  created_at?: string;
};

/**
 * ✅ 루트 직속 노트 지원을 위해 변경
 * - root_id: 필수
 * - folder_id: 루트 직속이면 null 허용
 */
export type NoteRow = {
  id: string;

  root_id: string; // ✅ 추가 (필수)
  folder_id: string | null; // ✅ 변경 (null 허용)

  title: string;
  content: string;

  created_at: string;
  updated_at?: string;
  order?: number;
};

export type NoteFavoriteRow = {
  id: string;
  user_id: string;
  note_id: string;
  created_at: string;
};

/** ✅ 폴더 즐겨찾기 */
export type FolderFavoriteRow = {
  id: string;
  user_id: string;
  folder_id: string;
  created_at: string;
};

/** ✅ 루트 즐겨찾기 */
export type RootFavoriteRow = {
  id: string;
  user_id: string;
  root_id: string;
  created_at: string;
};

export type NoteRecentRow = {
  id: string;
  user_id: string;
  note_id: string;
  last_opened_at: string;
  created_at: string;
  updated_at: string;
};

export type NoteProgressRow = {
  id: string;
  user_id: string;
  note_id: string;

  tokens_total: number;
  tokens_filled: number;
  tokens_correct: number;

  created_at: string;
  updated_at: string;
};

/** ✅ NewNoteScreen에서 쓰는 DraftPayload 형태 */
export type DraftPayload = {
  title: string;
  doc: unknown; // TipTap JSON 등
  text: string; // editor.getText()
  updated_at?: string;
};

/** ✅ 임시저장(최신 1개): notes/new용 */
export type NoteDraftRow = {
  id: string;
  user_id: string;
  scope: string;
  content: DraftPayload; // jsonb
  created_at: string;
  updated_at: string;
};

export type Tables = {
  roots: RootRow[];
  folders: FolderRow[];
  notes: NoteRow[];

  note_favorites: NoteFavoriteRow[];
  user_folder_favorites: FolderFavoriteRow[];
  user_root_favorites: RootFavoriteRow[];

  note_recents: NoteRecentRow[];
  note_progress: NoteProgressRow[];

  note_drafts: NoteDraftRow[];
};

export type Snapshot = Tables & {
  _version: number;
};

export type TableKey = keyof Tables;
