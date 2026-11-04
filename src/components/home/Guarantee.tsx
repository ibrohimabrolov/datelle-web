import { BRAND } from "@/config/brand";
import { TextLink } from "@/components/ui/Button";
import { Container, Eyebrow } from "@/components/ui/Primitives";

const STATS = [
  { k: "100%", v: "zadatok qaytadi — studiya bekor qilsa yoki kelmasa" },
  { k: "24 soat", v: "ichida muqobil studiya taklif qilamiz" },
  { k: "48 soat", v: "tadbirdan keyin muammo haqida xabar berish uchun" },
];

export function Guarantee() {
  return (
    <section id="kafolat" className="scroll-mt-6 bg-inverse text-white">
      <Container className="flex flex-col gap-12 py-20 lg:gap-16 lg:py-32">
        <div className="flex flex-col items-start gap-7">
          <Eyebrow tone="dark">{BRAND.name} kafolati</Eyebrow>
          <h2 className="lines text-[36px] leading-10 font-bold tracking-[-0.03em] sm:t-display">
            <span>Studiya kelmasa —</span>
            <span>zadatok 100% qaytadi.</span>
            <span>Muqobilni esa biz topamiz.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.k} className="flex flex-col gap-2 border-t border-white/16 pt-6">
              <span className="text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">{s.k}</span>
              <span className="t-body-m text-ink-inverse-muted">{s.v}</span>
            </div>
          ))}
        </div>
        <div className="-my-3">
          <TextLink href="/kafolat" tone="white">
            Kafolat shartlari
          </TextLink>
        </div>
      </Container>
    </section>
  );
}
