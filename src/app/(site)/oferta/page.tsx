import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { TextPage } from "@/components/content/TextPage";

export const metadata: Metadata = { title: "Ommaviy oferta", description: "Platformadan foydalanish shartlari.", alternates: { canonical: "/oferta" } };

export default function OfertaPage() {
  return (
    <TextPage
      eyebrow="Hujjat"
      title="Ommaviy oferta"
      note="Hujjat loyihasi · ishga tushirishdan oldin yurist tomonidan tasdiqlanadi"
      sections={[
        { h: "Umumiy qoidalar", body: <p>{BRAND.name} mijozlar va tadbir xizmatlari koʻrsatuvchi hamkorlar (studiyalar, floristlar) oʻrtasida bron qilish va toʻlovni tashkil etuvchi platforma hisoblanadi. Platformadan foydalanish ushbu oferta shartlariga rozilikni bildiradi.</p> },
        { h: "Bron va zadatok", body: <p>Bron soʻrovi studiya tomonidan tasdiqlangandan keyin mijoz paket narxining 30% miqdorida zadatok toʻlaydi. Zadatok platforma hisobida saqlanadi va hamkorga ikki qismda oʻtkaziladi: 70% — tasdiqdan keyin, 30% — tadbirdan 48 soat keyin.</p> },
        { h: "Bekor qilish", body: <p>Bekor qilish shartlari studiya tanlagan siyosat (moslashuvchan, oʻrtacha, qatʼiy) boʻyicha qoʻllanadi va toʻlovdan oldin mijozga koʻrsatiladi. Studiya bekor qilganda zadatok 100% qaytariladi.</p> },
        { h: "Nizolar", body: <p>Xizmat sifati boʻyicha eʼtiroz tadbirdan keyin 48 soat ichida bildiriladi. Platforma 72 soat ichida qaror qabul qiladi.</p> },
      ]}
    />
  );
}
