import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { DEFAULT_DAY, vendorBySlug } from "@/data/catalog";
import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { Container, Eyebrow, FeatureItem } from "@/components/ui/Primitives";
import { VendorCard } from "@/components/ui/VendorCard";

export const metadata: Metadata = {
  title: "Hamkorlar uchun",
  alternates: { canonical: "/hamkorlar" },
  description: "Bepul kalendar, Instagram bio uchun bron havolasi va onlayn zadatok. Oʻz mijozlaringizdan 0% komissiya.",
};

const FAQ = [
  { q: "Pul qachon tushadi?", a: "Zadatokning 70% bron tasdiqlangandan keyin 1–3 ish kunida, qolgan 30% tadbirdan keyin 48 soat ichida (nizo boʻlmasa)." },
  { q: "Mijoz bekor qilsa nima boʻladi?", a: "Siz tanlagan bekor qilish siyosati ishlaydi — moslashuvchan, oʻrtacha yoki qatʼiy. Mijozga qaytmaydigan qism sizda qoladi." },
  { q: "Komissiya qachon olinadi?", a: "Faqat katalog orqali kelgan bronlardan — 10%, zadatokdan ushlanadi. Oʻz havolangiz yoki QR orqali kelgan bronlardan komissiya yoʻq." },
  { q: "Profilni kim toʻldiradi?", a: "Oʻzingiz 15 daqiqada toʻldirasiz. Birinchi 30 hamkor uchun portfolio, paketlar va narxlarni jamoamiz toʻldirib beradi — siz faqat tekshirasiz." },
  { q: "Kuniga bir nechta tadbirga chiqsam-chi?", a: "Kalendarda kunlik limitni belgilaysiz, masalan 3 ta tadbir. Limit toʻlguncha kun mijozlarga boʻsh koʻrinadi, oxirgi joyda “1 joy qoldi” belgisi chiqadi." },
];

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-[26px] leading-8 font-semibold tracking-[-0.015em] sm:t-h2">{title}</h2>
    </div>
  );
}

