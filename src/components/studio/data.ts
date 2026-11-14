"use client";

/* Client data layer for the panel: tiny stale-while-revalidate caches + a change bus.
   Writes are server-confirmed (never optimistic — money), then every screen that cares refetches. */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DayStatus } from "@/lib/studio/calendar";
import type { OrderStatus, OrderView } from "@/lib/studio/orders";

export type CalOrder = { id: string; client: string; venue: string | null; eventType: string; total: number; paid: number; balance: number };
export type CalDay = { date: string; status: DayStatus; load: number; blocked: boolean; reason: string | null; note: string | null; orders: CalOrder[] };
export type MonthData = { month: string; today: string; capacity: number; summary: { events: number; due: number }; days: CalDay[] };

export type OrderRow = { id: string; code: string; date: string; client: string; phone: string; venue: string | null; eventType: string; total: number; paid: number; balance: number; status: OrderStatus };
export type OrderList = { view: OrderView; page: number; pageSize: number; total: number; today: string; counts: Record<OrderView | "active", number>; items: OrderRow[] };

export type Payment = { id: string; amount: number; method: string; paidOn: string; note: string | null; createdAt: string; by: string | null };
export type OrderFull = {
  id: string; code: string; date: string; eventType: string; venue: string | null; guests: number | null; client: string; phone: string;
  total: number; notes: string | null; status: OrderStatus; createdAt: string; paid: number; balance: number; payments: Payment[];
};

/* ── change bus: "orders changed" → calendar months + lists + dashboards refetch ── */
type Listener = () => void;
const listeners = new Set<Listener>();
export function onDataChange(fn: Listener) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export function dataChanged() {
  monthCache.clear();
  listCache.clear();
  for (const fn of listeners) fn();
}
/* re-render a component whenever data changes anywhere */
export function useDataVersion() {
  const [v, setV] = useState(0);
  useEffect(() => onDataChange(() => setV((n) => n + 1)), []);
  return v;
}

/* ── calendar months ── */
export const monthCache = new Map<string, MonthData>(); // studioId:month
export const monthKey = (studio: string, m: string) => `${studio}:${m}`;
export const fetchMonth = (studio: string, m: string) =>
  api<MonthData>(`/api/panel/calendar?month=${m}`).then((d) => {
    monthCache.set(monthKey(studio, m), d);
    return d;
  });

/* ── order lists ── */
export const listCache = new Map<string, OrderList>(); // studioId:query
export const fetchList = (studio: string, qs: string) =>
  api<OrderList>(`/api/panel/orders?${qs}`).then((d) => {
    listCache.set(`${studio}:${qs}`, d);
    return d;
  });
