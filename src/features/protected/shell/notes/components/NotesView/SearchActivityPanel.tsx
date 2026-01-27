"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  FiSearch,
  FiStar,
  FiX,
  FiClock,
  FiFolder,
  FiFileText,
} from "react-icons/fi";

type TreeKind = "root" | "folder" | "note";

type TreeNode = {
  id: string;
  name: string;
  kind: TreeKind;
};

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function highlight(text: string, q: string) {
  const qq = q.trim();
  if (!qq) return text;

  const idx = text.toLowerCase().indexOf(qq.toLowerCase());
  if (idx < 0) return text;

  const a = text.slice(0, idx);
  const b = text.slice(idx, idx + qq.length);
  const c = text.slice(idx + qq.length);

  return (
    <>
      {a}
      <mark className="rounded-sm bg-amber-200/70 px-1 py-px">{b}</mark>
      {c}
    </>
  );
}

function PanelShell({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white flex flex-col min-h-0 overflow-hidden h-full">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-xs font-semibold text-slate-900">{title}</div>
        </div>
      </div>
      <div className="p-3 flex-1 min-h-0 overflow-hidden">{children}</div>
    </section>
  );
}

export default function SearchActivityPanel({
  // 검색 상태 (IME 포함)
  query,
  setQuery,
  searchQuery,
  setSearchQuery,
  isComposing,
  setIsComposing,

  // 데이터
  qLower,
  searchHits,
  recentItems,
  favoriteItems,

  // 즐겨찾기(루트/폴더/노트)
  favoriteRootIds,
  favoriteFolderIds,
  favoriteNoteIds,
  toggleAnyFavorite,

  // 탐색/선택 콜백
  getNodeKind,
  getNodeParentPathText,
  openById,
  openPath,
  setSelectedId,

  // 렌더 보조
  formatHHMM,
}: {
  query: string;
  setQuery: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  isComposing: boolean;
  setIsComposing: (v: boolean) => void;

  qLower: string;
  searchHits: TreeNode[];
  recentItems: Array<{ id: string; label: string; ts: number; kind: TreeKind }>;
  favoriteItems: Array<{ id: string; label: string; kind: TreeKind }>;

  favoriteRootIds: Set<string>;
  favoriteFolderIds: Set<string>;
  favoriteNoteIds: Set<string>;
  toggleAnyFavorite: (kind: TreeKind, id: string) => void;

  getNodeKind: (id: string) => TreeKind | null;
  getNodeParentPathText: (id: string) => string;

  openById: (id: string, behavior: "search" | "list" | "tree") => void;
  openPath: (id: string) => void;
  setSelectedId: (id: string) => void;

  formatHHMM: (ts: number) => string;
}) {
  const [desktopTab, setDesktopTab] = useState<"recent" | "favorite">("recent");

  const clearQuery = () => {
    setQuery("");
    setSearchQuery("");
  };

  const renderSearchBox = () => (
    <div className="rounded-lg border border-slate-200 bg-white w-full">
      <div className="flex items-center gap-2 px-3 py-2">
        <FiSearch className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            const v = e.currentTarget.value;
            setQuery(v);
            setSearchQuery(v);
          }}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);

            const ne = e.nativeEvent as any;
            const composing = !!ne?.isComposing || isComposing;
            if (!composing) setSearchQuery(v);
          }}
          placeholder="폴더/파일 검색…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full bg-transparent py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {query.trim().length > 0 && (
          <button
            type="button"
            onClick={clearQuery}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="clear"
          >
            <FiX className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const isFav = (kind: TreeKind, id: string) => {
    if (kind === "root") return favoriteRootIds.has(id);
    if (kind === "folder") return favoriteFolderIds.has(id);
    return favoriteNoteIds.has(id);
  };

  const renderPickRow = ({
    id,
    label,
    onPick,
    highlightQuery,
    rightText,
    kindOverride,
  }: {
    id: string;
    label: string;
    onPick: (id: string) => void;
    highlightQuery?: string;
    rightText?: string;
    kindOverride?: TreeKind;
  }) => {
    const kind = kindOverride ?? getNodeKind(id) ?? "note";
    const isFolderLike = kind === "folder" || kind === "root";
    const path = getNodeParentPathText(id);

    const fav = isFav(kind, id);

    return (
      <div
        key={`${kind}:${id}`}
        role="button"
        tabIndex={0}
        onClick={() => onPick(id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick(id);
          }
        }}
        className={cx(
          "w-full rounded-lg px-3 py-2 text-left transition",
          "bg-slate-50 hover:bg-slate-100",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
        )}
      >
        <div className="flex items-center gap-2 w-full">
          <div className="shrink-0">
            {isFolderLike ? (
              <FiFolder className="h-4 w-4 text-slate-400" />
            ) : (
              <FiFileText className="h-4 w-4 text-slate-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="min-w-0 truncate text-sm font-semibold text-slate-900">
              {highlightQuery ? highlight(label, highlightQuery) : label}
              {path ? (
                <span className="ml-1 text-xs font-medium text-slate-500">
                  {path}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            aria-pressed={fav}
            onClick={(e) => {
              e.stopPropagation();
              toggleAnyFavorite(kind, id);
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/70"
            aria-label="favorite"
            title={fav ? "즐겨찾기 해제" : "즐겨찾기"}
          >
            <FiStar
              className={cx(
                "h-4 w-4",
                fav ? "text-amber-500" : "text-slate-400",
              )}
              fill={fav ? "currentColor" : "none"}
            />
          </button>

          {rightText ? (
            <div className="shrink-0 text-xs font-semibold text-slate-500">
              {rightText}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const TabBtn = ({
    k,
    label,
    icon,
  }: {
    k: "recent" | "favorite";
    label: string;
    icon: ReactNode;
  }) => {
    const active = desktopTab === k;
    return (
      <button
        type="button"
        onClick={() => setDesktopTab(k)}
        aria-pressed={active}
        className={cx(
          "h-9 flex-1 rounded-lg px-2 text-xs font-semibold transition",
          "inline-flex items-center justify-center gap-2",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20",
          active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600",
        )}
      >
        {icon}
        {label}
      </button>
    );
  };

  const renderList = () => {
    // ✅ 검색 상태
    if (qLower) {
      return (
        <div className="h-full min-h-0 overflow-y-auto pr-1 pb-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-500">
              검색 결과
            </div>
            <div className="text-xs text-slate-500">{searchHits.length}</div>
          </div>

          {searchHits.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center">
              <div className="text-sm font-semibold text-slate-900">
                결과 없음
              </div>
              <div className="mt-2 text-xs text-slate-500">
                다른 키워드로 검색해보세요.
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {searchHits.map((n) =>
                renderPickRow({
                  id: n.id,
                  label: n.name,
                  kindOverride: n.kind,
                  onPick: (id) => {
                    const kind = getNodeKind(id);
                    if (kind === "note") {
                      openById(id, "search");
                      return;
                    }
                    setSelectedId(id);
                    openPath(id);
                  },
                  highlightQuery: searchQuery,
                }),
              )}
            </div>
          )}
        </div>
      );
    }

    // ✅ 최근
    if (desktopTab === "recent") {
      return (
        <div className="h-full min-h-0 overflow-y-auto pr-1 pb-4">
          {recentItems.length === 0 ? (
            <div className="px-2 py-2 text-xs text-slate-500">
              최근 선택 없음
            </div>
          ) : (
            <div className="space-y-1">
              {recentItems.map((it) =>
                renderPickRow({
                  id: it.id,
                  label: it.label,
                  kindOverride: it.kind,
                  onPick: (id) => openById(id, "list"),
                  rightText: formatHHMM(it.ts),
                }),
              )}
            </div>
          )}
        </div>
      );
    }

    // ✅ 즐겨찾기 (루트/폴더/노트 모두)
    return (
      <div className="h-full min-h-0 overflow-y-auto pr-1 pb-4">
        {favoriteItems.length === 0 ? (
          <div className="px-2 py-2 text-xs text-slate-500">즐겨찾기 없음</div>
        ) : (
          <div className="space-y-1">
            {favoriteItems.map((it) =>
              renderPickRow({
                id: it.id,
                label: it.label,
                kindOverride: it.kind,
                onPick: (id) => openById(id, "list"),
              }),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <PanelShell
      title="검색 / 활동"
      icon={<FiSearch className="h-4 w-4 text-slate-500" />}
    >
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="shrink-0">{renderSearchBox()}</div>

        <div className="shrink-0">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <TabBtn
              k="recent"
              label="최근(파일)"
              icon={<FiClock className="h-3.5 w-3.5" />}
            />
            <TabBtn
              k="favorite"
              label="즐겨찾기"
              icon={<FiStar className="h-3.5 w-3.5" />}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">{renderList()}</div>
      </div>
    </PanelShell>
  );
}
