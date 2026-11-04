import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { TextPage } from "@/components/content/TextPage";

export const metadata: Metadata = { title: "Biz haqimizda", description: "Tadbir sanasidan boshlanadigan dekor marketplace.", alternates: { canonical: "/biz-haqimizda" } };

export default function AboutPage() {
  return (
    <TextPage
      eyebrow="Biz haqimizda"
      title="Tadbir sanasidan boshlanadigan marketplace."
      lead={`${BRAND.name} — Toshkentdagi dekor studiyalari va floristlarni sana boʻyicha topish va onlayn bron qilish xizmati.`}
      sections={[
        {
          h: "Nega paydo boʻldik",
          body: (
            <p>
              Dekor studiyasi qidirish odatda Instagram’dagi oʻnlab Direct xabarlardan iborat: narx soʻraysiz, kutasiz, keyin oʻsha kuni band ekanini bilasiz.
              Biz tartibni almashtirdik — avval sana, keyin faqat shu kuni boʻsh studiyalar.
            </p>
          ),
        },
        {
          h: "Qanday ishlaymiz",
          body: (
            <p>
              Har bir studiya kalendarini shu yerda yuritadi, paket narxlari ochiq koʻrinadi. Zadatok {BRAND.name} orqali toʻlanadi va{" "}
              <Link href="/kafolat" className="font-semibold text-brand hover:underline">kafolat</Link> ostida turadi.
            </p>
          ),
        },
        {
          h: "Hamkorlar",
          body: (
            <p>
              Studiyalar va floristlar uchun kalendar va bron havolasi bepul. Batafsil —{" "}
              <Link href="/hamkorlar" className="font-semibold text-brand hover:underline">hamkorlar sahifasida</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
