import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { Icon } from "@/components/ui/Icon";
import { Container, Eyebrow, FeatureItem } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: `${BRAND.name} kafolati — studiya kelmasa, zadatok 100% qaytadi`,
  description: "Zadatok qaytarish qoidalari, 24 soatda muqobil studiya va bekor qilish siyosatlari jadvali.",
};

const ROWS = [
  ["30 kun va koʻp", "100%", "100%", "50%"],
  ["14–29 kun", "100%", "50%", "0%"],
  ["7–13 kun", "50%", "0%", "0%"],
  ["7 kundan kam", "0%", "0%", "0%"],
];

/* D2 · Kafolat — Figma 250:2237 */
export default function KafolatPage() {
  return (
    <>
      <Container wide className="flex flex-col items-start gap-6 pt-12 pb-16 lg:py-24">
        <Eyebrow>{BRAND.name} kafolati</Eyebrow>
        <h1 className="lines max-w-[960px] text-[40px] leading-[44px] font-bold tracking-[-0.03em] sm:t-display">
          <span>Studiya kelmasa —</span>
          <span>zadatok 100% qaytadi.</span>
        </h1>
        <p className="max-w-[640px] t-body-m text-ink-2 sm:t-body-l">
          {BRAND.name} orqali toʻlangan har bir bron himoyalangan. Qoidalar quyida.
        </p>
      </Container>

      <Container wide className="pb-16 lg:pb-28">
        <div className="flex flex-col gap-10 md:flex-row">
          <FeatureItem index="01" title="100% qaytarish">
            Studiya bronni bekor qilsa yoki kelmasa, zadatok toʻliq kartangizga qaytadi.
          </FeatureItem>
          <FeatureItem index="02" title="24 soatda muqobil">
            Shu sanaga boʻsh, oʻxshash narxdagi studiyani 24 soat ichida taklif qilamiz.
          </FeatureItem>
          <FeatureItem index="03" title="72 soatda qaror">
            Sifat boʻyicha muammo boʻlsa, studiyaning qolgan toʻlovi toʻxtatiladi va 72 soatda qaror chiqaramiz.
          </FeatureItem>
        </div>
      </Container>

      <Container wide className="pb-16 lg:pb-28">
        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
          {(
            [
              ["Kafolat amal qiladi", "check", "text-brand", ["Studiya “Tekshirilgan” belgisiga ega", `Zadatok ${BRAND.name} orqali (Payme/Click) toʻlangan`, "Nizo tadbirdan keyin 48 soat ichida ochilgan"]],
              ["Kafolat amal qilmaydi", "x", "text-error", ["Studiyaga naqd yoki toʻgʻridan-toʻgʻri toʻlangan summa", "Mijoz tomonidan bekor qilingan bron (siyosat boʻyicha)", "Taklifda yozilmagan elementlar"]],
            ] as const
          ).map(([title, icon, tone, items]) => (
            <div key={title} className="flex flex-1 flex-col gap-4 rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <h2 className="t-h3">{title}</h2>
              <ul className="flex flex-col gap-4">
                {items.map((t) => (
                  <li key={t} className="flex gap-3 t-body-m">
                    <Icon name={icon} className={`mt-0.5 shrink-0 ${tone}`} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      <section id="bekor-qilish" className="scroll-mt-6">
        <Container wide className="flex flex-col gap-8 pb-16 lg:pb-32">
          <div className="flex flex-col items-start gap-3">
            <Eyebrow>Bekor qilish</Eyebrow>
            <h2 className="text-[26px] leading-8 font-semibold tracking-[-0.015em] sm:t-h2">Studiya tanlagan siyosat boʻyicha qaytariladigan zadatok</h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface px-6 py-2 sm:px-8">
            <table className="w-full min-w-[520px] table-fixed text-left">
              <thead>
                <tr className="t-cap-m text-ink-3">
                  {["Tadbirgacha", "Moslashuvchan", "Oʻrtacha", "Qatʼiy"].map((h) => (
                    <th key={h} scope="col" className="py-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r[0]} className="border-t border-line t-body-s">
                    {r.map((c, i) =>
                      i === 0 ? (
                        <th key={i} scope="row" className="py-4 font-normal">
                          {c}
                        </th>
                      ) : (
                        <td key={i} className="py-4 font-semibold">
                          {c}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="t-body-s text-ink-3">
            Bron qilganingizdan keyin 24 soat ichida bekor qilsangiz — 100% qaytadi (tadbirgacha 14 kundan koʻp boʻlsa).
          </p>
        </Container>
      </section>

      <Container wide className="pb-20 lg:pb-32">
        <div className="flex flex-col justify-between gap-5 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex flex-col gap-1">
            <span className="t-title">Savol yoki muammo bormi?</span>
            <span className="t-body-s text-ink-2">Telegram’da yozing — jamoamiz javob beradi.</span>
          </div>
          <a
            href={BRAND.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-[16px] leading-5 font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Telegram’da yozish
          </a>
        </div>
      </Container>
    </>
  );
}
