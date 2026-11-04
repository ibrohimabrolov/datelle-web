"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "./Icon";
import { fmtSum, type Vendor } from "@/data/home";

/* Vendor card — Figma "Vendor card" (image 304 · r20 · Save 44) */
export function VendorCard({ v, dateLabel }: { v: Vendor; dateLabel: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="group flex flex-col gap-4">
      <div className="relative h-[260px] overflow-hidden rounded-2xl sm:h-[304px]">
        <Link href={`/studio/${v.slug}`} aria-label={v.name} className="absolute inset-0">
          <Image
            src={v.img}
            alt=""
            fill
            sizes="(min-width: 1024px) 379px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.03]"
            placeholder="blur"
          />
        </Link>
        <button
          type="button"
          aria-label={saved ? "Saqlanganlardan olib tashlash" : "Saqlash"}
          aria-pressed={saved}
          onClick={() => setSaved((s) => !s)}
          className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white text-ink shadow-01 transition-transform active:scale-95"
        >
          <Icon name="heart" size={20} className={saved ? "fill-error text-error" : ""} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/studio/${v.slug}`} className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate t-title">{v.name}</h3>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-label="Tekshirilgan" className="shrink-0 text-brand">
              <path d="M3.33333 8.33317L6.33333 11.3332L12.6667 4.6665" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="flex shrink-0 items-center gap-1 t-body-sm">
            <Icon name="star" size={16} className="text-accent" />
            {v.rating.toFixed(1)} ({v.reviews})
          </span>
        </div>
        <span className="flex items-center gap-1 t-body-s text-ink-3">
          <Icon name="mapPin" size={16} />
          {v.category} · {v.district}
        </span>
        <div className="flex items-center justify-between pt-1">
          <span className="t-body-sb">{fmtSum(v.priceFrom)}dan</span>
          <span className="flex items-center gap-1.5 t-cap-m text-brand">
            <span className="size-2 rounded-full bg-brand" />
            {dateLabel} boʻsh
          </span>
        </div>
      </div>
    </article>
  );
}
