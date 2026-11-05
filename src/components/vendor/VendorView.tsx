"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND } from "@/config/brand";
import { catalogHref, fmtSum, vendorBySlug, type Package } from "@/data/catalog";
import { imageFor } from "@/data/images";
import { dayLabel, defaultDate, isBookable, isISODate, monthDates, monthOf } from "@/lib/dates";
import { useToday } from "@/lib/api";
import { initials, reviewsFor } from "@/data/reviews";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Primitives";
import { FilterField, OptionList } from "@/components/ui/Picker";
import { VendorCalendar, useVendorMonth } from "@/components/ui/Calendars";
import { isPhoneValid } from "@/components/ui/Form";
import { ContactFields } from "./ContactFields";
import { useSaved } from "@/components/ui/useSaved";
import { Lightbox } from "./Lightbox";
import { useRequestSubmit } from "./useRequestSubmit";

/* Reads ?sana from the URL; the Suspense fallback renders the same view for the default day */
export function VendorWithParams({ slug }: { slug: string }) {
  const sp = useSearchParams();
  const asked = sp.get("sana");
  return <VendorView slug={slug} asked={isISODate(asked) ? asked : null} fromCatalog={sp.has("sana")} key={`${slug}-${asked}`} />;
}

const deposit = (p: number) => Math.round((p * 0.3) / 1000) * 1000;

