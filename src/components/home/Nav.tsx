"use client";

import Link from "next/link";
import { useState } from "react";
import { Lockup } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const LINKS = [
  { label: "Dekor", href: "#studiyalar" },
  { label: "Floristika", href: "#studiyalar" },
  { label: "Qanday ishlaydi", href: "#qanday-ishlaydi" },
  { label: "Kafolat", href: "#kafolat" },
];

function LangSwitch() {
  const [lang, setLang] = useState<"UZ" | "RU">("UZ");
  return (
    <div role="radiogroup" aria-label="Til" className="flex rounded-full border border-line bg-surface p-0.5">
      {(["UZ", "RU"] as const).map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={lang === l}
          onClick={() => setLang(l)}
          className={`grid h-10 w-11 place-items-center rounded-full t-cap-m transition-colors ${lang === l ? "bg-surface-subtle text-ink" : "text-ink-2 hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 bg-bg-primary">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-8 lg:px-20 lg:py-5">
        <div className="flex items-center gap-14">
          <Link href="/" aria-label="Bosh sahifa" className="text-brand">
            <Lockup height={30} />
          </Link>
          <nav className="hidden items-center gap-8 lg:flex">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="px-0.5 pt-3 pb-2.5 t-body-sm text-ink-2 transition-colors hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <LangSwitch />
          </div>
          <ButtonLink href="/hamkorlar" variant="secondary" size="md" className="hidden sm:inline-flex">
            Hamkorlar uchun
          </ButtonLink>
          <button
            type="button"
            aria-label="Menyu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="grid size-11 place-items-center rounded-lg border border-line bg-surface lg:hidden"
          >
            <Icon name="menu" />
          </button>
        </div>
      </div>
      {open && (
        <div className="absolute inset-x-0 top-full border-y border-line bg-surface px-4 pb-6 shadow-03 lg:hidden">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="border-b border-line py-4 t-body-mm">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex items-center justify-between sm:hidden">
            <LangSwitch />
            <ButtonLink href="/hamkorlar" variant="secondary" size="md">
              Hamkorlar uchun
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
