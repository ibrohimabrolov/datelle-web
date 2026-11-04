import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { TextPage } from "@/components/content/TextPage";

export const metadata: Metadata = { title: `Maxfiylik siyosati — ${BRAND.name}` };

export default function PrivacyPage() {
  return (
    <TextPage
      eyebrow="Hujjat"
      title="Maxfiylik siyosati"
      note="Hujjat loyihasi · ishga tushirishdan oldin yurist tomonidan tasdiqlanadi"
      sections={[
        { h: "Qanday maʼlumot yigʻamiz", body: <p>Ism, telefon raqami, tadbir sanasi va bron tafsilotlari. Toʻlov kartasi maʼlumotlari {BRAND.name} serverlarida saqlanmaydi — ular Payme yoki Click tomonidan qayta ishlanadi.</p> },
        { h: "Nima uchun foydalanamiz", body: <p>Bronni tasdiqlash, studiya bilan bogʻlash, bron holati haqida SMS va Telegram orqali xabar berish uchun.</p> },
        { h: "Kimga beriladi", body: <p>Telefon raqamingiz studiyaga faqat bron tasdiqlangandan keyin ochiladi. Maʼlumotlar uchinchi shaxslarga reklama maqsadida berilmaydi.</p> },
        { h: "Saqlash", body: <p>Fuqarolarning shaxsiy maʼlumotlari Oʻzbekiston Respublikasi hududidagi serverlarda saqlanadi.</p> },
      ]}
    />
  );
}
