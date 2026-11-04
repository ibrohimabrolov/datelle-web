"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

/* H5 · Galereya — lightbox */
export function Lightbox({
  images,
  index,
  onIndex,
  onClose,
  title,
}: {
  images: StaticImageData[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  title: string;
}) {
  const n = images.length;
  const go = (d: number) => onIndex((index + d + n) % n);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % n);
      if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, n, onClose, onIndex]);

  const btn = "grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20";
  return (
    <div role="dialog" aria-modal aria-label={`${title} — galereya`} className="fixed inset-0 z-[60] flex flex-col bg-[rgba(10,8,5,0.92)]">
      <div className="flex items-center justify-between px-4 py-4 text-white sm:px-8">
        <span className="t-body-sb">{title}</span>
        <span className="t-body-s text-white/70">
          {index + 1} / {n}
        </span>
        <button type="button" aria-label="Yopish" onClick={onClose} className={btn}>
          <Icon name="x" />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-6 sm:px-20">
        <div className="relative h-full w-full max-w-[1200px]">
          <Image src={images[index]} alt={`${title} — ${index + 1}`} fill sizes="100vw" className="object-contain" placeholder="blur" />
        </div>
        <button type="button" aria-label="Oldingi foto" onClick={() => go(-1)} className={`${btn} absolute left-4 sm:left-8`}>
          <Icon name="chevronLeft" />
        </button>
        <button type="button" aria-label="Keyingi foto" onClick={() => go(1)} className={`${btn} absolute right-4 sm:right-8`}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-6">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}-foto`}
            onClick={() => onIndex(i)}
            className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-opacity ${i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-100"}`}
          >
            <Image src={img} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
