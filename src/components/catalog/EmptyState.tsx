"use client";

import { useState } from "react";
import { MONTH, WD_SHORT, countFor, weekdayIdx, type Filters } from "@/data/catalog";
import { DateTile } from "@/components/ui/DateTile";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PhoneField, isPhoneValid } from "@/components/ui/Form";
import { Container } from "@/components/ui/Primitives";

/* A3 · Katalog — natija yoʻq (Figma 245:934) */
export function EmptyState({ f, districtName, onChange }: { f: Filters; districtName: string; onChange: (p: Partial<Filters>) => void }) {
  const noun = f.tur === "dekor" ? "studiya" : "florist";
  const nouns = f.tur === "dekor" ? "studiyalar" : "floristlar";

  const nearby = [-3, -2, -1, 1, 2, 3, 4, 5]
    .map((o) => f.sana + o)
    .filter((d) => d >= 1 && d <= MONTH.days)
    .map((d) => ({ d, n: countFor(f, d) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => Math.abs(a.d - f.sana) - Math.abs(b.d - f.sana))
    .slice(0, 4)
    .sort((a, b) => a.d - b.d);

  const where = f.tuman === "all" ? "Toshkentda" : `${districtName} tumanida`;

  return (
    <Container wide className="flex flex-col items-center gap-10 pt-16 pb-24 text-center lg:pt-24 lg:pb-32">
      <span className="grid size-16 place-items-center rounded-full bg-brand-subtle text-brand">
        <Icon name="calendar" size={28} />
      </span>
      <div className="flex max-w-[640px] flex-col items-center gap-3">
        <h1 className="text-[26px] leading-8 font-semibold tracking-[-0.015em] sm:t-h2">
          {f.sana}-iyun kuni bu filtrlarga mos {noun} yoʻq
        </h1>
        <p className="t-body-m text-ink-2 sm:t-body-l">
          {nearby.length
            ? `Yaqin kunlarda ${where} boʻsh ${nouns} bor. Sanani almashtiring yoki filtrlarni kengaytiring.`
            : "Yaqin kunlarda ham mos variant yoʻq. Filtrlarni kengaytiring yoki raqamingizni qoldiring — biz topib beramiz."}
        </p>
      </div>

      {nearby.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {nearby.map(({ d, n }) => (
            <div key={d} className="w-[96px] sm:w-[112px]">
              <DateTile
                day={{ wd: WD_SHORT[weekdayIdx(d)], d, free: n }}
                note={`${n} boʻsh`}
                onSelect={() => onChange({ sana: d })}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {f.tuman !== "all" && (
          <Button variant="ghost" size="lg" onClick={() => onChange({ tuman: "all" })}>
            Butun Toshkent boʻyicha
          </Button>
        )}
        <Button variant="secondary" size="lg" onClick={() => onChange({ tadbir: "all", tuman: "all", byudjet: 0, chips: [] })}>
          Filtrlarni tozalash
        </Button>
      </div>

      <Concierge day={f.sana} noun={noun} />
    </Container>
  );
}

function Concierge({ day, noun }: { day: number; noun: string }) {
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string>();
  const [sent, setSent] = useState(false);

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-surface px-6 pt-7 pb-8 text-left sm:px-8">
      <h2 className="t-title">Biz topib beramiz</h2>
      {sent ? (
        <p className="flex items-center gap-2 t-body-s text-success-subtle-text">
          <Icon name="check" size={18} /> Qabul qilindi. {day}-iyunga mos {noun} topilsa, 24 soat ichida qoʻngʻiroq qilamiz.
        </p>
      ) : (
        <>
          <p className="t-body-s text-ink-2">
            Raqamingizni qoldiring — {day}-iyunga mos {noun} topilsa, 24 soat ichida qoʻngʻiroq qilamiz.
          </p>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-start"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isPhoneValid(phone)) return setErr("Raqamni toʻliq kiriting");
              setSent(true);
            }}
          >
            <PhoneField value={phone} onChange={(v) => (setPhone(v), setErr(undefined))} error={err} className="flex-1" />
            <Button type="submit" size="lg" className="sm:mt-[26px]">
              Soʻrov qoldirish
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
