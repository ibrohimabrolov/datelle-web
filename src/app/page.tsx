import { Nav } from "@/components/home/Nav";
import { Hero } from "@/components/home/Hero";
import { Signature } from "@/components/home/Signature";
import { Results } from "@/components/home/Results";
import { HowItWorks } from "@/components/home/HowItWorks";
import { WhyBento } from "@/components/home/WhyBento";
import { EventTypes } from "@/components/home/EventTypes";
import { Guarantee } from "@/components/home/Guarantee";
import { Faq } from "@/components/home/Faq";
import { VendorCta } from "@/components/home/VendorCta";
import { Footer } from "@/components/home/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Signature />
        <Results />
        <HowItWorks />
        <WhyBento />
        <EventTypes />
        <Guarantee />
        <Faq />
        <VendorCta />
      </main>
      <Footer />
    </>
  );
}