/* D1 · Vendorlar uchun — Figma 250:2002 */
export default function HamkorlarPage() {
  const gulnoza = vendorBySlug("gulnoza-decor")!;
  return (
    <>
      <Container wide className="flex flex-col gap-12 pt-12 pb-20 lg:flex-row lg:items-center lg:gap-20 lg:pt-24 lg:pb-32">
        <div className="flex flex-1 flex-col items-start gap-6">
          <Eyebrow>Hamkorlar uchun</Eyebrow>
          <h1 className="lines text-[40px] leading-[44px] font-bold tracking-[-0.03em] sm:t-display">
            <span>Kalendaringiz —</span>
            <span>endi bron sahifangiz.</span>
          </h1>
          <p className="max-w-[560px] t-body-m text-ink-2 sm:t-body-l">
            Bepul kalendar, Instagram bio uchun havola va onlayn zadatok. Oʻz mijozlaringizdan 0% komissiya.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/hamkorlar/royxat">Bepul roʻyxatdan oʻtish</ButtonLink>
            <ButtonLink href="#qanday" variant="ghost">
              Qanday ishlaydi
            </ButtonLink>
          </div>
          <p className="t-cap text-ink-3">Tekshiruv 48 soat ichida · YaTT, MChJ yoki oʻzini oʻzi band qilgan</p>
        </div>
        <div className="flex w-full flex-col gap-4 sm:w-[405px] sm:shrink-0">
          <div className="flex w-fit items-center gap-2 rounded-full bg-brand-subtle px-4 py-2.5 text-brand-subtle-text">
            <span className="t-body-sb">
              {BRAND.domain}/v/{gulnoza.slug}
            </span>
            <span className="t-cap">· Instagram bio</span>
          </div>
          <VendorCard v={gulnoza} day={DEFAULT_DAY} />
        </div>
      </Container>

      <Container wide className="flex flex-col gap-12 pb-20 lg:pb-32">
        <Heading eyebrow="Nima olasiz" title="Daftar va Direct oʻrniga — bitta tizim" />
        <div className="flex flex-col gap-10 md:flex-row">
          <FeatureItem index="01" title="Bepul kalendar">
            Band kunlarni bir joyda yuriting. Oflayn bronni Telegram botda bitta tugma bilan belgilang.
          </FeatureItem>
          <FeatureItem index="02" title="Bron havolasi">
            Instagram bio’ga qoʻying — mijoz sanani tanlab, darhol soʻrov yuboradi.
          </FeatureItem>
          <FeatureItem index="03" title="Zadatok ikki qismda">
            70% — tasdiqdan keyin 1–3 ish kunida, 30% — tadbirdan 48 soat keyin.
          </FeatureItem>
        </div>
      </Container>

      <section id="qanday" className="scroll-mt-6">
        <Container wide className="flex flex-col gap-12 pb-20 lg:pb-32">
          <Heading eyebrow="Qanday boshlanadi" title="4 qadam, 2 kun" />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureItem index="1" title="Roʻyxatdan oʻting">Telegram bot orqali 3 daqiqa.</FeatureItem>
            <FeatureItem index="2" title="Profil va paketlar">Birinchi 30 hamkorga biz toʻldirib beramiz.</FeatureItem>
            <FeatureItem index="3" title="Havolani ulashing">Instagram bio va Telegram kanalga.</FeatureItem>
            <FeatureItem index="4" title="Soʻrovlarni qabul qiling">Botda: Tasdiqlash yoki Taklif yuborish.</FeatureItem>
          </div>
        </Container>
      </section>

      <section id="narx" className="scroll-mt-6">
        <Container wide className="flex flex-col gap-12 pb-20 lg:pb-32">
          <Heading eyebrow="Narx" title="Obuna yoʻq. Faqat natija uchun." />
          <div className="flex flex-col gap-6 md:flex-row md:gap-10">
            <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-line bg-surface p-8">
              <span className="t-title">Oʻz mijozlaringiz</span>
              <span className="t-h1">0%</span>
              <p className="t-body-m text-ink-2">Bron havolasi yoki QR orqali kelgan bronlardan. Faqat toʻlov tizimi komissiyasi.</p>
            </div>
            <div className="flex flex-1 flex-col gap-3 rounded-2xl border-[1.5px] border-brand bg-surface p-8">
              <span className="t-title">{BRAND.name} mijozlari</span>
              <span className="t-h1 text-brand">10%</span>
              <p className="t-body-m text-ink-2">Katalog orqali kelgan bronlardan. Zadatokdan ushlanadi — alohida toʻlov yoʻq.</p>
            </div>
          </div>
          <p className="t-body-s text-ink-3">Profil va kalendar bepul.</p>
        </Container>
      </section>

      <Container wide className="flex flex-col gap-10 pb-20 lg:flex-row lg:items-center lg:gap-20 lg:pb-32">
        <div className="flex flex-1 flex-col items-start gap-4">
          <Eyebrow>Telegram bot</Eyebrow>
          <h2 className="text-[26px] leading-8 font-semibold tracking-[-0.015em] sm:t-h2">Yangi ilova oʻrnatish shart emas</h2>
          <p className="t-body-m text-ink-2 sm:t-body-l">
            Har bir soʻrov va bron botga keladi. Tasdiqlash, rad etish yoki kunni band qilish — bitta tugma.
          </p>
        </div>
        <figure aria-label="Bot xabari namunasi" className="flex w-full flex-col gap-3.5 rounded-2xl border border-line bg-surface px-6 py-5 lg:w-[480px] lg:shrink-0">
          <span className="t-cap-m text-ink-3">{BRAND.name} Hamkor · bot</span>
          <span className="t-body-sb">Yangi bron — tasdiq kutilmoqda</span>
          <span className="t-body-s text-ink-2">12-iyun, juma · Toʻy</span>
          <span className="t-body-s text-ink-2">Toʻy dasturxoni bezagi — Standart</span>
          <span className="t-body-s text-ink-2">Zadatok toʻlandi: 900 000 soʻm</span>
          <span className="t-body-s text-ink-2">Tasdiqlash uchun: 5 soat 42 daqiqa</span>
          <div aria-hidden className="flex gap-2">
            <span className="flex h-11 flex-1 items-center justify-center rounded-lg bg-brand text-[14px] font-semibold text-white">Tasdiqlash</span>
            <span className="flex h-11 flex-1 items-center justify-center rounded-lg border border-line text-[14px] font-semibold">Rad etish</span>
          </div>
        </figure>
      </Container>

      <Container wide className="flex flex-col gap-8 pb-20 lg:pb-32">
        <Heading eyebrow="Savollar" title="Koʻp soʻraladigan savollar" />
        <Accordion items={FAQ} />
      </Container>

      <section className="bg-inverse text-white">
        <Container wide className="flex flex-col items-start gap-6 py-20 lg:py-24">
          <h2 className="max-w-[900px] text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">Birinchi 30 hamkor uchun profilni biz toʻldiramiz.</h2>
          <p className="max-w-[640px] t-body-m sm:t-body-l">Portfolio, paketlar va narxlarni birga tuzamiz — siz faqat tekshirasiz.</p>
          <ButtonLink href="/hamkorlar/royxat" variant="secondary">
            Bepul roʻyxatdan oʻtish
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}
