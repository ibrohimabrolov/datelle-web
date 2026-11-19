"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { MONTHS } from "@/lib/dates";
import { ThemeSwitch } from "../AuthTools";
import { Button } from "../Button";
import { useDataVersion, dataChanged } from "../data";
import { StudioIcon } from "../icons";
import { ConfirmDialog, Modal } from "../Modal";
import { usePanel, useStudio, type Me, type Studio } from "../PanelProvider";
import { PageHead } from "../Shell";
import { Toast, type ToastMsg } from "../Toast";

type Category = Studio["category"];
const CATEGORY: Record<Category, string> = { dekor: "Dekor", floristika: "Floristika" };
const CAP_MIN = 1;
const CAP_MAX = 20;

type Details = { studio: { id: string; name: string; category: Category; dailyCapacity: number; plan: "founding" | "standard"; trialEndsAt: string | null }; role: Studio["role"] };
type Member = { userId: string; name: string; username: string | null; role: Studio["role"]; lastSeenAt: string | null; isYou: boolean };
type Invite = { id: string; expiresAt: string };
type Layer = { kind: "name" } | { kind: "category" } | { kind: "invite" } | { kind: "remove"; member: Member } | null;

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

const daysLeft = (iso: string) => Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

/* S6 · Sozlamalar (Figma 22:10541 desktop / 7:548 mobile) */
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

  if (!ctx)
    return (
      <>
        <PageHead title="Sozlamalar" settings={false} />
        <div className="ds-settings">
          <span className="ds-skeleton" style={{ height: 220, borderRadius: "var(--ds-radius-xl)" }} />
          <span className="ds-skeleton" style={{ height: 192, borderRadius: "var(--ds-radius-xl)" }} />
          <span className="ds-skeleton" style={{ height: 100, borderRadius: "var(--ds-radius-xl)" }} />
        </div>
      </>
    );
  const { me, studio } = ctx;
  const others = me.studios.filter((s) => s.id !== studio.id);
  const trialEnds = details?.studio.trialEndsAt;

  return (
    <>
      <PageHead title="Sozlamalar" settings={false} />
      <div className="ds-settings">
        <Section title="Studiya">
          <ul className="ds-list">
            <EditRow label="Nomi" value={studio.name} editable={isOwner} onEdit={() => setLayer({ kind: "name" })} />
            <EditRow label="Yoʻnalish" value={CATEGORY[studio.category]} editable={isOwner} onEdit={() => setLayer({ kind: "category" })} />
            <li className="ds-li">
              <div className="ds-li-main">
                <span className="ds-li-title" id="cap-label">
                  Kunlik sigʻim
                </span>
                <span className="ds-li-sub">Bir kunda nechta tadbir</span>
              </div>
              {isOwner ? (
                <div className="ds-stepper" data-size="s" role="group" aria-labelledby="cap-label">
                  <button type="button" onClick={() => stepCapacity(-1)} disabled={shownCap <= CAP_MIN} aria-label="Kamaytirish">
                    −
                  </button>
                  <output aria-live="polite">{shownCap}</output>
                  <button type="button" onClick={() => stepCapacity(1)} disabled={shownCap >= CAP_MAX} aria-label="Koʻpaytirish">
                    +
                  </button>
                </div>
              ) : (
                <span className="ds-li-value">{studio.dailyCapacity} ta</span>
              )}
            </li>
          </ul>
        </Section>

        {others.length > 0 && (
          <Section title="Studiyalaringiz">
            <ul className="ds-list" role="radiogroup" aria-label="Faol studiya">
              {me.studios.map((s) => (
                <li key={s.id} className="ds-li">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={s.id === studio.id}
                    className="ds-li-cover"
                    onClick={() => s.id !== studio.id && switchStudio(s.id)}
                  >
                    <span className="ds-avatar" aria-hidden>
                      {initials(s.name)}
                    </span>
                    <span className="ds-li-main">
                      <span className="ds-li-title">{s.name}</span>
                      <span className="ds-li-sub">{s.role === "owner" ? "Egasi" : "Menejer"}</span>
                    </span>
                    {s.id === studio.id && <StudioIcon name="check" className="ds-brand" />}
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {isOwner && (
          <Section
            title={members ? `Jamoa · ${members.length}` : "Jamoa"}
            action={
              <Button variant="secondary" className="ds-desktop-only" icon={<StudioIcon name="users" variant="Filled" />} onClick={() => setLayer({ kind: "invite" })}>
                Menejer qoʻshish
              </Button>
            }
          >
            <ul className="ds-list">
              {!members && (
                <li className="ds-li" aria-hidden>
                  <span className="ds-skeleton" style={{ height: 40, width: "60%" }} />
                </li>
              )}
              {members?.map((m) => (
                <li key={m.userId} className="ds-li" data-tall>
                  <span className="ds-avatar" aria-hidden>
                    {initials(m.name)}
                  </span>
                  <div className="ds-li-main">
                    <span className="ds-li-title">{m.name}</span>
                    <span className="ds-li-sub">{m.isYou ? "Siz" : seen(m.lastSeenAt)}</span>
                  </div>
                  {m.role === "owner" ? (
                    <span className="ds-tag" data-tone="brand">
                      Egasi
                    </span>
                  ) : (
                    <>
                      <span className="ds-li-value">Menejer</span>
                      <button type="button" className="ds-textbtn" data-tone="danger" onClick={() => setLayer({ kind: "remove", member: m })} aria-label={`${m.name}ni chiqarish`}>
                        Chiqarish
                      </button>
                    </>
                  )}
                </li>
              ))}
              {invites.map((inv) => (
                <li key={inv.id} className="ds-li">
                  <span className="ds-avatar" data-tone="muted" aria-hidden>
                    <StudioIcon name="send" variant="Filled" size={18} />
                  </span>
                  <div className="ds-li-main">
                    <span className="ds-li-title">Taklif yuborilgan</span>
                    <span className="ds-li-sub">Link yana {daysLeft(inv.expiresAt)} kun amal qiladi</span>
                  </div>
                  <button
                    type="button"
                    className="ds-textbtn"
                    data-tone="danger"
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
                  </button>
                </li>
              ))}
              <li className="ds-li ds-mobile-only">
                <button type="button" className="ds-li-cover ds-brand" onClick={() => setLayer({ kind: "invite" })}>
                  <StudioIcon name="users" variant="Filled" />
                  <span className="ds-li-title">Menejer qoʻshish</span>
                </button>
              </li>
            </ul>
          </Section>
        )}

        {/* Figma desktop draws 3 toggles; only the evening digest exists in the bot (cron 20:00) — one honest switch */}
        <Section title="Eslatma">
          <ul className="ds-list">
            <li className="ds-li">
              <div className="ds-li-main">
                <span className="ds-li-title" id="rem-label">
                  Kechki eslatma
                </span>
                <span className="ds-li-sub" id="rem-sub">
                  Ertangi tadbirlar · har kuni 20:00 da botda
                </span>
              </div>
              <button type="button" role="switch" aria-checked={remindersOn} aria-labelledby="rem-label" aria-describedby="rem-sub" className="ds-switch" onClick={toggleReminders} />
            </li>
          </ul>
        </Section>

        {/* Telegram decides the Mini App theme; the web panel remembers its own (light by default) */}
        {!tg && (
          <Section title="Koʻrinish">
            <ul className="ds-list">
              <li className="ds-li">
                <div className="ds-li-main">
                  <span className="ds-li-title">Mavzu</span>
                  <span className="ds-li-sub">Shu brauzerda saqlanadi</span>
                </div>
                <ThemeSwitch />
              </li>
            </ul>
          </Section>
        )}

        <Section title="Obuna">
          <div className="ds-plan">
            <div className="ds-li-main">
              <span className="ds-li-title">{details ? (trialEnds ? "Bepul oy" : "Standart") : " "}</span>
              <span className="ds-li-sub">{details ? (trialEnds ? `${dayMonth(trialEnds)}gacha bepul` : "Faol") : " "}</span>
            </div>
            <span className="ds-tag" data-tone="plan">
              Faol
            </span>
          </div>
        </Section>

        <Section title="Hisob">
          <ul className="ds-list">
            <li className="ds-li" data-tall>
              <div className="ds-li-main">
                <span className="ds-li-title">Telegram orqali kirgansiz</span>
                <span className="ds-li-sub">{[me.user.username ? `@${me.user.username}` : me.user.name, tg ? "Telegram ilovasida" : "shu brauzerda"].join(" · ")}</span>
              </div>
              {/* In the Mini App the session is re-created on every open, so "Chiqish" would be a no-op */}
              {!tg && (
                <Button
                  variant="secondary"
                  loading={leaving}
                  onClick={async () => {
                    setLeaving(true);
                    await signOut();
                  }}
                >
                  Chiqish
                </Button>
              )}
            </li>
          </ul>
        </Section>
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
      {layer?.kind === "invite" && (
        <InviteDialog
          studioName={studio.name}
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
          title={`${layer.member.name.split(" ")[0]} chiqarilsinmi?`}
          description="Kalendar va buyurtmalarni boshqa koʻrmaydi. Kiritgan toʻlovlari saqlanib qoladi."
          confirm="Chiqarish"
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
      <Toast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section className="ds-set-section" aria-labelledby={id}>
      <div className="ds-set-head">
        <h2 id={id} className="ds-caps">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* Desktop: label · value · "Oʻzgartirish"; mobile: the whole row is the button, chevron at the end */
function EditRow({ label, value, editable, onEdit }: { label: string; value: string; editable: boolean; onEdit(): void }) {
  return (
    <li className="ds-li ds-editrow">
      <span className="ds-li-label">{label}</span>
      <span className="ds-li-value">{value}</span>
      {editable && (
        <button type="button" className="ds-textbtn ds-li-stretch" onClick={onEdit} aria-label={`${label}ni oʻzgartirish`}>
          <span className="ds-desktop-only">Oʻzgartirish</span>
          <StudioIcon name="chevron-right" className="ds-mobile-only" />
        </button>
      )}
    </li>
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

/* A fresh one-time link per open: the token is never stored in clear, so an old link can't be shown again */
function InviteDialog({ studioName, onClose, say }: { studioName: string; onClose(): void; say(t: string): void }) {
  const { tg } = usePanel();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode double-mount must not mint two links
    started.current = true;
    api<{ link: string }>("/api/panel/invites", { body: {} })
      .then((r) => setLink(r.link))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Link yaratib boʻlmadi"));
  }, []);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      inputRef.current?.select(); // clipboard blocked (some webviews) — leave it selected for a manual copy
      return say("Linkni belgilab nusxa oling");
    }
    setCopied(true);
    say("Link nusxalandi");
  }

  const text = `${studioName} jamoasiga qoʻshiling — Floreal`;
  const share = link ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` : "#";

  return (
    <Modal title="Menejer qoʻshish" onClose={onClose}>
      <p className="ds-body ds-secondary">Linkni menejeringizga yuboring. U bir marta ishlaydi va 7 kun amal qiladi.</p>
      {error ? (
        <p className="ds-alert" role="alert">
          {error}
        </p>
      ) : (
        <div className="ds-field">
          <label htmlFor="invite-link">Taklif linki</label>
          {link ? (
            <input id="invite-link" ref={inputRef} className="ds-input" value={link} readOnly onFocus={(e) => e.currentTarget.select()} />
          ) : (
            <span className="ds-skeleton" style={{ height: 52, borderRadius: "var(--ds-radius-md)" }} aria-label="Link tayyorlanmoqda" />
          )}
        </div>
      )}
      <div className="ds-modal-foot" data-split>
        <Button variant="secondary" disabled={!link} onClick={copy} icon={copied ? <StudioIcon name="check" /> : undefined}>
          {copied ? "Nusxalandi" : "Nusxalash"}
        </Button>
        {tg ? (
          <Button disabled={!link} icon={<StudioIcon name="send" variant="Filled" />} onClick={() => link && (tg.openTelegramLink ? tg.openTelegramLink(share) : window.open(share, "_blank"))}>
            Telegram&apos;da yuborish
          </Button>
        ) : (
          <a className="ds-btn" data-style="primary" data-size="m" href={link ? share : undefined} target="_blank" rel="noreferrer" aria-disabled={!link || undefined}>
            <StudioIcon name="send" variant="Filled" />
            <span>Telegram&apos;da yuborish</span>
          </a>
        )}
      </div>
    </Modal>
  );
}
