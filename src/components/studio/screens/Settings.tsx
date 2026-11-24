"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, useToday } from "@/lib/api";
import { MONTHS } from "@/lib/dates";
import { Button } from "../Button";
import { useDataVersion, dataChanged } from "../data";
import { FakeDoor } from "../FakeDoor";
import { StudioIcon, type StudioIconName } from "../icons";
import { ConfirmDialog, Menu, Modal } from "../Modal";
import { usePanel, useStudio, type Me, type Studio } from "../PanelProvider";
import { PageHead } from "../Shell";
import { applyTheme, storedTheme, type PanelTheme } from "../theme";
import { Toast, type ToastMsg } from "../Toast";

type Category = Studio["category"];
const CATEGORY: Record<Category, string> = { dekor: "Dekor", floristika: "Floristika" };
const CAP_MIN = 1;
const CAP_MAX = 20;

type Details = {
  studio: { id: string; name: string; category: Category; dailyCapacity: number; plan: "founding" | "standard"; trialEndsAt: string | null };
  role: Studio["role"];
  owner: { name: string; username: string | null } | null;
};
type Member = { userId: string; name: string; username: string | null; role: Studio["role"]; lastSeenAt: string | null; isYou: boolean };
type Invite = { id: string; expiresAt: string };
type Layer = { kind: "name" } | { kind: "category" } | { kind: "logo" } | { kind: "invite" } | { kind: "remove"; member: Member } | { kind: "leave" } | null;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

