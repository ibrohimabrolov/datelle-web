"use client";

import { useCallback, useSyncExternalStore } from "react";

/* Saved studios — per-browser convenience, survives reloads. Wrapped: storage can throw. */
const KEY = "datelle:saved";
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
let cache: string | null = null;
function snapshot() {
  if (cache === null) cache = JSON.stringify(read());
  return cache;
}
function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  cache = JSON.stringify(list);
  listeners.forEach((l) => l());
}

export function useSaved(slug: string): [boolean, () => void] {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    snapshot,
    () => "[]",
  );
  const saved = (JSON.parse(raw) as string[]).includes(slug);
  const toggle = useCallback(() => {
    const list = read();
    write(saved ? list.filter((s) => s !== slug) : [...list, slug]);
  }, [saved, slug]);
  return [saved, toggle];
}
