"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "./Icon";
import { useSaved } from "./useSaved";
import { dayShort, fmtSum, type VendorHit } from "@/data/catalog";
import { imageFor } from "@/data/images";

/* Vendor card — Figma 239:68 (image 304 · r20 · Save 44) */
export function VendorCard({ v, day, priority }: { v: VendorHit; day?: string; priority?: boolean }) {
  const [saved, toggle] = useSaved(v.slug);
  const status = v.status;
  const href = day ? `/studio/${v.slug}?sana=${day}` : `/studio/${v.slug}`;
  const label = !day ? "" : status === "few" ? `${dayShort(day)} · 1 joy qoldi` : `${dayShort(day)} boʻsh`;

  return (
    <article className="group flex flex-col gap-4">
      <div className="relative h-[260px] overflow-hidden rounded-2xl sm:h-[304px]">
        <Link href={href} aria-label={v.name} className="absolute inset-0">
          <Image
            src={imageFor(v.imageKey)}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 405px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.03]"
            placeholder="blur"
          />
        </Link>
        <button
          type="button"
          aria-label={saved ? "Saqlanganlardan olib tashlash" : "Saqlash"}
          aria-pressed={saved}
          onClick={toggle}
          className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white text-ink shadow-01 transition-transform active:scale-95"
        >
          <Icon name="heart" size={20} className={saved ? "fill-error text-error" : ""} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <Link href={href} className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate t-title">{v.name}</h3>
            {v.verified && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-label="Tekshirilgan" className="shrink-0 text-brand">
                <path d="M3.33333 8.33317L6.33333 11.3332L12.6667 4.6665" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </Link>
          <span className="flex shrink-0 items-center gap-1 t-body-sm">
            <Icon name="star" size={16} className="text-accent" />
            {v.rating.toFixed(1)} ({v.reviews})
          </span>
        </div>
        <span className="flex items-center gap-1.5 t-body-s text-ink-3">
          <Icon name="mapPin" size={16} />
          {v.category === "dekor" ? "Dekor" : "Floristika"} · {v.district}
        </span>
        <div className="flex items-center justify-between pt-1">
          <span className="t-body-sb">{fmtSum(v.priceFrom)}dan</span>
          {day && status !== "busy" && (
            <span className="flex items-center gap-1.5 t-cap-m text-brand">
              <span className="size-2 rounded-full bg-brand" />
              {label}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function VendorCardSkeleton() {
  const bar = "animate-pulse rounded-lg bg-surface-subtle";
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className={`h-[260px] rounded-2xl sm:h-[304px] ${bar}`} />
      <div className={`h-5 w-2/3 ${bar}`} />
      <div className={`h-4 w-1/2 ${bar}`} />
      <div className={`h-4 w-1/3 ${bar}`} />
    </div>
  );
}
