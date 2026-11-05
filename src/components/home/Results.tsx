"use client";

import { useState } from "react";
import { catalogHref } from "@/data/catalog";
import { addDays, dayLabel, dayNum, defaultDate, diffDays, monthLabel, monthOf, wdShort } from "@/lib/dates";
import { useApi, useToday } from "@/lib/api";
import { OPEN_DEKOR, searchUrl, useCounts, type SearchRes } from "@/lib/catalogClient";
import { DateTile } from "@/components/ui/DateTile";
import { Icon } from "@/components/ui/Icon";
import { TextLink } from "@/components/ui/Button";
import { Container, Eyebrow } from "@/components/ui/Primitives";
import { VendorCard, VendorCardSkeleton } from "@/components/ui/VendorCard";

const WINDOW = 10;
const MAX_AHEAD = 120;

export function Results() {
  const today = useToday();
  const [offset, setOffset] = useState(1); // window starts tomorrow
  const [picked, setPicked] = useState<string | null>(null);
  const start = today ? addDays(today, offset) : null;
  const sel = picked ?? (today ? defaultDate(today) : null);

  const { counts } = useCounts(OPEN_DEKOR, start, WINDOW);
  const { data, loading } = useApi<SearchRes>(sel ? searchUrl({ ...OPEN_DEKOR, sana: sel, saralash: "tavsiya" }, 6) : null);
  const free = sel ? counts?.get(sel) ?? data?.total : undefined;

  const shift = (dir: -1 | 1) => setOffset((o) => Math.min(MAX_AHEAD, Math.max(1, o + dir * 5)));
  const days = start ? Array.from({ length: WINDOW }, (_, i) => addDays(start, i)) : [];

  return (
    <section id="studiyalar" className="scroll-mt-6 bg-bg-primary">
      <Container className="flex flex-col gap-10 pb-20 lg:pb-32">
        <div className="flex flex-col gap-6 rounded-3xl border border-line bg-surface px-4 pt-5 pb-6 shadow-02 sm:px-8 sm:pt-7 sm:pb-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="t-title">Yaqin kunlarda boʻsh studiyalar</h2>
            <div className="flex items-center gap-3">
              <span className="hidden t-body-sb sm:inline">{start ? monthLabel(monthOf(start)) : " "}</span>
              {(
                [
                  ["chevronLeft", -1, "Oldingi kunlar", offset <= 1],
                  ["chevronRight", 1, "Keyingi kunlar", offset >= MAX_AHEAD],
                ] as const
              ).map(([n, dir, label, disabled]) => (
                <button
                  key={n}
                  type="button"
                  aria-label={label}
                  disabled={disabled || !today}
                  onClick={() => shift(dir)}
                  className="hidden size-11 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-surface-subtle disabled:opacity-40 disabled:hover:bg-transparent sm:grid"
                >
                  <Icon name={n} />
                </button>
              ))}
            </div>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {start
              ? days.map((iso) => {
                  const n = counts?.get(iso);
                  return (
                    <div key={iso} className="flex flex-1 snap-start">
                      <DateTile
                        day={{ wd: wdShort(iso), d: dayNum(iso), free: n ?? 0, few: n !== undefined && n < 10 }}
                        note={n === undefined ? "…" : undefined}
                        selected={iso === sel}
                        onSelect={() => setPicked(iso)}
                      />
                    </div>
                  );
                })
              : Array.from({ length: WINDOW }).map((_, i) => <div key={i} className="h-[128px] min-w-[88px] flex-1 animate-pulse rounded-2xl bg-surface-subtle" />)}
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-4">
            <Eyebrow>{sel ? `${dayLabel(sel)} · ${free ?? "…"} ta boʻsh` : "Sana tanlanmoqda…"}</Eyebrow>
            <h2 className="lines text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">Shu kuni boʻsh dekor studiyalari</h2>
          </div>
          {sel && <TextLink href={catalogHref({ sana: sel })}>Barcha {free ?? ""} studiya</TextLink>}
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-14">
          {!data || (loading && data.items.length === 0)
            ? Array.from({ length: 6 }).map((_, i) => <VendorCardSkeleton key={i} />)
            : data.items.map((v) => <VendorCard key={v.slug} v={v} day={sel!} />)}
        </div>
        {data && data.items.length === 0 && (
          <p className="t-body-m text-ink-2">
            Bu kunga boʻsh studiya qolmagan. {today && sel && diffDays(sel, today) < 3 ? "Sanani biroz keyinroqqa suring." : "Boshqa kunni tanlang."}
          </p>
        )}
      </Container>
    </section>
  );
}
