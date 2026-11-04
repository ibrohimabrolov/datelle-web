"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DEFAULT_DAY, MONTH, catalogHref, dayLabel, eventLabel, fmtSum, vendorBySlug } from "@/data/catalog";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { Container } from "@/components/ui/Primitives";
import { Stepper, type Step } from "@/components/ui/Stepper";

function code(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 1000 + (h % 9000);
}

/* B4 · Soʻrov yuborildi — Figma 246:1494 (bron soʻrovi va individual taklif uchun) */
export function SentView() {
  const sp = useSearchParams();
  const v = vendorBySlug(sp.get("studio") ?? "");
  const n = Number(sp.get("sana"));
  const day = n >= 1 && n <= MONTH.days ? n : DEFAULT_DAY;
  const isBrief = sp.get("turi") === "taklif";

  if (!v) {
    return (
      <Container wide className="flex flex-col items-center gap-6 py-24 text-center">
        <h1 className="t-h2">Soʻrov topilmadi</h1>
        <p className="t-body-m text-ink-2">Havola eskirgan boʻlishi mumkin. Studiyani qaytadan tanlang.</p>
        <Link href={catalogHref()} className={buttonClass("primary", "lg")}>
          Studiyalarni koʻrish
        </Link>
      </Container>
    );
  }

  const pkg = v.packages.find((p) => p.id === sp.get("paket")) ?? v.packages[0];
  const id = `DT-${isBrief ? "R" : "B"}-${code(sp.toString())}`;
  const event = [eventLabel(sp.get("tadbir") ?? "toy"), sp.get("mehmon") && `${sp.get("mehmon")} mehmon`, sp.get("joy")].filter(Boolean).join(" · ");

  const rows: [string, string][] = isBrief
    ? [["Soʻrov raqami", id], ["Sana", dayLabel(day)], ["Tadbir", event], ["Byudjet", `${sp.get("byudjet") ?? "—"}${/mln/.test(sp.get("byudjet") ?? "") ? " soʻm" : ""}`]]
    : [["Soʻrov raqami", id], ["Sana", dayLabel(day)], ["Paket", pkg.title], ["Narx", `${fmtSum(pkg.price)} · zadatok 30%`]];

  const steps: Step[] = isBrief
    ? [
        { title: "Soʻrov yuborildi", sub: "Hozir", state: "done" },
        { title: "Studiya javobi", sub: `Odatda ${v.responseHours} soat · 24 soatdan keyin soʻrov yopiladi`, state: "current" },
        { title: "Taklif va zadatok", sub: "Taklifni qabul qilganingizda", state: "todo" },
        { title: "Sana band qilinadi", sub: "Zadatokdan keyin darhol", state: "todo" },
      ]
    : [
        { title: "Bron soʻrovi yuborildi", sub: "Hozir", state: "done" },
        { title: "Studiya tasdigʻi", sub: "6 soat ichida · 22:00–08:00 hisoblanmaydi", state: "current" },
        { title: "Zadatok toʻlash", sub: "Tasdiqdan keyin · Payme yoki Click", state: "todo" },
        { title: "Sana band · kontaktlar ochiladi", sub: "Zadatokdan keyin darhol", state: "todo" },
      ];

  return (
    <Container wide className="flex flex-col items-center gap-8 pt-16 pb-24 text-center lg:pt-24 lg:pb-32">
      <span className="grid size-16 place-items-center rounded-full bg-brand text-white">
        <Icon name="check" size={28} />
      </span>
      <div className="flex max-w-[720px] flex-col items-center gap-3">
        <h1 className="text-[32px] leading-10 font-bold tracking-[-0.025em] sm:t-h1">Soʻrov {v.name}’ga yuborildi</h1>
        <p className="max-w-[520px] t-body-m text-ink-2 sm:t-body-l">
          {v.name} odatda {v.responseHours} soatda javob beradi. {isBrief ? "Taklif kelganda" : "Tasdiqlaganda"} SMS va Telegram orqali xabar beramiz.
        </p>
      </div>

      <div className="flex w-full max-w-[640px] flex-col gap-5 rounded-3xl border border-line bg-surface p-6 text-left sm:p-7">
        <dl className="flex flex-col gap-3">
          {rows.map(([k, val]) => (
            <div key={k} className="flex items-start justify-between gap-6 t-body-s">
              <dt className="text-ink-3">{k}</dt>
              <dd className="text-right text-ink">{val}</dd>
            </div>
          ))}
        </dl>
        <hr className="border-line" />
        <Stepper steps={steps} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={catalogHref({ sana: day, tur: v.category })} className={buttonClass("secondary", "lg")}>
          Boshqa studiyalarni koʻrish
        </Link>
        <Link href={`/studio/${v.slug}?sana=${day}`} className={buttonClass("primary", "lg")}>
          Studiya sahifasiga qaytish
        </Link>
      </div>
    </Container>
  );
}
