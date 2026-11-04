"use client";

import { useMemo, useState } from "react";
import { DEFAULT_DAY, MONTH, VENDORS, catalogHref, dayInfo, dayLabel, isFree, vendorBySlug } from "@/data/catalog";
import { HOME_FEATURED } from "@/data/home";
import { DateTile } from "@/components/ui/DateTile";
import { Icon } from "@/components/ui/Icon";
import { TextLink } from "@/components/ui/Button";
import { Container, Eyebrow } from "@/components/ui/Primitives";
import { VendorCard } from "@/components/ui/VendorCard";

const WINDOW = 10;
const MAX_START = MONTH.days - WINDOW + 1;

export function Results() {
  const [start, setStart] = useState(8); // Figma: 8–17-iyun
  const [sel, setSel] = useState(DEFAULT_DAY);
  const days = useMemo(() => Array.from({ length: WINDOW }, (_, i) => dayInfo("dekor", start + i)), [start]);
  const info = dayInfo("dekor", sel);

  const shown = useMemo(() => {
    const featured = HOME_FEATURED.map((s) => vendorBySlug(s)!).filter((v) => isFree(v, sel));
    const rest = VENDORS.filter((v) => v.category === "dekor" && !HOME_FEATURED.includes(v.slug) && isFree(v, sel));
    return [...featured, ...rest].slice(0, 6);
  }, [sel]);

  const shift = (dir: -1 | 1) => setStart((s) => Math.min(MAX_START, Math.max(1, s + dir * 5)));

  return (
    <section id="studiyalar" className="scroll-mt-6 bg-bg-primary">
      <Container className="flex flex-col gap-10 pb-20 lg:pb-32">
        {/* Date picker */}
        <div className="flex flex-col gap-6 rounded-3xl border border-line bg-surface px-4 pt-5 pb-6 shadow-02 sm:px-8 sm:pt-7 sm:pb-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="t-title">Yaqin kunlarda boʻsh studiyalar</h2>
            <div className="flex items-center gap-3">
              <span className="hidden t-body-sb sm:inline">
                {MONTH.name} {MONTH.year}
              </span>
              {(
                [
                  ["chevronLeft", -1, "Oldingi kunlar", start <= 1],
                  ["chevronRight", 1, "Keyingi kunlar", start >= MAX_START],
                ] as const
              ).map(([n, dir, label, disabled]) => (
                <button
                  key={n}
                  type="button"
                  aria-label={label}
                  disabled={disabled}
                  onClick={() => shift(dir)}
                  className="hidden size-11 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-surface-subtle disabled:opacity-40 disabled:hover:bg-transparent sm:grid"
                >
                  <Icon name={n} />
                </button>
              ))}
            </div>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {days.map((d) => (
              <div key={d.d} className="flex flex-1 snap-start">
                <DateTile day={d} selected={d.d === sel} onSelect={() => setSel(d.d)} />
              </div>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-4">
            <Eyebrow>
              {dayLabel(sel)} · {info.free} ta boʻsh
            </Eyebrow>
            <h2 className="lines text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">Shu kuni boʻsh dekor studiyalari</h2>
          </div>
          <TextLink href={catalogHref({ sana: sel })}>Barcha {info.free} studiya</TextLink>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-14">
          {shown.map((v) => (
            <VendorCard key={v.slug} v={v} day={sel} />
          ))}
        </div>
      </Container>
    </section>
  );
}
