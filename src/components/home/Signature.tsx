import hero from "@/assets/img/hero.png";
import { BRAND } from "@/config/brand";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Primitives";

export function Signature() {
  return (
    <section className="bg-bg-primary">
      <Container className="flex flex-col items-start gap-8 py-16 lg:flex-row lg:items-center lg:gap-[72px] lg:py-24">
        <span
          aria-hidden
          className="shrink-0 bg-clip-text lg:w-[482px] text-[220px] leading-[180px] font-bold tracking-[-0.07em] text-transparent select-none lg:text-[460px] lg:leading-[380px]"
          style={{
            backgroundImage: `url(${hero.src})`,
            backgroundSize: "238.1% 181.82%",
            backgroundPosition: "51.72% 88.89%",
            WebkitBackgroundClip: "text",
          }}
        >
          12
        </span>
        <div className="flex max-w-[640px] flex-col items-start gap-5">
          <span className="t-cap-m text-brand">12-iyun, juma · 34 ta boʻsh studiya</span>
          <h2 className="lines text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">
            <span>Hammasi sanadan</span>
            <span>boshlanadi.</span>
          </h2>
          <p className="t-body-m text-ink-2 sm:t-body-l">
            Kunni tanlang — {BRAND.name} faqat shu kuni boʻsh studiyalarni koʻrsatadi. Band studiyaga yozib, javob kutish yoʻq.
          </p>
          <ButtonLink href="#studiyalar" variant="secondary" size="lg" className="mt-7">
            Boshqa kunni tanlash
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
