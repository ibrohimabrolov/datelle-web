"use client";

import { useState } from "react";
import { dayShort, type Filters } from "@/data/catalog";
import { addDays, dayNum, diffDays, isBookable, wdShort } from "@/lib/dates";
import { ApiError, api } from "@/lib/api";
import { useCounts } from "@/lib/catalogClient";
import { DateTile } from "@/components/ui/DateTile";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PhoneField, isPhoneValid } from "@/components/ui/Form";
import { Container } from "@/components/ui/Primitives";

/* A3 · Katalog — natija yoʻq (Figma 245:934) */
export function EmptyState({ f, today, districtName, onChange }: { f: Filters; today: string; districtName: string; onChange: (p: Partial<Filters>) => void }) {
  const noun = f.tur === "dekor" ? "studiya" : "florist";
  const nouns = f.tur === "dekor" ? "studiyalar" : "floristlar";

  const { counts } = useCounts(f, addDays(f.sana, -3), 9);
  const nearby = [...(counts ?? new Map<string, number>()).entries()]
    .filter(([d, n]) => n > 0 && d !== f.sana && isBookable(d, today))
    .sort((a, b) => Math.abs(diffDays(a[0], f.sana)) - Math.abs(diffDays(b[0], f.sana)))
    .slice(0, 4)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([d, n]) => ({ d, n }));

  const where = f.tuman === "all" ? "Toshkentda" : `${districtName} tumanida`;

  return (
    <Container wide className="flex flex-col items-center gap-10 pt-16 pb-24 text-center lg:pt-24 lg:pb-32">
      <span className="grid size-16 place-items-center rounded-full bg-brand-subtle text-brand">
        <Icon name="calendar" size={28} />
      </span>
      <div className="flex max-w-[640px] flex-col items-center gap-3">
        <h1 className="text-[26px] leading-8 font-semibold tracking-[-0.015em] sm:t-h2">
          {dayShort(f.sana)} kuni bu filtrlarga mos {noun} yoʻq
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
                day={{ wd: wdShort(d), d: dayNum(d), free: n }}
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

      <Concierge f={f} noun={noun} />
    </Container>
  );
}

function Concierge({ f, noun }: { f: Filters; noun: string }) {
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string>();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid(phone)) return setErr("Raqamni toʻliq kiriting");
    setState("sending");
    try {
      await api("/api/leads", { body: { phone, date: f.sana, context: { tur: f.tur, tadbir: f.tadbir, tuman: f.tuman, byudjet: f.byudjet } } });
      setState("sent");
    } catch (e) {
      setErr((e as ApiError).fields?.phone ?? (e as ApiError).message);
      setState("idle");
    }
  };

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-surface px-6 pt-7 pb-8 text-left sm:px-8">
      <h2 className="t-title">Biz topib beramiz</h2>
      {state === "sent" ? (
        <p role="status" className="flex items-center gap-2 t-body-s text-success-subtle-text">
          <Icon name="check" size={18} /> Qabul qilindi. {dayShort(f.sana)}ga mos {noun} topilsa, 24 soat ichida qoʻngʻiroq qilamiz.
        </p>
      ) : (
        <>
          <p className="t-body-s text-ink-2">
            Raqamingizni qoldiring — {dayShort(f.sana)}ga mos {noun} topilsa, 24 soat ichida qoʻngʻiroq qilamiz.
          </p>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-start" onSubmit={submit}>
            <PhoneField value={phone} onChange={(v) => (setPhone(v), setErr(undefined))} error={err} className="flex-1" />
            <Button type="submit" size="lg" disabled={state === "sending"} className="sm:mt-[26px]">
              {state === "sending" ? "Yuborilmoqda…" : "Soʻrov qoldirish"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
