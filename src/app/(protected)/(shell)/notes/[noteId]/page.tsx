"use client";

import { useParams } from "next/navigation";
import NoteDetailPage from "@/features/protected/shell/notes/detail/NoteDetailPage";

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default function Page() {
  const params = useParams();

  // useParams()는 string | string[] 가능성 있음
  const rawParam = (params?.noteId as string | string[] | undefined) ?? "";
  const noteId = safeDecode(
    Array.isArray(rawParam) ? (rawParam[0] ?? "") : rawParam
  );

  return <NoteDetailPage noteId={noteId} />;
}
