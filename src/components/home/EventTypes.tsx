import Image from "next/image";
import Link from "next/link";
import { EVENTS } from "@/data/home";
import { catalogHref } from "@/data/catalog";
import { TextLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Primitives";

export function EventTypes() {
  return (
    <section className="bg-bg-primary">
      <Container className="flex flex-col gap-10 pb-20 lg:gap-14 lg:pb-[120px]">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="lines text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">
            <span>Har bir tadbir uchun</span>
            <span>oʻz ustasi.</span>
          </h2>
          <TextLink href={catalogHref()}>Barcha studiyalar</TextLink>
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {EVENTS.map((e) => (
            <Link
              key={e.label}
              href={catalogHref({ tadbir: e.slug })}
              className="group relative flex h-[320px] min-w-[220px] flex-1 snap-start items-end overflow-hidden rounded-2xl p-4 lg:h-[360px] lg:min-w-0"
            >
              <Image
                src={e.img}
                alt=""
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 228px, 60vw"
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.04]"
              />
              <span className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 45%, rgba(10,8,5,0.35) 100%)" }} />
              <span className="relative rounded-full bg-white px-3.5 py-2 t-body-sm text-ink">{e.label}</span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