export function VendorView({ slug, asked = null, fromCatalog }: { slug: string; asked?: string | null; fromCatalog?: boolean }) {
  const v = vendorBySlug(slug)!;
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const [busyNotice, setBusyNotice] = useState<string | null>(null);
  const wanted = today ? (asked && isBookable(asked, today) ? asked : defaultDate(today)) : null;
  const day = picked ?? wanted;
  const [month, setMonth] = useState<string | null>(null);
  const shownMonth = month ?? (day ? monthOf(day) : null);
  const setDay = (d: string) => {
    setPicked(d);
    setBusyNotice(null);
  };

  /* Requested day turned out busy → move to the next open day in that month and say so */
  const firstMonth = useVendorMonth(slug, wanted ? monthOf(wanted) : "2000-01");
  useEffect(() => {
    if (picked || !wanted || !firstMonth.map || !today) return;
    if (firstMonth.map.get(wanted) !== "busy") return;
    const next = monthDates(monthOf(wanted)).find((d) => d > wanted && isBookable(d, today) && firstMonth.map!.get(d) !== "busy");
    if (next) {
      setPicked(next); // eslint-disable-line react-hooks/set-state-in-effect -- one-time correction after data arrives
      if (fromCatalog || asked) setBusyNotice(wanted);
    }
  }, [firstMonth.map, wanted, picked, today, fromCatalog, asked]);

  const [pkg, setPkg] = useState<Package>(v.packages[0]);
  const [photo, setPhoto] = useState<number | null>(null);
  const [saved, toggleSaved] = useSaved(v.slug);
  const [toast, setToast] = useState<string | null>(null);
  const [allReviews, setAllReviews] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const req = useRequestSubmit();

  const reviews = reviewsFor(v);
  const kind = v.category === "dekor" ? "Dekor" : "Floristika";

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${v.name} — ${BRAND.name}`, url });
      else {
        await navigator.clipboard.writeText(url);
        flash("Havola nusxalandi");
      }
    } catch {
      /* user cancelled */
    }
  };
  const flash = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2200);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const loggedIn = req.sessionStatus === "user";
    const next = {
      name: name.trim().length < 2 && !(loggedIn && req.user?.name) ? "Ismingizni kiriting" : undefined,
      phone: !loggedIn && !isPhoneValid(phone) ? "Raqamni toʻliq kiriting" : undefined,
    };
    setErrors(next);
    if (next.name || next.phone || !day) return;
    req.submit({ type: "booking", vendor: v.slug, date: day, packageId: pkg.id, name: name.trim() || req.user?.name || "" }, phone);
  };

  return (
    <>
      <Container wide className="flex flex-col gap-6 pt-4 pb-28 lg:gap-8 lg:pt-6 lg:pb-32">
        {/* Back link */}
        <Link
          href={catalogHref({ ...(day ? { sana: day } : {}), tur: v.category })}
          className="inline-flex w-fit items-center gap-1.5 py-3 t-body-sm text-ink-2 transition-colors hover:text-ink"
        >
          <Icon name="chevronLeft" size={16} />
          {fromCatalog && day ? `${dayLabel(day)} · ${kind} natijalari` : `Barcha ${kind.toLowerCase()} studiyalari`}
        </Link>

        {/* Title row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[36px] leading-10 font-bold tracking-[-0.025em] sm:t-h1">{v.name}</h1>
              {v.verified && (
                <span className="inline-flex h-6 items-center rounded-sm bg-brand-subtle px-2 text-[12px] leading-4 font-semibold text-brand-subtle-text">
                  Tekshirilgan
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 t-body-s">
              <span className="flex items-center gap-1.5">
                <Icon name="star" size={16} className="text-accent" />
                <b className="font-semibold">{v.rating.toFixed(1)}</b>
                <a href="#sharhlar" className="text-ink-3 hover:underline">
                  {v.reviews} sharh
                </a>
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="mapPin" size={16} className="text-ink-2" />
                <b className="font-semibold">{v.district}</b>
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={16} className="text-ink-2" />
                <b className="font-semibold">~{v.responseHours} soat</b>
                <span className="text-ink-3">javob vaqti</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check" size={16} className="text-ink-2" />
                <b className="font-semibold">{v.completed}</b>
                <span className="text-ink-3">bajarilgan bron</span>
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" aria-label="Ulashish" onClick={share} className="grid size-11 place-items-center rounded-full border border-line bg-surface transition-colors hover:bg-surface-subtle">
              <Icon name="share" />
            </button>
            <button
              type="button"
              aria-label={saved ? "Saqlanganlardan olib tashlash" : "Saqlash"}
              aria-pressed={saved}
              onClick={() => {
                toggleSaved();
                flash(saved ? "Saqlanganlardan olib tashlandi" : "Saqlandi");
              }}
              className="grid size-11 place-items-center rounded-full border border-line bg-surface transition-colors hover:bg-surface-subtle"
            >
              <Icon name="heart" className={saved ? "fill-error text-error" : ""} />
            </button>
          </div>
        </div>

        {/* Gallery — Figma 241:363 */}
        <div className="flex flex-col gap-3 lg:flex-row">
          <button type="button" onClick={() => setPhoto(0)} className="relative h-[280px] w-full overflow-hidden rounded-3xl sm:h-[420px] lg:h-[520px] lg:w-auto lg:flex-1" aria-label="Galereyani ochish">
            <Image src={imageFor(v.gallery[0])} alt={v.name} fill priority placeholder="blur" sizes="(min-width:1024px) 840px, 100vw" className="object-cover transition-transform duration-500 hover:scale-[1.02]" />
          </button>
          <div className="grid grid-cols-2 gap-3 lg:flex lg:w-[428px] lg:flex-col">
            {[1, 2].map((i) => (
              <div key={i} className="relative h-[140px] overflow-hidden rounded-3xl sm:h-[200px] lg:h-[254px]">
                <button type="button" onClick={() => setPhoto(i)} className="absolute inset-0" aria-label={`${i + 1}-fotoni ochish`}>
                  <Image src={imageFor(v.gallery[i])} alt="" fill placeholder="blur" sizes="(min-width:1024px) 428px, 50vw" className="object-cover transition-transform duration-500 hover:scale-[1.03]" />
                </button>
                {i === 2 && (
                  <Button variant="secondary" size="md" className="absolute right-4 bottom-4" onClick={() => setPhoto(0)}>
                    Barcha {v.gallery.length} foto
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Columns */}
        <div className="flex flex-col gap-14 pt-2 lg:flex-row lg:items-start lg:gap-24 lg:pt-6">
          <div className="flex min-w-0 flex-1 flex-col gap-14">
            <section className="flex flex-col gap-6">
              <h2 className="t-h3">Biz haqimizda</h2>
              <p className="t-body-m text-ink-2 sm:t-body-l">{v.about}</p>
            </section>
            <hr className="border-line" />

            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="t-h3">Paketlar</h2>
                <span className="t-body-s text-ink-3">{v.category === "dekor" ? "Narxlar montaj bilan" : "Narxlar yetkazib berish bilan"}</span>
              </div>
              <div role="radiogroup" aria-label="Paket" className="flex flex-col gap-6">
                {v.packages.map((p) => {
                  const sel = p.id === pkg.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => setPkg(p)}
                      className={`flex items-center gap-4 rounded-2xl px-5 py-5 text-left transition-colors sm:px-6 ${
                        sel ? "border-[1.5px] border-brand bg-brand-subtle" : "border border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <span className={`size-5 shrink-0 rounded-full ${sel ? "border-[6px] border-brand bg-white" : "border-[1.5px] border-line-strong"}`} />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="t-title">{p.title}</span>
                        <span className="t-body-s text-ink-2">{p.includes}</span>
                        <span className="pt-1 t-body-sb sm:hidden">
                          {fmtSum(p.price)} <span className="t-cap font-normal text-ink-3">· zadatok 30%</span>
                        </span>
                      </span>
                      <span className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                        <span className="t-title whitespace-nowrap">{fmtSum(p.price)}</span>
                        <span className="t-cap text-ink-3">Zadatok 30%</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="t-body-sb">Kerakli paket yoʻqmi?</span>
                  <span className="t-body-s text-ink-2">Tadbiringizni tasvirlang — studiya 24 soat ichida narx beradi.</span>
                </div>
                <Link
                  href={`/studio/${v.slug}/taklif${day ? `?sana=${day}` : ""}`}
                  className="inline-flex h-11 w-fit shrink-0 items-center justify-center rounded-lg border border-line bg-surface px-4 text-[14px] leading-[18px] font-semibold transition-colors hover:bg-surface-subtle"
                >
                  Taklif soʻrash
                </Link>
              </div>
            </section>
            <hr className="border-line" />

            <section className="flex flex-col gap-6">
              <h2 className="t-h3">Bandlik</h2>
              <div className="max-w-[720px]">
                {today && shownMonth ? (
                  <VendorCalendar slug={v.slug} size="lg" month={shownMonth} onMonth={setMonth} today={today} selected={day} onSelect={setDay} />
                ) : (
                  <div className="h-[380px] animate-pulse rounded-2xl bg-surface-subtle" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 t-body-s text-ink-2">
                <span className="flex items-center gap-2"><i className="size-3.5 rounded-xs border border-line-strong bg-surface" />Boʻsh</span>
                <span className="flex items-center gap-2"><i className="size-3.5 rounded-xs bg-accent-subtle" />1 joy qoldi</span>
                <span className="flex items-center gap-2"><i className="size-3.5 rounded-xs bg-surface-subtle" />Band</span>
                <span className="flex items-center gap-2"><i className="size-3.5 rounded-xs bg-brand" />Tanlangan</span>
                <span className="text-ink-3">· Kuniga 3 ta tadbir · 2 kun oldin yangilangan</span>
              </div>
            </section>
            <hr className="border-line" />

            <section id="sharhlar" className="flex scroll-mt-6 flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="t-h3">Sharhlar</h2>
                <span className="t-body-sm text-ink-3">
                  {v.rating.toFixed(1)} · {v.reviews} ta real bron
                </span>
              </div>
              {(allReviews ? reviews : reviews.slice(0, 2)).map((r) => (
                <article key={r.name} className="flex flex-col gap-3 border-t border-line pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full bg-brand-subtle text-[12px] leading-4 font-semibold text-brand-subtle-text">
                        {initials(r.name)}
                      </span>
                      <span className="flex flex-col">
                        <span className="t-body-sb">{r.name}</span>
                        <span className="t-cap text-ink-3">{r.meta}</span>
                      </span>
                    </div>
                    <span role="img" className="flex gap-0.5 text-accent" aria-label="5 yulduz">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Icon key={i} name="star" size={16} />
                      ))}
                    </span>
                  </div>
                  <p className="t-body-m text-ink-2">{r.body}</p>
                </article>
              ))}
              {!allReviews && (
                <Button variant="secondary" size="md" className="w-fit" onClick={() => setAllReviews(true)}>
                  Yana {reviews.length - 2} ta sharh
                </Button>
              )}
            </section>
          </div>

          {/* Booking panel — Figma 239:143 */}
          <aside id="bron" className="w-full scroll-mt-6 lg:sticky lg:top-6 lg:w-[424px] lg:shrink-0">
            <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
              <div className="flex flex-col gap-1">
                <span className="t-h3">{fmtSum(pkg.price)}</span>
                <span className="t-body-s text-ink-3">
                  Zadatok 30% · {fmtSum(deposit(pkg.price))}. Qolgani tadbir oldidan.
                </span>
              </div>
              {busyNotice && (
                <p role="status" className="rounded-lg bg-accent-subtle px-3 py-2 t-cap-m text-accent-subtle-text">
                  {dayLabel(busyNotice).split(",")[0]} band. Eng yaqin boʻsh kun tanlandi — {day && dayLabel(day)}.
                </p>
              )}
              <FilterField icon="calendar" label="Sana" value={day ? dayLabel(day) : "…"} panelWidth={380} align="right">
                {(close) => (
                  <div className="p-1">
                    <p className="mb-3 t-body-sb">{v.name} bandligi</p>
                    {today && day && (
                      <PanelCalendar
                        slug={v.slug}
                        today={today}
                        day={day}
                        onSelect={(d) => {
                          setDay(d);
                          setMonth(monthOf(d));
                          close();
                        }}
                      />
                    )}
                  </div>
                )}
              </FilterField>
              <FilterField icon="grid" label="Paket" value={pkg.title} panelWidth={376} align="right">
                {(close) => (
                  <OptionList
                    options={v.packages.map((p) => ({ value: p.id, label: p.title, hint: fmtSum(p.price) }))}
                    value={pkg.id}
                    onChange={(id) => {
                      setPkg(v.packages.find((p) => p.id === id)!);
                      close();
                    }}
                  />
                )}
              </FilterField>
              <ContactFields
                name={name}
                setName={(n) => (setName(n), setErrors((x) => ({ ...x, name: undefined })))}
                phone={phone}
                setPhone={(p) => (setPhone(p), setErrors((x) => ({ ...x, phone: undefined })))}
                errors={errors}
                user={req.user}
              />
              {req.error && (
                <p role="alert" className="rounded-lg bg-error-subtle px-3 py-2 t-cap-m text-error-subtle-text">
                  {req.error.message}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={req.busy || !day}>
                {req.busy ? "Yuborilmoqda…" : "Bron soʻrash"}
              </Button>
              <p className="t-cap text-ink-3">Hozir pul yechilmaydi. Studiya odatda {v.responseHours} soatda javob beradi.</p>
              <hr className="border-line" />
              <Link href="/kafolat" className="group flex gap-3">
                <Icon name="shieldCheck" className="shrink-0 text-brand" />
                <span className="flex flex-col gap-0.5">
                  <span className="t-body-sb group-hover:underline">{BRAND.name} kafolati</span>
                  <span className="t-cap text-ink-2">Studiya kelmasa — zadatok 100% qaytadi va muqobilini topamiz.</span>
                </span>
              </Link>
            </form>
          </aside>
        </div>
      </Container>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line bg-surface px-4 py-3 lg:hidden">
        <span className="flex flex-col">
          <span className="t-body-sb">{fmtSum(pkg.price)}</span>
          <span className="t-cap text-ink-3">{day ? dayLabel(day) : ""}</span>
        </span>
        <a href="#bron" className="inline-flex h-11 items-center rounded-lg bg-brand px-5 text-[14px] font-semibold text-white">
          Bron soʻrash
        </a>
      </div>

      {req.dialog}
      {photo !== null && <Lightbox images={v.gallery.map(imageFor)} index={photo} onIndex={setPhoto} onClose={() => setPhoto(null)} title={v.name} />}

      {toast && (
        <div role="status" className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-inverse px-4 py-2.5 t-body-sm text-white shadow-03 lg:bottom-8">
          {toast}
        </div>
      )}
    </>
  );
}


function PanelCalendar({ slug, today, day, onSelect }: { slug: string; today: string; day: string; onSelect: (d: string) => void }) {
  const [m, setM] = useState(monthOf(day));
  return <VendorCalendar slug={slug} month={m} onMonth={setM} today={today} selected={day} onSelect={onSelect} />;
}
