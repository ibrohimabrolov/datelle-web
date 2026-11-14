"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { todayISO } from "./dates";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
      credentials: "same-origin",
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "network", "Internet aloqasini tekshiring");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; fields?: Record<string, string> } & Record<string, unknown> }).error ?? {};
    const { code, message, fields, ...extra } = err;
    throw new ApiError(res.status, code ?? "unknown", message ?? "Xatolik yuz berdi", fields, extra);
  }
  return data as T;
}

/* GET de-duplication: identical URLs within 15 s share one request */
const cache = new Map<string, { t: number; p: Promise<unknown> }>();
function cachedGet<T>(url: string): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < 15_000) return hit.p as Promise<T>;
  const p = api<T>(url).catch((e) => {
    cache.delete(url);
    throw e;
  });
  cache.set(url, { t: Date.now(), p });
  return p;
}
export const invalidate = (prefix: string) => [...cache.keys()].forEach((k) => k.startsWith(prefix) && cache.delete(k));

/* Minimal GET hook — keeps the previous data while refetching (no layout jumps) */
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<{ data?: T; error?: ApiError; loading: boolean; url?: string | null }>({ loading: !!url });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url) return;
    let live = true;
    setState((s) => ({ ...s, loading: true, url })); // eslint-disable-line react-hooks/set-state-in-effect
    cachedGet<T>(url)
      .then((data) => live && setState({ data, loading: false, url }))
      .catch((error) => live && setState((s) => ({ ...s, error, loading: false, url })));
    return () => {
      live = false;
    };
  }, [url, tick]);
  const reload = useCallback(() => {
    if (url) cache.delete(url);
    setTick((t) => t + 1);
  }, [url]);
  return { ...state, reload };
}

/* Today in Toshkent — null during SSR/first paint so static HTML never bakes in a date */
const subscribeNoop = () => () => {};
export function useToday(): string | null {
  return useSyncExternalStore(subscribeNoop, () => todayISO(), () => null);
}
