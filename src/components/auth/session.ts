"use client";

import { useSyncExternalStore } from "react";
import { api } from "@/lib/api";

export type User = { id: string; phone: string; name: string | null; role: string };
type State = { status: "unknown" | "anon" | "user"; user: User | null };

let state: State = { status: "unknown", user: null };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

const set = (s: State) => {
  state = s;
  listeners.forEach((l) => l());
};

export function refreshSession() {
  inflight ??= api<{ user: User | null }>("/api/me")
    .then(({ user }) => set(user ? { status: "user", user } : { status: "anon", user: null }))
    .catch(() => set({ status: "anon", user: null }))
    .finally(() => (inflight = null));
  return inflight;
}
export const setSessionUser = (user: User) => set({ status: "user", user });

export async function logout() {
  await api("/api/auth/logout", { body: {} });
  set({ status: "anon", user: null });
}

const SERVER: State = { status: "unknown", user: null };
export function useSession() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (state.status === "unknown") void refreshSession();
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER,
  );
}
