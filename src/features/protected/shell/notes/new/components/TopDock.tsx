// src/features/protected/shell/notes/new/components/TopDock.tsx
"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cx } from "../lib/cx";

export default function TopDock({
  children,
  onHeightChange,
}: {
  children: ReactNode;
  onHeightChange: (h: number) => void;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-note-new-dock", "true");
    document.body.appendChild(el);
    setHost(el);

    return () => {
      el.remove();
    };
  }, []);

  useLayoutEffect(() => {
    if (!host) return;
    const el = dockRef.current;
    if (!el) return;

    const update = () => onHeightChange(el.getBoundingClientRect().height);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [host, onHeightChange]);

  if (!host) return null;

  return createPortal(
    <div
      ref={dockRef}
      className={cx(
        "fixed left-0 right-0 top-0 z-[999] border-b border-slate-200 bg-white/95 backdrop-blur",
        "lg:right-[360px]", // ✅ 우측 사이드바 영역 피해가기
      )}
    >
      {children}
    </div>,
    host,
  );
}
