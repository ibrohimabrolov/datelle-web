import Link from "next/link";
import { BRAND } from "@/config/brand";
import { Lockup } from "@/components/ui/Logo";

const COLS = [
  { h: "Mijozlar", links: ["Dekor", "Floristika", "Qanday ishlaydi", "Kafolat"] },
  { h: "Hamkorlar", links: ["Hamkor boʻlish", "Narxlar", "Yordam"] },
  { h: BRAND.name, links: ["Biz haqimizda", "Oferta", "Maxfiylik"] },
];

export function Footer() {
  return (
    <footer className="overflow-hidden border-t border-white/8 bg-inverse text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-4 pt-16 sm:px-8 lg:gap-16 lg:px-20">
        <div className="flex flex-col justify-between gap-12 lg:flex-row">
          <div className="flex flex-col gap-3">
            <Lockup height={32} />
            <p className="t-body-s text-ink-inverse-muted">Toshkentdagi dekor studiyalari va floristlar — sana boʻyicha.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-10 sm:flex sm:gap-24">
            {COLS.map((c) => (
              <div key={c.h} className="flex flex-col gap-1">
                <span className="t-body-sb">{c.h}</span>
                {c.links.map((l) => (
                  <Link key={l} href="#" className="py-2.5 t-body-s text-ink-inverse-muted transition-colors hover:text-white">
                    {l}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-2 t-cap text-ink-inverse-muted sm:flex-row">
          <span>
            © 2026 {BRAND.name} · {BRAND.city}
          </span>
          <span className="flex gap-1">
            <Link href="https://t.me/" className="hover:text-white">Telegram</Link> ·{" "}
            <Link href="https://instagram.com/" className="hover:text-white">Instagram</Link>
          </span>
        </div>
        <div
          aria-hidden
          className="text-center text-[30vw] leading-[0.8] font-semibold tracking-[-0.06em] whitespace-nowrap text-ink-inverse-muted opacity-12 select-none lg:text-[360px]"
        >
          {BRAND.wordmark}
        </div>
      </div>
    </footer>
  );
}
