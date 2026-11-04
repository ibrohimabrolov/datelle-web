"use client";

import { useState } from "react";
import { DAYS, VENDORS, WEEKDAY_FULL } from "@/data/home";
import { DateTile } from "@/components/ui/DateTile";
import { Icon } from "@/components/ui/Icon";
import { TextLink } from "@/components/ui/Button";
import { Container, Eyebrow } from "@/components/ui/Primitives";
import { VendorCard } from "@/components/ui/VendorCard";

export function Results() {
  const [sel, setSel] = useState(4); // 12-iyun, juma
  const day = DAYS[sel];
  const dateLabel = `${day.d}-iyun`;
  const shown = VENDORS.slice(0, Math.min(VENDORS.length, Math.max(day.free, 1)));

  return (
    <section id="studiyalar" className="scroll-mt-6 bg-bg-primary">
      <Container className="flex flex-col gap-10 pb-20 lg:pb-32">
        {/* Date picker */}
        <div className="flex flex-col gap-6 rounded-3xl border border-line bg-surface px-4 pt-5 pb-6 shadow-02 sm:px-8 sm:pt-7 sm:pb-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="lines t-title">Yaqin kunlarda boʻsh studiyalar</h2>
            <div className="flex items-center gap-3">
              <span className="hidden t-body-sb sm:inline">Iyun 2026</span>
              {(["chevronLeft", "chevronRight"] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={n === "chevronLeft" ? "Oldingi kunlar" : "Keyingi kunlar"}
                  className="hidden size-11 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-surface-subtle sm:grid"
                >
                  <Icon name={n} />
                </button>
              ))}
            </div>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {DAYS.map((d, i) => (
              <div key={`${d.wd}${d.d}`} className="flex flex-1 snap-start">
                <DateTile day={d} selected={i === sel} onSelect={() => setSel(i)} />
              </div>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-4">
            <Eyebrow>
              {dateLabel}, {WEEKDAY_FULL[day.wd]} · {day.free} ta boʻsh
            </Eyebrow>
            <h2 className="lines text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">Shu kuni boʻsh dekor studiyalari</h2>
          </div>
          <TextLink href="/studiyalar">Barcha {day.free} studiya</TextLink>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-14">
          {shown.map((v) => (
            <VendorCard key={v.slug} v={v} dateLabel={dateLabel} />
          ))}
        </div>
      </Container>
    </section>
  );
}
