import Image from "next/image";
import Link from "next/link";
import hero from "@/assets/img/hero.png";
import { BRAND } from "@/config/brand";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Eyebrow } from "@/components/ui/Primitives";

function Field({ icon, label, value, active }: { icon: IconName; label: string; value: string; active?: boolean }) {
  return (
    <Link
      href="#studiyalar"
      className={`flex min-w-0 flex-1 items-center gap-3 rounded-full px-5 py-3 transition-colors ${active ? "bg-brand-subtle" : "hover:bg-surface-subtle"}`}
    >
      <Icon name={icon} className={active ? "shrink-0 text-brand" : "shrink-0 text-ink-2"} />
      <span className="flex min-w-0 flex-col text-left">
        <span className={`t-cap-m ${active ? "text-brand" : "text-ink-3"}`}>{label}</span>
        <span className="truncate t-body-mm text-ink">{value}</span>
      </span>
    </Link>
  );
}

const Divider = () => <span className="hidden h-8 w-px shrink-0 bg-line md:block" />;

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
      <div className="relative flex min-h-[680px] w-full flex-col items-center gap-6 overflow-hidden rounded-3xl px-5 pt-24 pb-6 text-center sm:px-10 lg:h-[800px] lg:px-16 lg:pt-32">
        <Image src={hero} alt="" fill priority placeholder="blur" sizes="100vw" className="-z-0 object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(13,10,8,0.35) 0%, rgba(13,10,8,0.25) 60%, rgba(13,10,8,0.10) 100%)" }}
        />

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

        <form
          action="#studiyalar"
          className="relative mt-4 flex md:mt-10 w-full max-w-[980px] flex-col gap-1 rounded-[28px] bg-surface p-2 text-left shadow-04 md:flex-row md:items-center md:rounded-full"
        >
          <Field icon="calendar" label="1 · Sana" value="12-iyun, juma" active />
          <Divider />
          <Field icon="sparkle" label="Tadbir turi" value="Toʻy" />
          <Divider />
          <Field icon="mapPin" label="Tuman" value="Butun Toshkent" />
          <button
            type="submit"
            className="mt-1 inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-6 text-[16px] leading-5 font-semibold text-white transition-colors hover:bg-brand-hover active:bg-brand-pressed md:mt-0 md:h-16"
          >
            Studiyalarni koʻrish
            <Icon name="arrowRight" />
          </button>
        </form>

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
