import { Hero } from "@/components/landing/Hero";
import { Compare, Features, Footer, Marquee, Partners, Pricing, Product, Questions, Stats, Steps } from "@/components/landing/Sections";
import { StickyHeader } from "@/components/landing/StickyHeader";

/* /biznes — Datelle Studio landing for studio owners (Figma XNmqL3kbnh0lPpzO6ZQKUR · 🌐 Landing · 299:2859). */
export default function BiznesPage() {
  return (
    <>
      <StickyHeader />
      <Hero />
      <main>
        <Stats />
        <Compare />
        <Product />
        <Features />
        <Steps />
        <Pricing />
        <Partners />
        <Questions />
        <Marquee />
      </main>
      <Footer />
    </>
  );
}
