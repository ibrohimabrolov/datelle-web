import Image from "next/image";
import florist from "@/assets/img/florist.png";
import { ButtonLink, TextLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Primitives";

const FACTS = [
  { k: "0%", v: "oʻz mijozlaringizdan" },
  { k: "10%", v: "faqat katalog bronidan" },
  { k: "48 soat", v: "tekshiruv" },
];

export function VendorCta() {
  return (
    <section className="bg-bg-primary">
      <Container className="pb-20 lg:pb-[120px]">
        <div className="flex flex-col-reverse overflow-hidden rounded-3xl bg-inverse lg:h-[520px] lg:flex-row">
          <div className="flex flex-1 flex-col justify-between gap-10 p-6 sm:p-10 lg:pt-16 lg:pr-12 lg:pb-14 lg:pl-16">
            <div className="flex flex-col items-start gap-5">
              <span className="t-cap-m text-ink-inverse-muted">Hamkorlar uchun</span>
              <h2 className="lines text-[32px] leading-9 font-bold tracking-[-0.025em] text-white sm:t-h1">
                <span>Dekor studiyasi</span>
                <span>yoki floristmisiz?</span>
              </h2>
              <p className="max-w-[480px] t-body-m text-ink-inverse-muted sm:t-body-l">
                Bepul kalendar, Instagram bio uchun bron havolasi va onlayn zadatok.
              </p>
            </div>
            <div className="flex flex-col gap-7">
              <div className="flex flex-wrap gap-x-10 gap-y-4">
                {FACTS.map((f) => (
                  <div key={f.k} className="flex flex-col">
                    <span className="t-h3 text-white">{f.k}</span>
                    <span className="t-body-sm text-ink-inverse-muted">{f.v}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ButtonLink href="/hamkorlar/royxat" variant="secondary" size="lg">
                  Hamkor boʻlish
                </ButtonLink>
                <span className="px-3">
                  <TextLink href="/hamkorlar#qanday" tone="white">
                    Qanday ishlaydi
                  </TextLink>
                </span>
              </div>
            </div>
          </div>
          <div className="relative h-[280px] shrink-0 sm:h-[360px] lg:h-auto lg:w-[560px]">
            <Image src={florist} alt="" fill placeholder="blur" sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
          </div>
        </div>
      </Container>
    </section>
  );
}
