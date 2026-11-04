import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { TextPage } from "@/components/content/TextPage";

export const metadata: Metadata = { title: "Yordam", description: "Bron, zadatok va hamkorlik boʻyicha javoblar.", alternates: { canonical: "/yordam" } };

const a = "font-semibold text-brand hover:underline";

export default function HelpPage() {
  return (
    <TextPage
      eyebrow="Yordam"
      title="Qanday yordam bera olamiz?"
      lead="Koʻp soʻraladigan savollar shu yerda. Javob topilmasa — Telegram’da yozing."
      sections={[
        {
          h: "Mijozlar uchun",
          body: (
            <>
              <p>Bron qanday ishlashi, zadatok va bekor qilish shartlari —{" "}<Link href="/#qanday-ishlaydi" className={a}>Qanday ishlaydi</Link> va <Link href="/kafolat" className={a}>Kafolat</Link> sahifalarida.</p>
              <p>Studiya 6 soat ichida tasdiqlamasa, zadatok avtomatik qaytadi — hech narsa qilishingiz shart emas.</p>
            </>
          ),
        },
        {
          h: "Hamkorlar uchun",
          body: (
            <>
              <p>Toʻlovlar, komissiya va profil boʻyicha javoblar —{" "}<Link href="/hamkorlar" className={a}>hamkorlar sahifasida</Link>.</p>
              <p>Ariza yuborish: <Link href="/hamkorlar/royxat" className={a}>Hamkor boʻlish</Link>.</p>
            </>
          ),
        },
        {
          h: "Bogʻlanish",
          body: (
            <p>
              Telegram: <a href={BRAND.telegramUrl} target="_blank" rel="noopener noreferrer" className={a}>{BRAND.telegramUrl.replace("https://", "")}</a> — har kuni 09:00–21:00.
            </p>
          ),
        },
      ]}
    />
  );
}
