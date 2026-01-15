"use client";

import { useSearchParams } from "next/navigation";

import PracticeNoteView from "./components/PracticeNoteView";
import PracticeFeedView from "./components/PracticeFeedView";

import type { PracticeMode } from "./types";

function isPracticeMode(v: string | null): v is PracticeMode {
  return v === "feed" || v === "note" || v === "exam";
}

export default function PracticePage() {
  const searchParams = useSearchParams();

  const urlMode = searchParams.get("mode");
  const mode: PracticeMode = isPracticeMode(urlMode) ? urlMode : "feed";

  if (mode === "note") return <PracticeNoteView />;
  return <PracticeFeedView />;
}
