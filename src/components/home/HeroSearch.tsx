"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_DAY, DISTRICTS, EVENT_TYPES, catalogHref, dayLabel, districtBySlug, districtSlug, eventLabel, freeCount, type EventSlug,
} from "@/data/catalog";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MonthCalendar, OptionList, useDismiss } from "@/components/ui/Picker";

type Key = "sana" | "tadbir" | "tuman" | null;

function Field({
  icon, label, value, active, open, onToggle, children, panelClass = "",
}: {
  icon: IconName; label: string; value: string; active?: boolean; open: boolean; onToggle: () => void; children: ReactNode; panelClass?: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`flex w-full min-w-0 items-center gap-3 rounded-full px-5 py-3 text-left transition-colors ${
          active ? "bg-brand-subtle" : open ? "bg-surface-subtle" : "hover:bg-surface-subtle"
        }`}
      >
        <Icon name={icon} className={active ? "shrink-0 text-brand" : "shrink-0 text-ink-2"} />
        <span className="flex min-w-0 flex-col">
          <span className={`t-cap-m ${active ? "text-brand" : "text-ink-3"}`}>{label}</span>
          <span className="truncate t-body-mm text-ink">{value}</span>
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" aria-hidden />
          <div
            role="dialog"
            aria-label={label}
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 text-left shadow-03 md:absolute md:inset-x-auto md:bottom-auto md:top-full md:mt-3 md:rounded-2xl ${panelClass}`}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

const Divider = () => <span className="hidden h-8 w-px shrink-0 bg-line md:block" />;

export function HeroSearch() {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState<Key>(null);
  const [sana, setSana] = useState(DEFAULT_DAY);
  const [tadbir, setTadbir] = useState<EventSlug>("toy");
  const [tuman, setTuman] = useState("all");
  const close = () => setOpen(null);
  useDismiss(open !== null, close, ref);
  const toggle = (k: Key) => setOpen((o) => (o === k ? null : k));

  const dekorStatus = (d: number) => (freeCount("dekor", d) === 0 ? "busy" : "free");

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(catalogHref({ sana, tadbir, tuman }));
      }}
      className="relative z-20 mt-4 flex w-full max-w-[980px] flex-col gap-1 rounded-[28px] bg-surface p-2 text-left shadow-04 md:mt-10 md:flex-row md:items-center md:rounded-full"
    >
      <Field icon="calendar" label="1 · Sana" value={dayLabel(sana)} active open={open === "sana"} onToggle={() => toggle("sana")} panelClass="md:left-0 md:w-[400px]">
        <p className="mb-3 t-body-sb">Iyun 2026 · boʻsh studiyalar soni</p>
        <MonthCalendar
          selected={sana}
          status={dekorStatus}
          note={(d) => String(freeCount("dekor", d))}
          onSelect={(d) => {
            setSana(d);
            setOpen("tadbir");
          }}
        />
      </Field>
      <Divider />
      <Field icon="sparkle" label="Tadbir turi" value={eventLabel(tadbir)} open={open === "tadbir"} onToggle={() => toggle("tadbir")} panelClass="md:left-0 md:w-[280px]">
        <OptionList
          options={EVENT_TYPES.map((e) => ({ value: e.slug, label: e.label }))}
          value={tadbir}
          onChange={(v) => {
            setTadbir(v);
            setOpen("tuman");
          }}
        />
      </Field>
      <Divider />
      <Field
        icon="mapPin"
        label="Tuman"
        value={tuman === "all" ? "Butun Toshkent" : (districtBySlug(tuman) ?? "Butun Toshkent")}
        open={open === "tuman"}
        onToggle={() => toggle("tuman")}
        panelClass="md:right-0 md:w-[300px]"
      >
        <OptionList
          options={[{ value: "all", label: "Butun Toshkent" }, ...DISTRICTS.map((d) => ({ value: districtSlug(d), label: d }))]}
          value={tuman}
          onChange={(v) => {
            setTuman(v);
            close();
          }}
        />
      </Field>
      <button
        type="submit"
        className="mt-1 inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-6 text-[16px] leading-5 font-semibold text-white transition-colors hover:bg-brand-hover active:bg-brand-pressed md:mt-0 md:h-16"
      >
        Studiyalarni koʻrish
        <Icon name="arrowRight" />
      </button>
    </form>
  );
}