const dayMonth = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}`;
};

/* "Bugun faol" / "Kecha faol" / "3 kun oldin faol" — calendar days in the viewer's timezone */
function seen(iso: string | null) {
  if (!iso) return "Hali kirmagan";
  const day = (d: Date) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000);
  const diff = day(new Date()) - day(new Date(iso));
  if (diff <= 0) return "Bugun faol";
  if (diff === 1) return "Kecha faol";
  if (diff < 30) return `${diff} kun oldin faol`;
  return `${dayMonth(iso)} faol boʻlgan`;
}


const TRIAL_DAYS = 30; // onboarding gives a 30-day free month
const SEATS_INCLUDED = 3; // landing PLANS: 299 000 soʻm/oy — 3 foydalanuvchi, keyingisi +49 000
const PRICE_MONTH = "299 000";
const PRICE_YEAR = "2 990 000";

type SectionId = "studiyalar" | "umumiy" | "jamoa" | "obuna" | "studiya" | "eslatmalar" | "korinish" | "hisob";
const SECTION_LABEL: Record<SectionId, string> = {
  studiyalar: "Studiyalar",
  umumiy: "Umumiy",
  jamoa: "Jamoa",
  obuna: "Obuna",
  studiya: "Studiya",
  eslatmalar: "Eslatmalar",
  korinish: "Koʻrinish",
  hisob: "Hisob",
};

/* S6 · Sozlamalar v2 (Figma 06 · Sozlamalar 593:11522 — egasi 595:11527, menejer 596:11644):
   one column + in-page nav, a card per section, label · value · action rows, every change saves at once. */
export function SettingsScreen() {
  const { tg, signOut, setMe, switchStudio } = usePanel();
  const ctx = useStudio();
  const version = useDataVersion();
  const [details, setDetails] = useState<Details | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [layer, setLayer] = useState<Layer>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [logoVoted, setLogoVoted] = useState(false);
  const say = useCallback((text: string) => setToast({ id: Date.now(), text }), []);

  const studioId = ctx?.studio.id;
  const isOwner = ctx?.studio.role === "owner";
  useEffect(() => {
    if (!studioId) return;
    let alive = true;
    const jobs: Promise<unknown>[] = [api<Details>("/api/panel/studio").then((d) => alive && setDetails(d))];
    if (isOwner) {
      jobs.push(api<{ members: Member[] }>("/api/panel/members").then((r) => alive && setMembers(r.members)));
      jobs.push(api<{ invites: Invite[] }>("/api/panel/invites").then((r) => alive && setInvites(r.invites)));
      jobs.push(api<{ features: string[] }>("/api/panel/interest").then((r) => alive && setLogoVoted(r.features.includes("logo"))));
    }
    Promise.all(jobs).catch((e) => alive && say(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [studioId, isOwner, version, say]);

  // The provider's copy of the studio drives the shell (sidebar name, capacity on Kalendar) — refresh it after edits
  const refreshMe = useCallback(async () => {
    if (!studioId) return;
    setMe(await api<Me>("/api/panel/me"), studioId);
  }, [setMe, studioId]);

  async function patchStudio(body: Partial<Pick<Details["studio"], "name" | "category" | "dailyCapacity">>) {
    const r = await api<Details>("/api/panel/studio", { method: "PATCH", body });
    setDetails(r);
    await refreshMe();
    if (body.dailyCapacity !== undefined) dataChanged(); // day statuses depend on capacity
    return r;
  }

  // Capacity: optimistic, one request per settled value (rapid taps coalesce)
  const [capacity, setCapacity] = useState<number | null>(null);
  const capTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shownCap = capacity ?? ctx?.studio.dailyCapacity ?? 1;
  function stepCapacity(delta: number) {
    const next = Math.min(CAP_MAX, Math.max(CAP_MIN, shownCap + delta));
    if (next === shownCap) return;
    setCapacity(next);
    clearTimeout(capTimer.current);
    capTimer.current = setTimeout(() => {
      patchStudio({ dailyCapacity: next })
        .then(() => say(`Kunlik sigʻim saqlandi — ${next} ta`))
        .catch((e) => say(e instanceof ApiError ? e.message : "Saqlab boʻlmadi"))
        .finally(() => setCapacity(null));
    }, 500);
  }
  useEffect(() => () => clearTimeout(capTimer.current), []);

  // Evening reminder is per person (studio_members.reminders_on), optimistic with rollback
  const [reminders, setReminders] = useState<boolean | null>(null);
  const remindersOn = reminders ?? ctx?.studio.remindersOn ?? true;
  async function toggleReminders() {
    const next = !remindersOn;
    setReminders(next);
    try {
      await api("/api/panel/members/me", { method: "PATCH", body: { remindersOn: next } });
      await refreshMe();
    } catch (e) {
      say(e instanceof ApiError ? e.message : "Saqlab boʻlmadi");
    } finally {
      setReminders(null);
    }
  }

  const others = ctx ? ctx.me.studios.filter((s) => s.id !== ctx.studio.id) : [];
  const sections: SectionId[] = !ctx
    ? []
    : [
        ...(others.length ? (["studiyalar"] as const) : []),
        ...(isOwner ? (["umumiy", "jamoa", "obuna"] as const) : (["studiya"] as const)),
        "eslatmalar",
        ...(!tg ? (["korinish"] as const) : []),
        "hisob",
      ];
  const active = useScrollSpy(sections);

  if (!ctx)
    return (
      <>
        <PageHead title="Sozlamalar" settings={false} />
        <div className="ds-set">
          <span className="ds-set-nav ds-desktop-only" />
          <div className="ds-set-content">
            <span className="ds-skeleton" style={{ height: 320, borderRadius: "var(--ds-radius-xl)" }} />
            <span className="ds-skeleton" style={{ height: 240, borderRadius: "var(--ds-radius-xl)" }} />
          </div>
        </div>
      </>
    );
  const { me, studio } = ctx;
  const trialEnds = details?.studio.trialEndsAt ?? null;
  const owner = details?.owner;
  const handle = me.user.username ? `@${me.user.username}` : me.user.name;

  return (
    <>
      <PageHead title="Sozlamalar" settings={false} />
      <div className="ds-set">
        <nav className="ds-set-nav" aria-label="Sozlamalar boʻlimlari">
          {sections.map((id) => (
            <a key={id} href={`#s-${id}`} aria-current={active === id ? "location" : undefined}>
              {SECTION_LABEL[id]}
            </a>
          ))}
        </nav>

        <div className="ds-set-content">
          {others.length > 0 && (
            <Section id="studiyalar" icon="briefcase" title="Studiyalaringiz">
              <div role="radiogroup" aria-label="Faol studiya">
                {me.studios.map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={s.id === studio.id} className="ds-row ds-row-button" onClick={() => s.id !== studio.id && switchStudio(s.id)}>
                    <StudioAvatar />
                    <span className="ds-row-text">
                      <span className="ds-row-title">{s.name}</span>
                      <span className="ds-row-sub">{s.role === "owner" ? "Egasi" : "Menejer"}</span>
                    </span>
                    {s.id === studio.id && <StudioIcon name="check" className="ds-brand" />}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {isOwner ? (
            <>
              <Section id="umumiy" icon="briefcase" title="Umumiy">
                <Row label="Logo" helper={logoVoted ? "Logo yuklash tez orada — soʻrovingiz qabul qilingan" : "PNG yoki JPG, kamida 256×256. Sidebar va smetada chiqadi"} action={<Button variant="secondary" data-on-card onClick={() => setLayer({ kind: "logo" })}>Yuklash</Button>}>
                  <StudioAvatar />
                </Row>
                <Row label="Nomi" action={<Button variant="ghost" onClick={() => setLayer({ kind: "name" })} aria-label="Nomini oʻzgartirish">Oʻzgartirish</Button>}>
                  {studio.name}
                </Row>
                <Row label="Yoʻnalish" action={<Button variant="ghost" onClick={() => setLayer({ kind: "category" })} aria-label="Yoʻnalishni oʻzgartirish">Oʻzgartirish</Button>}>
                  {CATEGORY[studio.category]}
                </Row>
                <Row
                  label="Kunlik sigʻim"
                  labelId="cap-label"
                  helper="Kalendarda «1 joy» va «Band» shu songa qarab chiqadi"
                  action={
                    <div className="ds-stepper" data-size="s" role="group" aria-labelledby="cap-label">
                      <button type="button" onClick={() => stepCapacity(-1)} disabled={shownCap <= CAP_MIN} aria-label="Kamaytirish">
                        <StudioIcon name="minus" />
                      </button>
                      <output aria-live="polite">{shownCap}</output>
                      <button type="button" onClick={() => stepCapacity(1)} disabled={shownCap >= CAP_MAX} aria-label="Koʻpaytirish">
                        <StudioIcon name="plus" />
                      </button>
                    </div>
                  }
                />
              </Section>

              <Section
                id="jamoa"
                icon="users"
                title="Jamoa"
                action={
                  <Button variant="secondary" icon={<StudioIcon name="user-plus" variant="Filled" />} onClick={() => setLayer({ kind: "invite" })}>
                    Menejer qoʻshish
                  </Button>
                }
              >
                {!members && (
                  <div className="ds-row" aria-hidden>
                    <span className="ds-skeleton" style={{ height: 40, width: "60%" }} />
                  </div>
                )}
                {members?.map((m) => (
                  <div key={m.userId} className="ds-row">
                    <span className="ds-avatar" aria-hidden>
                      {initials(m.name)}
                    </span>
                    <span className="ds-row-text">
                      <span className="ds-row-title">{m.name}</span>
                      <span className="ds-row-sub">{m.username ? `@${m.username}` : m.isYou ? "Siz" : seen(m.lastSeenAt)}</span>
                    </span>
                    {m.role === "owner" ? (
                      <span className="ds-tag" data-tone="brand">
                        Egasi
                      </span>
                    ) : (
                      <>
                        <span className="ds-tag" data-tone="neutral">
                          Menejer
                        </span>
                        <Menu
                          label={`${m.name}ni boshqarish`}
                          trigger="Boshqarish"
                          items={[
                            {
                              label: "Telegram’da yozish",
                              icon: <StudioIcon name="send" />,
                              disabled: !m.username,
                              onSelect: () => m.username && window.open(`https://t.me/${m.username}`, "_blank", "noopener"),
                            },
                            { label: "Jamoadan chiqarish", icon: <StudioIcon name="log-out" />, danger: true, onSelect: () => setLayer({ kind: "remove", member: m }) },
                          ]}
                        />
                      </>
                    )}
                  </div>
                ))}
                {invites.map((inv) => (
                  <div key={inv.id} className="ds-row">
                    <span className="ds-avatar" data-tone="muted" aria-hidden>
                      <StudioIcon name="send" size={24} />
                    </span>
                    <span className="ds-row-text">
                      <span className="ds-row-title">Taklif yuborilgan</span>
                      <span className="ds-row-sub">Bir martalik link · {dayMonth(inv.expiresAt)}gacha amal qiladi</span>
                    </span>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        try {
                          setInvites((await api<{ invites: Invite[] }>(`/api/panel/invites/${inv.id}`, { method: "DELETE", body: {} })).invites);
                          say("Taklif bekor qilindi");
                        } catch (e) {
                          say(e instanceof ApiError ? e.message : "Bekor qilib boʻlmadi");
                        }
                      }}
                    >
                      Bekor qilish
                    </Button>
                  </div>
                ))}
              </Section>

              <Section id="obuna" icon="star" title="Obuna" padded>
                {details ? <Plan trialEnds={trialEnds} /> : <span className="ds-skeleton" style={{ height: 120 }} />}
              </Section>
            </>
          ) : (
            <Section id="studiya" icon="briefcase" title="Studiya">
              <div className="ds-row">
                <StudioAvatar />
                <span className="ds-row-text">
                  <span className="ds-row-title">{studio.name}</span>
                  <span className="ds-row-sub">{owner ? `Egasi: ${owner.name}${owner.username ? ` · @${owner.username}` : ""}` : " "}</span>
                </span>
                <span className="ds-tag" data-tone="neutral">
                  Menejer
                </span>
              </div>
              <div className="ds-row ds-row-stack">
                <span className="ds-row-title">Siz nima qila olasiz</span>
                <Rights you />
              </div>
              <div className="ds-row">
                <span className="ds-row-text">
                  <span className="ds-row-title">Jamoani tark etish</span>
                  <span className="ds-row-sub">Studiya maʼlumotlariga kirishingiz yopiladi. Siz qoʻshgan buyurtmalar studiyada qoladi</span>
                </span>
                <Button variant="ghost" data-tone="danger" onClick={() => setLayer({ kind: "leave" })}>
                  Tark etish
                </Button>
              </div>
            </Section>
          )}

          {/* Only the evening digest exists in the bot (cron 20:00) — one honest switch */}
          <Section id="eslatmalar" icon="bell" title="Eslatmalar">
            <Row label="Kechki xulosa" labelId="rem-label" action={<button type="button" role="switch" aria-checked={remindersOn} aria-labelledby="rem-label" aria-describedby="rem-sub" className="ds-switch" onClick={toggleReminders} />}>
              <span id="rem-sub">Har kuni 20:00 da</span>
            </Row>
          </Section>

          {/* Telegram decides the Mini App theme; the web panel remembers its own (light by default) */}
          {!tg && (
            <Section id="korinish" icon="sun" title="Koʻrinish">
              <Row label="Mavzu" labelId="theme-label" wide action={<ThemeSegment />} />
            </Section>
          )}

          <Section id="hisob" icon="send" title="Hisob">
            <Row
              label="Telegram"
              action={
                // In the Mini App the session is re-created on every open, so "Chiqish" would be a no-op
                !tg && (
                  <Button
                    variant="danger-subtle"
                    icon={<StudioIcon name="log-out" />}
                    loading={leaving}
                    onClick={async () => {
                      setLeaving(true);
                      await signOut();
                    }}
                  >
                    Chiqish
                  </Button>
                )
              }
            >
              {handle}
            </Row>
          </Section>
        </div>
      </div>

      {layer?.kind === "name" && (
        <NameDialog
          initial={studio.name}
          onClose={() => setLayer(null)}
          onSave={async (name) => {
            await patchStudio({ name });
            setLayer(null);
            say("Saqlandi");
          }}
        />
      )}
      {layer?.kind === "category" && (
        <CategoryDialog
          initial={studio.category}
          onClose={() => setLayer(null)}
          onSave={async (category) => {
            await patchStudio({ category });
            setLayer(null);
            say("Saqlandi");
          }}
        />
      )}
      {layer?.kind === "logo" && (
        <FakeDoor
          title="Studiya logosi"
          text="Oʻz logongizni yuklang — u sidebar, smeta PDF va mijozga yuboriladigan hujjatlarda chiqadi. Hozircha standart rasm turibdi. Sizga kerakmi?"
          voted={logoVoted}
          onClose={() => setLayer(null)}
          onVote={async () => {
            await api("/api/panel/interest", { body: { feature: "logo" } });
            setLogoVoted(true);
            setLayer(null);
            say("Rahmat — tayyor boʻlganda xabar beramiz");
          }}
        />
      )}
      {layer?.kind === "invite" && (
        <InviteDialog
          studioName={studio.name}
          seat={(members?.length ?? 1) + invites.length + 1}
          onClose={() => {
            setLayer(null);
            api<{ invites: Invite[] }>("/api/panel/invites")
              .then((r) => setInvites(r.invites))
              .catch(() => undefined);
          }}
          say={say}
        />
      )}
      {layer?.kind === "remove" && (
        <ConfirmDialog
          title={`${layer.member.name.split(" ")[0]}ni jamoadan chiqarasizmi?`}
          description="U kalendar va buyurtmalarga kira olmay qoladi. U qoʻshgan buyurtmalar va toʻlovlar studiyada qoladi."
          confirm="Chiqarish"
          cancel="Bekor qilish"
          tone="destructive"
          onClose={() => setLayer(null)}
          onConfirm={async () => {
            const r = await api<{ members: Member[] }>(`/api/panel/members/${layer.member.userId}`, { method: "DELETE", body: {} });
            setMembers(r.members);
            setLayer(null);
            say(`${layer.member.name.split(" ")[0]} jamoadan chiqarildi`);
          }}
        />
      )}
      {layer?.kind === "leave" && (
        <ConfirmDialog
          title="Jamoani tark etasizmi?"
          description={`${studio.name} kalendari va buyurtmalariga kirishingiz yopiladi. Siz qoʻshgan buyurtmalar studiyada qoladi.`}
          confirm="Tark etish"
          cancel="Bekor qilish"
          tone="destructive"
          onClose={() => setLayer(null)}
          onConfirm={async () => {
            await api("/api/panel/members/me", { method: "DELETE", body: {} });
            // full reload: the provider re-reads /me and routes to another studio or onboarding
            window.location.replace(new URL("/panel", window.location.href).href);
          }}
        />
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

/* In-page nav: the section nearest the top of the viewport is current */
function useScrollSpy(ids: SectionId[]) {
  const [active, setActive] = useState<SectionId | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const els = key
      .split(",")
      .filter(Boolean)
      .map((id) => document.getElementById(`s-${id}`))
      .filter((e): e is HTMLElement => Boolean(e));
    if (!els.length) return;
    const onScroll = () => {
      const line = 120;
      let cur = els[0];
      for (const el of els) if (el.getBoundingClientRect().top - line <= 0) cur = el;
      // at the very bottom the last section wins even if it never reaches the line
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = els[els.length - 1];
      setActive(cur.id.slice(2) as SectionId);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);
  return active;
}

/* Section: brand title with an 18px Filled icon + a card; `action` sits right of the title */
function Section({ id, icon, title, action, padded, children }: { id: SectionId; icon: StudioIconName; title: string; action?: ReactNode; padded?: boolean; children: ReactNode }) {
  return (
    <section id={`s-${id}`} className="ds-set-section" aria-labelledby={`s-${id}-h`}>
      <div className="ds-set-head">
        <h2 id={`s-${id}-h`} className="ds-set-title">
          <StudioIcon name={icon} variant="Filled" size={18} />
          {title}
        </h2>
        {action}
      </div>
      <div className="ds-set-card" data-padded={padded || undefined}>
        {children}
      </div>
    </section>
  );
}

/* Row: label 184 · value (+ helper) · action. `wide` = label takes the free space (Koʻrinish → Mavzu) */
function Row({ label, labelId, helper, action, wide, children }: { label: string; labelId?: string; helper?: string; action?: ReactNode; wide?: boolean; children?: ReactNode }) {
  return (
    <div className="ds-row" data-wide={wide || undefined}>
      <span className="ds-row-label" id={labelId}>
        {label}
      </span>
      {!wide && (
        <span className="ds-row-value">
          {children}
          {helper && <span className="ds-row-help">{helper}</span>}
        </span>
      )}
      {action}
    </div>
  );
}

function StudioAvatar() {
  // eslint-disable-next-line @next/next/no-img-element -- static 80px WebP; Figma Avatar Type=studio until logo upload exists
  return <img className="ds-avatar" src="/studio/3d/guldasta.webp" alt="" width={40} height={40} />;
}

/* What a manager can do (Sozlamalar · menejer, Menejer qoʻshish) */
function Rights({ you }: { you?: boolean }) {
  return (
    <ul className="ds-rights">
      <li>
        <StudioIcon name="check" size={18} />
        Kalendar: kun ochish va yopish
      </li>
      <li>
        <StudioIcon name="check" size={18} />
        Buyurtma va toʻlov qoʻshish
      </li>
      <li data-off>
        <StudioIcon name="lock" size={18} />
        {you ? "Dashboard, obuna va jamoa — faqat egasida" : "Dashboard, obuna va jamoa koʻrinmaydi"}
      </li>
    </ul>
  );
}

/* Obuna card (Figma 595:11841): days left first, then the price after the trial and the yearly deal */
function Plan({ trialEnds }: { trialEnds: string | null }) {
  const today = useToday(); // Toshkent calendar day; null during SSR
  const left = trialEnds && today ? Math.round((Date.parse(trialEnds.slice(0, 10)) - Date.parse(today)) / 86_400_000) : null;
  if (trialEnds && !today) return <span className="ds-skeleton" style={{ height: 120 }} />;
  const ended = left !== null && left <= 0;
  return (
    <>
      <div className="ds-plan-title">
        <p className="ds-h2">{left === null ? "Standart tarif" : ended ? "Bepul oy tugadi" : `${left} kun qoldi`}</p>
        <span className="ds-tag" data-tone={ended ? "due" : "brand"}>
          {left === null ? "Faol" : ended ? "Tugagan" : "Bepul oy"}
        </span>
      </div>
      <p className="ds-body ds-secondary">
        {left === null
          ? `${PRICE_MONTH} soʻm/oy — ${SEATS_INCLUDED} foydalanuvchigacha.`
          : ended
            ? "Maʼlumotlaringiz saqlanadi. Davom etish uchun tarifni tanlang."
            : `${dayMonth(trialEnds!)}gacha bepul. Keyin ${PRICE_MONTH} soʻm/oy — ${SEATS_INCLUDED} foydalanuvchigacha. Maʼlumotlaringiz hech qachon oʻchmaydi`}
      </p>
      {left !== null && !ended && (
        <div className="ds-meter" role="meter" aria-label="Bepul oy" aria-valuemin={0} aria-valuemax={TRIAL_DAYS} aria-valuenow={Math.min(left, TRIAL_DAYS)} aria-valuetext={`${left} kun qoldi`}>
          <i style={{ width: `${(Math.min(left, TRIAL_DAYS) / TRIAL_DAYS) * 100}%` }} />
        </div>
      )}
      <div className="ds-plan-foot">
        <span className="ds-body">Yillik toʻlovda 2 oy tekin — {PRICE_YEAR} soʻm/yil</span>
        <a className="ds-btn" data-style="secondary" data-on-card href="/#narxlar" target="_blank" rel="noreferrer">
          Tarifni tanlash
        </a>
      </div>
    </>
  );
}

/* Theme as a text segment (Figma Inputs/Segment: Yorugʻ / Qorongʻi) */
function ThemeSegment() {
  const [theme, setTheme] = useState<PanelTheme>(() => (typeof window === "undefined" ? "light" : storedTheme()));
  const opts: [PanelTheme, string][] = [
    ["light", "Yorugʻ"],
    ["dark", "Qorongʻi"],
  ];
  return (
    <div className="ds-segment" role="radiogroup" aria-labelledby="theme-label" data-on-card>
      {opts.map(([t, label]) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => {
            setTheme(t);
            applyTheme(t);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function NameDialog({ initial, onClose, onSave }: { initial: string; onClose(): void; onSave(name: string): Promise<void> }) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Studiya nomi" size="sm" onClose={onClose}>
      <form
        noValidate
        style={{ display: "contents" }}
        onSubmit={async (e) => {
          e.preventDefault();
          const v = name.trim();
          if (v.length < 2) return setError("Kamida 2 ta belgi");
          if (v === initial) return onClose();
          setBusy(true);
          try {
            await onSave(v);
          } catch (err) {
            setError(err instanceof ApiError ? (err.fields?.name ?? err.message) : "Saqlab boʻlmadi");
            setBusy(false);
          }
        }}
      >
        <div className="ds-field">
          <label htmlFor="studio-name">Nomi</label>
          <input
            id="studio-name"
            className="ds-input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={60}
            autoComplete="organization"
            data-autofocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "studio-name-err" : undefined}
          />
          {error && (
            <p id="studio-name-err" className="ds-helper" data-error>
              {error}
            </p>
          )}
        </div>
        <div className="ds-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Ortga
          </Button>
          <Button type="submit" loading={busy}>
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryDialog({ initial, onClose, onSave }: { initial: Category; onClose(): void; onSave(c: Category): Promise<void> }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const opts: { value: Category; hint: string }[] = [
    { value: "dekor", hint: "Arka, sahna, stol" },
    { value: "floristika", hint: "Guldasta, kompozitsiya" },
  ];
  return (
    <Modal title="Yoʻnalish" size="sm" onClose={onClose}>
      <div className="ds-options" role="radiogroup" aria-label="Yoʻnalish">
        {opts.map((o, i) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className="ds-option"
              data-autofocus={on || undefined}
              onClick={() => setValue(o.value)}
              onKeyDown={(e) => {
                if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
                e.preventDefault();
                const next = opts[(i + 1) % opts.length];
                setValue(next.value);
                (e.currentTarget.parentElement?.children[(i + 1) % opts.length] as HTMLElement | undefined)?.focus();
              }}
            >
              <div>
                <span className="ds-body-strong">{CATEGORY[o.value]}</span>
                <span className="ds-radio" aria-hidden>
                  {on && <StudioIcon name="check" size={14} />}
                </span>
              </div>
              <p>{o.hint}</p>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="ds-alert" role="alert">
          {error}
        </p>
      )}
      <div className="ds-modal-foot">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Ortga
        </Button>
        <Button
          loading={busy}
          onClick={async () => {
            if (value === initial) return onClose();
            setBusy(true);
            try {
              await onSave(value);
            } catch (e) {
              setError(e instanceof ApiError ? e.message : "Saqlab boʻlmadi");
              setBusy(false);
            }
          }}
        >
          Saqlash
        </Button>
      </div>
    </Modal>
  );
}

/* Menejer qoʻshish (Figma 596:12216). A fresh one-time link per open: the token is never stored in clear,
   so an old link can't be shown again. */
function InviteDialog({ studioName, seat, onClose, say }: { studioName: string; seat: number; onClose(): void; say(t: string): void }) {
  const { tg } = usePanel();
  const [invite, setInvite] = useState<{ link: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode double-mount must not mint two links
    started.current = true;
    api<{ link: string; expiresAt: string }>("/api/panel/invites", { body: {} })
      .then((r) => setInvite(r))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Link yaratib boʻlmadi"));
  }, []);

  const link = invite?.link ?? null;
  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // clipboard blocked (some webviews) — select the text for a manual copy
      const el = document.getElementById("invite-link");
      if (el) window.getSelection()?.selectAllChildren(el);
      return say("Linkni belgilab nusxa oling");
    }
    setCopied(true);
    say("Link nusxalandi");
  }

  const text = `${studioName} jamoasiga qoʻshiling — Floreal`;
  const share = link ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` : "#";

  return (
    <Modal title="Menejer qoʻshish" size="lg" onClose={onClose}>
      <p className="ds-body ds-secondary">Linkni menejerga Telegram’da yuboring. U bosganda bot uni {studioName} jamoasiga qoʻshadi</p>
      {error ? (
        <p className="ds-alert" role="alert">
          {error}
        </p>
      ) : (
        <div className="ds-field">
          <span className="ds-label-strong" id="invite-label">
            Taklif linki
          </span>
          {link ? (
            <div className="ds-linkbox" role="group" aria-labelledby="invite-label">
              <span id="invite-link" className="ds-body-medium">
                {link.replace(/^https?:\/\//, "")}
              </span>
              <Button variant="ghost" onClick={copy} icon={<StudioIcon name={copied ? "check" : "copy"} variant={copied ? "Line" : "Filled"} />}>
                {copied ? "Nusxalandi" : "Nusxalash"}
              </Button>
            </div>
          ) : (
            <span className="ds-skeleton" style={{ height: 52, borderRadius: "var(--ds-radius-lg)" }} aria-label="Link tayyorlanmoqda" />
          )}
          <p className="ds-label ds-secondary">Bir martalik · {invite ? `${dayMonth(invite.expiresAt)}gacha amal qiladi` : `${7} kun amal qiladi`} · bekor qilsangiz darhol ishlamay qoladi</p>
        </div>
      )}
      <div className="ds-perms">
        <p className="ds-label-strong">Menejer nima qila oladi</p>
        <Rights />
      </div>
      <div className="ds-modal-foot ds-invfoot">
        <span className="ds-label ds-secondary">
          {seat}-oʻrin · {seat <= SEATS_INCLUDED ? "tarifga kiradi" : "+49 000 soʻm/oy"}
        </span>
        <Button variant="ghost" onClick={onClose}>
          Yopish
        </Button>
        {tg ? (
          <Button disabled={!link} icon={<StudioIcon name="send" variant="Filled" />} onClick={() => link && (tg.openTelegramLink ? tg.openTelegramLink(share) : window.open(share, "_blank"))}>
            Telegram’da yuborish
          </Button>
        ) : (
          <a className="ds-btn" data-style="primary" data-size="m" href={link ? share : undefined} target="_blank" rel="noreferrer" aria-disabled={!link || undefined}>
            <StudioIcon name="send" variant="Filled" />
            <span>Telegram’da yuborish</span>
          </a>
        )}
      </div>
    </Modal>
  );
}
