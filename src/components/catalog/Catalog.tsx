"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  BUDGETS, CHIPS, DISTRICTS, EVENT_TYPES, SORTS, budgetLabel, dayLabel,
  districtBySlug, districtSlug, eventLabel, parseFilters, toQuery, type Filters, type VendorHit,
} from "@/data/catalog";
import { api, useApi, useToday, type ApiError } from "@/lib/api";
import { searchUrl, type SearchRes } from "@/lib/catalogClient";
import { Chip, FilterField, OptionList, Segmented } from "@/components/ui/Picker";
import { CountsCalendar } from "@/components/ui/Calendars";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Container } from "@/components/ui/Primitives";
import { VendorCard, VendorCardSkeleton } from "@/components/ui/VendorCard";
import { CatalogSkeleton } from "./CatalogSkeleton";
import { EmptyState } from "./EmptyState";

const PAGE = 9;

export function Catalog() {
  const today = useToday();
  if (!today) return <CatalogSkeleton />;
  return <CatalogInner today={today} />;
}

function CatalogInner({ today }: { today: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const f = parseFilters(sp, today);
  const first = useApi<SearchRes>(searchUrl(f, PAGE));
  const total = first.data?.total;

  const update = (patch: Partial<Filters>) =>
    router.push(`${pathname}?${toQuery({ ...f, ...patch })}`, { scroll: false });

  const districtName = f.tuman === "all" ? "Butun Toshkent" : (districtBySlug(f.tuman) ?? "Butun Toshkent");
  const noun = f.tur === "dekor" ? "dekor studiyasi" : "florist";
  const meta = [dayLabel(f.sana), f.tadbir === "all" ? "Istalgan tadbir" : eventLabel(f.tadbir), districtName, f.byudjet ? `${budgetLabel(f.byudjet).replace(" gacha", "")} soʻmgacha` : "Istalgan byudjet"].join(" · ");

  return (
    <>
      {/* Filter bar — Figma 245:575 */}
      <div className="border-b border-line bg-surface">
        <Container wide className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:py-5">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            <FilterField icon="calendar" label="Sana" value={dayLabel(f.sana)} emphasis className="w-[220px] shrink-0" panelWidth={400}>
              {(close) => (
                <div className="p-1">
                  <p className="mb-3 t-cap text-ink-3">Kun ostida — shu filtrlarga mos boʻsh {f.tur === "dekor" ? "studiyalar" : "floristlar"} soni</p>
                  <CountsCalendar
                    filters={f}
                    today={today}
                    selected={f.sana}
                    onSelect={(d) => {
                      update({ sana: d });
                      close();
                    }}
                  />
                </div>
              )}
            </FilterField>
            <FilterField icon="sparkle" label="Tadbir turi" value={f.tadbir === "all" ? "Istalgan" : eventLabel(f.tadbir)} className="w-[200px] shrink-0" panelWidth={260}>
              {(close) => (
                <OptionList
                  options={[{ value: "all", label: "Istalgan" }, ...EVENT_TYPES.map((e) => ({ value: e.slug, label: e.label }))]}
                  value={f.tadbir}
                  onChange={(v) => {
                    update({ tadbir: v as Filters["tadbir"] });
                    close();
                  }}
                />
              )}
            </FilterField>
            <FilterField icon="mapPin" label="Tuman" value={districtName} className="w-[220px] shrink-0" panelWidth={280}>
              {(close) => (
                <OptionList
                  options={[{ value: "all", label: "Butun Toshkent" }, ...DISTRICTS.map((d) => ({ value: districtSlug(d), label: d }))]}
                  value={f.tuman}
                  onChange={(v) => {
                    update({ tuman: v });
                    close();
                  }}
                />
              )}
            </FilterField>
            <FilterField icon="grid" label="Byudjet" value={budgetLabel(f.byudjet)} className="w-[200px] shrink-0" panelWidth={240}>
              {(close) => (
                <OptionList
                  options={BUDGETS}
                  value={f.byudjet as (typeof BUDGETS)[number]["value"]}
                  onChange={(v) => {
                    update({ byudjet: v });
                    close();
                  }}
                />
              )}
            </FilterField>
          </div>
          <div className="lg:ml-auto">
            <Segmented
              options={[
                { value: "dekor", label: "Dekor" },
                { value: "floristika", label: "Floristika" },
              ]}
              value={f.tur}
              onChange={(v) => update({ tur: v })}
            />
          </div>
        </Container>
      </div>

      {first.error ? (
        <Container wide className="py-24 text-center">
          <p className="t-body-m text-ink-2">{first.error.message}</p>
          <Button variant="secondary" size="md" className="mt-4" onClick={first.reload}>
            Qayta urinish
          </Button>
        </Container>
      ) : total === 0 && !first.loading ? (
        <EmptyState f={f} today={today} districtName={districtName} onChange={update} />
      ) : (
        <>
          {/* Results header — Figma 245:630 */}
          <Container wide className="flex flex-col gap-5 pt-8 pb-6 lg:pt-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2">
                <h1 className="t-h2" aria-live="polite">
                  {total === undefined ? "Qidirilmoqda…" : `${total} ta ${noun}`}
                </h1>
                <p className="t-body-s text-ink-3">{meta}</p>
              </div>
              <FilterField
                icon="grid"
                label="Saralash"
                value={SORTS.find((s) => s.value === f.saralash)!.label}
                className="w-full sm:w-[260px]"
                align="right"
                panelWidth={260}
              >
                {(close) => (
                  <OptionList
                    options={SORTS}
                    value={f.saralash}
                    onChange={(v) => {
                      update({ saralash: v });
                      close();
                    }}
                  />
                )}
              </FilterField>
            </div>
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {CHIPS.map((c) => {
                const on = f.chips.includes(c.value);
                return (
                  <Chip key={c.value} selected={on} onClick={() => update({ chips: on ? f.chips.filter((x) => x !== c.value) : [...f.chips, c.value] })}>
                    {c.label}
                  </Chip>
                );
              })}
              <button
                type="button"
                onClick={() => update({ tadbir: "all", tuman: "all", byudjet: 0, chips: [], saralash: "tavsiya" })}
                className="group ml-1 inline-flex shrink-0 items-center gap-1.5 py-3 t-body-sb text-ink"
              >
                Tozalash
                <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </Container>

          {first.data && !first.loading ? <Grid key={sp.toString()} first={first.data} f={f} /> : <GridSkeleton />}
        </>
      )}
    </>
  );
}

function GridSkeleton() {
  return (
    <Container wide className="grid grid-cols-1 gap-x-8 gap-y-10 pb-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-14">
      {Array.from({ length: 6 }).map((_, i) => (
        <VendorCardSkeleton key={i} />
      ))}
    </Container>
  );
}

function Grid({ first, f }: { first: SearchRes; f: Filters }) {
  const [items, setItems] = useState<VendorHit[]>(first.items);
  const [more, setMore] = useState<"idle" | "loading" | ApiError>("idle");
  const rest = first.total - items.length;

  const loadMore = async () => {
    setMore("loading");
    try {
      const res = await api<SearchRes>(searchUrl(f, 60, items.length));
      setItems((x) => [...x, ...res.items]);
      setMore("idle");
    } catch (e) {
      setMore(e as ApiError);
    }
  };

  return (
    <Container wide className="flex flex-col items-center gap-12 pb-14">
      <div className="grid w-full grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-14">
        {items.map((v, i) => (
          <VendorCard key={v.slug} v={v} day={f.sana} priority={i < 3} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-3">
        {rest > 0 && (
          <Button variant="secondary" size="lg" disabled={more === "loading"} onClick={loadMore}>
            {more === "loading" ? "Yuklanmoqda…" : `Yana ${rest} ta koʻrsatish`}
          </Button>
        )}
        {typeof more === "object" && <span className="t-cap text-error">{more.message}</span>}
        <span className="t-cap text-ink-3">
          {items.length} / {first.total} koʻrsatildi
        </span>
      </div>
    </Container>
  );
}
