"use client";

import { useSyncExternalStore } from "react";
import { listeners } from "./cache";
import { getSnapshot, getServerSnapshot } from "./cache";
import { supabase, db } from "./api";

let bootstrapped = false;
let authHooked = false;

function subscribe(cb: () => void) {
  listeners.add(cb);

  if (!bootstrapped) {
    bootstrapped = true;
    void db.refresh();
  }

  if (!authHooked) {
    authHooked = true;
    supabase.auth.onAuthStateChange(() => {
      void db.refresh();
    });
  }

  return () => {
    listeners.delete(cb);
  };
}

/* =========================
   Hooks
========================= */
export function useDB() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useTable<K extends import("./types").TableKey>(name: K) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return snap[name];
}
