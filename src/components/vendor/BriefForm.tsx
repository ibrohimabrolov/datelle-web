"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { DEFAULT_DAY, EVENT_TYPES, MONTH, dayLabel, eventLabel, statusOf, vendorBySlug, type EventSlug } from "@/data/catalog";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Chip, FilterField, MonthCalendar, OptionList } from "@/components/ui/Picker";
import { PhoneField, TextArea, TextField, isPhoneValid } from "@/components/ui/Form";
import { Container } from "@/components/ui/Primitives";
import { Stepper } from "@/components/ui/Stepper";

const BUDGET_RANGES = ["5 mln gacha", "5–15 mln", "15 mln+", "Hali bilmayman"] as const;

export function BriefWithParams({ slug }: { slug: string }) {
  const n = Number(useSearchParams().get("sana"));
  return <BriefForm slug={slug} initialDay={n >= 1 && n <= MONTH.days ? n : DEFAULT_DAY} key={n} />;
}

/* B3 · Individual soʻrov (brief) — Figma 246:1314 */
export function BriefForm({ slug, initialDay = DEFAULT_DAY }: { slug: string; initialDay?: number }) {
  const v = vendorBySlug(slug)!;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [day, setDay] = useState(initialDay);
  const [event, setEvent] = useState<EventSlug>("toy");
  const [place, setPlace] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState<(typeof BUDGET_RANGES)[number]>("5–15 mln");
  const [style, setStyle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const ok = [...list].filter((f) => /image\/(jpeg|png)/.test(f.type) && f.size <= 10 * 1024 * 1024);
    setFiles((prev) => [...prev, ...ok].slice(0, 5));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      guests: guests && !/^\d{1,4}$/.test(guests) ? "Faqat raqam" : undefined,
      name: name.trim().length < 2 ? "Ismingizni kiriting" : undefined,
      phone: !isPhoneValid(phone) ? "Raqamni toʻliq kiriting" : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    const q = new URLSearchParams({ turi: "taklif", studio: v.slug, sana: String(day), tadbir: event, byudjet: budget });
    if (guests) q.set("mehmon", guests);
    if (place.trim()) q.set("joy", place.trim());
    router.push(`/sorov/yuborildi?${q}`);
  };

  const section = "flex flex-col gap-4";
  return (
    <Container wide className="flex flex-col gap-10 pt-4 pb-24 lg:flex-row lg:items-start lg:gap-24 lg:pt-6 lg:pb-32">
      <form onSubmit={submit} noValidate className="flex min-w-0 flex-1 flex-col gap-10 lg:max-w-[760px]">
        <div className="flex flex-col gap-4">
          <Link href={`/studio/${v.slug}?sana=${day}`} className="inline-flex w-fit items-center gap-1.5 py-3 t-body-sm text-ink-2 hover:text-ink">
            <Icon name="chevronLeft" size={16} />
            {v.name}
          </Link>
          <h1 className="text-[36px] leading-10 font-bold tracking-[-0.025em] sm:t-h1">Individual taklif soʻrash</h1>
          <p className="t-body-m text-ink-2 sm:t-body-l">Tadbiringizni tasvirlang — studiya 24 soat ichida aniq narx bilan javob beradi.</p>
        </div>

        <fieldset className={section}>
          <legend className="mb-4 t-title">Tadbir</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterField icon="calendar" label="Sana" value={dayLabel(day)} panelWidth={380}>
              {(close) => (
                <div className="p-1">
                  <p className="mb-3 t-body-sb">{v.name} bandligi</p>
                  <MonthCalendar selected={day} status={(d) => statusOf(v, d)} onSelect={(d) => (setDay(d), close())} />
                </div>
              )}
            </FilterField>
            <FilterField icon="sparkle" label="Tadbir turi" value={eventLabel(event)} panelWidth={260}>
              {(close) => (
                <OptionList options={EVENT_TYPES.map((e) => ({ value: e.slug, label: e.label }))} value={event} onChange={(x) => (setEvent(x), close())} />
              )}
            </FilterField>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <TextField label="Zal yoki manzil" placeholder="Masalan, Versal toʻyxonasi, Chilonzor" value={place} onChange={(e) => setPlace(e.target.value)} />
            <TextField
              label="Mehmonlar soni"
              inputMode="numeric"
              placeholder="250"
              value={guests}
              onChange={(e) => (setGuests(e.target.value.replace(/\D/g, "").slice(0, 4)), setErrors((x) => ({ ...x, guests: undefined })))}
              error={errors.guests}
            />
          </div>
        </fieldset>

        <fieldset className={section}>
          <legend className="mb-4 t-title">Byudjet</legend>
          <div className="flex flex-wrap gap-2">
            {BUDGET_RANGES.map((b) => (
              <Chip key={b} selected={budget === b} onClick={() => setBudget(b)}>
                {b}
              </Chip>
            ))}
          </div>
          <p className="t-cap text-ink-3">Taxminiy oraliq yetarli.</p>
        </fieldset>

        <fieldset className={section}>
          <legend className="mb-4 t-title">Uslub va istaklar</legend>
          <TextArea label="Uslub, rang, kerakli elementlar" placeholder="Masalan: oq-yashil palitra, jonli gul, sahnada arka, kelin-kuyov stoli." value={style} onChange={(e) => setStyle(e.target.value)} />
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className="flex flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-line-strong bg-surface-subtle px-6 py-10 text-center"
          >
            <Icon name="upload" className="text-ink-2" />
            <button type="button" onClick={() => fileRef.current?.click()} className="t-body-sb hover:underline">
              Fotolarni shu yerga tashlang yoki tanlang
            </button>
            <span className="t-cap text-ink-3">JPG, PNG · 10 MB gacha · 5 tagacha</span>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            {files.length > 0 && (
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-3 t-cap-m">
                    {f.name.length > 24 ? f.name.slice(0, 21) + "…" : f.name}
                    <button type="button" aria-label="Olib tashlash" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="grid size-5 place-items-center rounded-full hover:bg-surface-subtle">
                      <Icon name="x" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </fieldset>

        <fieldset className={section}>
          <legend className="mb-4 t-title">Aloqa</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Ismingiz" placeholder="Masalan, Dilnoza" autoComplete="given-name" value={name} onChange={(e) => (setName(e.target.value), setErrors((x) => ({ ...x, name: undefined })))} error={errors.name} />
            <PhoneField value={phone} onChange={(p) => (setPhone(p), setErrors((x) => ({ ...x, phone: undefined })))} error={errors.phone} />
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg">
            Soʻrov yuborish
          </Button>
          <span className="t-body-s text-ink-2">Bepul. Pul faqat taklifni qabul qilsangiz yechiladi.</span>
        </div>
      </form>

      <aside className="flex w-full flex-col gap-4 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-6 lg:w-[424px] lg:shrink-0">
        <div className="relative h-[180px] overflow-hidden rounded-xl">
          <Image src={v.img} alt={v.name} fill placeholder="blur" sizes="400px" className="object-cover" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="t-title">{v.name}</span>
          <span className="t-body-s text-ink-2">
            ★ {v.rating.toFixed(1)} · {v.category === "dekor" ? "Dekor" : "Floristika"} · {v.district} · ~{v.responseHours} soatda javob
          </span>
        </div>
        <hr className="border-line" />
        <span className="t-body-sb">Keyin nima boʻladi?</span>
        <Stepper
          steps={[
            { title: "Soʻrov yuborasiz", sub: "Hozir", state: "current" },
            { title: "Studiya taklif yuboradi", sub: "24 soat ichida", state: "todo" },
            { title: "Taklifni qabul qilib, zadatok toʻlaysiz", sub: "Payme yoki Click", state: "todo" },
            { title: "Sana siz uchun band qilinadi", sub: "Kontaktlar ochiladi", state: "todo" },
          ]}
        />
      </aside>
    </Container>
  );
}
