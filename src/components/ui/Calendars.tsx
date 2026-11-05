"use client";

import { useState } from "react";
import type { Status } from "@/data/catalog";
import { useApi } from "@/lib/api";
import { addDays, monthOf } from "@/lib/dates";
import { useMonthCounts, type AttrFilters } from "@/lib/catalogClient";
import { MonthCalendar } from "./Picker";

/* Calendar with "N free" under each day for a set of catalogue filters */
export function CountsCalendar({ filters, selected, onSelect, today }: { filters: AttrFilters; selected: string | null; onSelect: (iso: string) => void; today: string }) {
  const [month, setMonth] = useState(monthOf(selected ?? addDays(today, 1)));
  const { counts } = useMonthCounts(filters, month);
  return (
    <MonthCalendar
      month={month}
      onMonth={setMonth}
      today={today}
      selected={selected}
      onSelect={onSelect}
      status={(iso) => (counts ? (counts.get(iso) ? "free" : "busy") : undefined)}
      note={(iso) => (counts ? String(counts.get(iso) ?? 0) : undefined)}
    />
  );
}

/* One vendor's own calendar (free / 1 joy / band) */
export function useVendorMonth(slug: string, month: string) {
  const { data, loading, reload } = useApi<{ month: string; days: { date: string; status: Status }[] }>(`/api/vendors/${slug}/calendar?month=${month}`);
  const map = data && data.month === month ? new Map(data.days.map((d) => [d.date, d.status])) : null;
  return { map, loading, reload };
}

export function VendorCalendar({
  slug, month, onMonth, selected, onSelect, today, size,
}: { slug: string; month: string; onMonth: (m: string) => void; selected: string | null; onSelect: (iso: string) => void; today: string; size?: "md" | "lg" }) {
  const { map } = useVendorMonth(slug, month);
  return <MonthCalendar size={size} month={month} onMonth={onMonth} today={today} selected={selected} onSelect={onSelect} status={(iso) => (map ? (map.get(iso) ?? "free") : undefined)} />;
}
