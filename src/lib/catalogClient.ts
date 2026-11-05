"use client";

import { useApi } from "./api";
import { monthDates } from "./dates";
import { toQuery, type Filters, type VendorHit } from "@/data/catalog";

export type AttrFilters = Omit<Filters, "sana" | "saralash">;
export type Summary = { from: string; days: { date: string; count: number }[] };
export type SearchRes = { total: number; items: VendorHit[] };

/* Same query string the catalogue page uses, minus the date */
export const attrQuery = (f: AttrFilters) => toQuery({ ...f, saralash: undefined });

export function useCounts(f: AttrFilters | null, from: string | null, days: number) {
  const url = f && from ? `/api/availability?from=${from}&days=${days}&${attrQuery(f)}` : null;
  const { data, loading, error } = useApi<Summary>(url);
  const map = new Map((data?.days ?? []).map((d) => [d.date, d.count]));
  return { counts: data && data.from === from ? map : null, loading, error };
}

export function useMonthCounts(f: AttrFilters | null, month: string | null) {
  const dates = month ? monthDates(month) : [];
  return useCounts(f, month ? dates[0] : null, dates.length);
}

export const searchUrl = (f: Filters, limit: number, offset = 0) => `/api/vendors/search?${toQuery(f)}&limit=${limit}&offset=${offset}`;

/* Home and the hero count every open studio — no budget/chip filters */
export const OPEN_DEKOR: AttrFilters = { tur: "dekor", tadbir: "all", tuman: "all", byudjet: 0, chips: [] };
