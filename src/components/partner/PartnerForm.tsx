"use client";

import Link from "next/link";
import { useState } from "react";
import { BRAND } from "@/config/brand";
import { DISTRICTS, districtBySlug, districtSlug } from "@/data/catalog";
import { Button, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Chip, FilterField, OptionList, Segmented } from "@/components/ui/Picker";
import { PhoneField, TextField, isPhoneValid } from "@/components/ui/Form";
import { Stepper } from "@/components/ui/Stepper";

const LEGAL = ["YaTT", "MChJ", "Oʻzini oʻzi band qilgan"] as const;

export function PartnerForm() {
  const [studio, setStudio] = useState("");
  const [kind, setKind] = useState<"dekor" | "floristika">("dekor");
  const [district, setDistrict] = useState("");
  const [instagram, setInstagram] = useState("");
  const [legal, setLegal] = useState<(typeof LEGAL)[number]>("YaTT");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [sent, setSent] = useState(false);
  const clear = (k: string) => setErrors((e) => ({ ...e, [k]: undefined }));

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-6 rounded-3xl border border-line bg-surface p-6 sm:p-10">
        <span className="grid size-14 place-items-center rounded-full bg-brand text-white">
          <Icon name="check" size={26} />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="t-h2">Ariza qabul qilindi</h2>
          <p className="max-w-[520px] t-body-m text-ink-2">
            {studio} tekshiruvi 48 soat ichida yakunlanadi. Natijani {phone} raqamiga SMS va Telegram orqali yuboramiz.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/hamkorlar" className={buttonClass("secondary", "lg")}>
            Hamkorlar sahifasi
          </Link>
          <a href={BRAND.telegramUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg")}>
            Telegram’da yozish
          </a>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      studio: studio.trim().length < 2 ? "Studiya nomini kiriting" : undefined,
      district: !district ? "Tumanni tanlang" : undefined,
      name: name.trim().length < 2 ? "Ismingizni kiriting" : undefined,
      phone: !isPhoneValid(phone) ? "Raqamni toʻliq kiriting" : undefined,
    };
    setErrors(next);
    if (!Object.values(next).some(Boolean)) setSent(true);
  };

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-24">
      <form onSubmit={submit} noValidate className="flex min-w-0 flex-1 flex-col gap-8 lg:max-w-[760px]">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 t-title">Studiya</legend>
          <TextField label="Studiya nomi" placeholder="Masalan, Gulnoza Decor" value={studio} onChange={(e) => (setStudio(e.target.value), clear("studio"))} error={errors.studio} />
          <div className="flex flex-col gap-2">
            <span className="text-[14px] leading-[18px] font-medium text-ink-2">Yoʻnalish</span>
            <Segmented options={[{ value: "dekor", label: "Dekor" }, { value: "floristika", label: "Floristika" }]} value={kind} onChange={setKind} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-[14px] leading-[18px] font-medium text-ink-2">Tuman</span>
              <FilterField icon="mapPin" label="Asosiy ish hududi" value={district ? (districtBySlug(district) ?? "") : "Tanlang"} panelWidth={280} emphasis={!!errors.district}>
                {(close) => (
                  <OptionList
                    options={DISTRICTS.map((d) => ({ value: districtSlug(d), label: d }))}
                    value={district}
                    onChange={(v) => (setDistrict(v), clear("district"), close())}
                  />
                )}
              </FilterField>
              {errors.district && <span className="t-cap text-error">{errors.district}</span>}
            </div>
            <TextField label="Instagram" placeholder="@studiya" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[14px] leading-[18px] font-medium text-ink-2">Shakl</span>
            <div className="flex flex-wrap gap-2">
              {LEGAL.map((l) => (
                <Chip key={l} selected={legal === l} onClick={() => setLegal(l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-4 t-title">Aloqa</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Ismingiz" placeholder="Masalan, Gulnoza" autoComplete="given-name" value={name} onChange={(e) => (setName(e.target.value), clear("name"))} error={errors.name} />
            <PhoneField value={phone} onChange={(p) => (setPhone(p), clear("phone"))} error={errors.phone} />
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg">
            Ariza yuborish
          </Button>
          <span className="t-body-s text-ink-2">
            Bepul. Yuborish orqali <Link href="/oferta" className="text-brand hover:underline">ofertaga</Link> rozilik bildirasiz.
          </span>
        </div>
      </form>

      <aside className="flex w-full flex-col gap-4 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-6 lg:w-[424px] lg:shrink-0">
        <span className="t-body-sb">Keyin nima boʻladi?</span>
        <Stepper
          steps={[
            { title: "Ariza yuborasiz", sub: "Hozir · 3 daqiqa", state: "current" },
            { title: "Tekshiruv", sub: "48 soat ichida · hujjat va portfolio", state: "todo" },
            { title: "Profil va paketlar", sub: "Birinchi 30 hamkorga biz toʻldiramiz", state: "todo" },
            { title: "Bron havolasi tayyor", sub: `${BRAND.domain}/v/studiyangiz`, state: "todo" },
          ]}
        />
      </aside>
    </div>
  );
}
