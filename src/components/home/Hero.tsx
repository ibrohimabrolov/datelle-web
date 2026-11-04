import Image from "next/image";
import hero from "@/assets/img/hero.jpg";
import { BRAND } from "@/config/brand";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Eyebrow } from "@/components/ui/Primitives";
import { HeroSearch } from "./HeroSearch";

function FloatCard({ icon, tone, title, sub, className }: { icon: IconName; tone: "success" | "accent"; title: string; sub: string; className: string }) {
  return (
    <div
      className={`absolute hidden items-center gap-3 rounded-2xl border border-white/16 bg-[rgba(15,13,10,0.55)] py-3.5 pr-[18px] pl-3.5 backdrop-blur-[12px] xl:flex ${className}`}
    >
      <span className={`grid place-items-center rounded-full p-2 text-white ${tone === "success" ? "bg-success" : "bg-accent"}`}>
        <Icon name={icon} size={16} />
      </span>
      <span className="flex flex-col">
        <span className="t-body-sb text-white">{title}</span>
        <span className="t-cap text-ink-inverse-muted">{sub}</span>
      </span>
    </div>
  );
}

const TRUST: { icon: IconName; text: string }[] = [
  { icon: "check", text: "Tekshirilgan studiyalar" },
  { icon: "clock", text: "Narx toʻlovdan oldin maʼlum" },
  { icon: "shieldCheck", text: `Zadatok ${BRAND.name} kafolati ostida` },
];

export function Hero() {
  return (
    <section className="mx-auto flex max-w-[1440px] flex-col items-center gap-6 px-2 pt-2 pb-10 sm:px-4 lg:gap-7">
      <div className="relative flex min-h-[680px] w-full flex-col items-center gap-6 rounded-3xl px-5 pt-24 pb-6 text-center sm:px-10 lg:h-[800px] lg:px-16 lg:pt-32">
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <Image src={hero} alt="" fill priority placeholder="blur" sizes="100vw" className="object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(13,10,8,0.35) 0%, rgba(13,10,8,0.25) 60%, rgba(13,10,8,0.10) 100%)" }}
          />
        </div>

        <div className="relative flex flex-col items-center gap-6">
          <Eyebrow tone="glass" dot="accent">
            {BRAND.city} · dekor va floristika
          </Eyebrow>
          <h1 className="text-[44px] leading-[48px] font-bold tracking-[-0.035em] text-white sm:t-display-xl">
            <span className="block">Avval sana.</span>
            <span className="block">Keyin dekor.</span>
          </h1>
          <p className="max-w-[560px] t-body-m text-white/78 sm:t-body-l">
            Siz tanlagan kunda boʻsh boʻlgan
            <br className="hidden sm:block" /> tekshirilgan dekor studiyalari va floristlar.
          </p>
        </div>

        <HeroSearch />

        <FloatCard icon="check" tone="success" title="Bron tasdiqlandi" sub="Gulnoza Decor · 12-iyun, juma" className="top-[668px] left-16" />
        <FloatCard icon="shieldCheck" tone="accent" title="Zadatok himoyada" sub="Studiya kelmasa — 100% qaytadi" className="top-[620px] right-16" />
      </div>

      <ul className="flex flex-col items-start gap-3 px-4 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-10">
        {TRUST.map((t) => (
          <li key={t.text} className="flex items-center gap-2 t-body-sm text-ink-2">
            <Icon name={t.icon} size={18} className="text-brand" />
            {t.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
