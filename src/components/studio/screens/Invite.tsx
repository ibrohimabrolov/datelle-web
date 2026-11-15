"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "../Button";
import { StudioIcon } from "../icons";
import { Splash, usePanel, type Me } from "../PanelProvider";
import { initials } from "./Settings";

type Preview = { studio: { id: string; name: string }; inviter: string | null; role: "owner" | "manager"; status: "ok" | "used" | "expired" | "member" };
type View = { kind: "loading" } | { kind: "preview"; p: Preview } | { kind: "invalid" } | { kind: "error"; message: string };

/* S0 · Taklif (Figma 19:476; expired 34:2219). The token waits in the provider across the login step. */
export function InviteScreen() {
  const { state, tg, invite, clearInvite, setMe } = usePanel();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const ready = state.status === "ready";

  useEffect(() => {
    if (!ready || !invite) return;
    let alive = true;
    api<Preview>(`/api/panel/invites/preview?t=${encodeURIComponent(invite)}`)
      .then((p) => alive && setView({ kind: "preview", p }))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 404) setView({ kind: "invalid" });
        else setView({ kind: "error", message: e instanceof ApiError ? e.message : "Xatolik yuz berdi" });
      });
    return () => {
      alive = false;
    };
  }, [ready, invite]);

  async function join() {
    if (!invite || joining) return;
    setJoining(true);
    setJoinError(null);
    tg?.MainButton.showProgress();
    try {
      const r = await api<Me & { studioId: string; joined: boolean }>("/api/panel/invites/accept", { body: { token: invite } });
      tg?.HapticFeedback?.notificationOccurred("success");
      clearInvite();
      setMe(r, r.studioId); // provider routes the new manager to Kalendar
    } catch (e) {
      tg?.HapticFeedback?.notificationOccurred("error");
      if (e instanceof ApiError && e.status === 410 && view.kind === "preview")
        setView({ kind: "preview", p: { ...view.p, status: e.code === "invite_expired" ? "expired" : "used" } });
      else setJoinError(e instanceof ApiError ? e.message : "Qoʻshilib boʻlmadi. Qayta urinib koʻring.");
      setJoining(false);
      tg?.MainButton.hideProgress();
    }
  }
  const onMain = useEffectEvent(() => void join());

  const canJoin = view.kind === "preview" && view.p.status === "ok";
  useEffect(() => {
    if (!tg || !canJoin) return;
    const onClick = () => onMain();
    tg.MainButton.setParams({ text: "Qoʻshilish", is_visible: true, is_active: true });
    tg.MainButton.onClick(onClick);
    return () => {
      tg.MainButton.offClick(onClick);
      tg.MainButton.hide();
    };
  }, [tg, canJoin]);

  if (!ready || !invite || view.kind === "loading") return <Splash />;

  if (view.kind !== "preview" || view.p.status !== "ok") {
    const p = view.kind === "preview" ? view.p : null;
    const ask = p?.inviter ? `${p.inviter}dan yangi link soʻrang` : "Studiya egasidan yangi link soʻrang";
    const copy =
      view.kind === "invalid"
        ? { title: "Link notoʻgʻri", body: "Linkni toʻliq nusxalab, qayta oching" }
        : view.kind === "error"
          ? { title: "Ochib boʻlmadi", body: view.message }
          : p!.status === "member"
            ? { title: "Siz allaqachon jamoadasiz", body: p!.studio.name }
            : p!.status === "expired"
              ? { title: "Link eskirgan", body: ask }
              : { title: "Link ishlatilgan", body: ask };
    return (
      <main className="ds-invite">
        <div className="ds-invite-state">
          <div className="ds-state">
            <span className="ds-invite-icon" aria-hidden>
              <StudioIcon name={p?.status === "member" ? "check" : "lock"} variant="Filled" size={24} />
            </span>
            <h1 className="ds-h2">{copy.title}</h1>
            <p className="ds-body ds-secondary">{copy.body}</p>
          </div>
        </div>
        <div className="ds-invite-foot">
          <Button
            variant={p?.status === "member" ? "primary" : "secondary"}
            size="l"
            block
            onClick={() => {
              if (p?.status === "member" && state.status === "ready") setMe(state.me, p.studio.id);
              clearInvite();
            }}
          >
            {p?.status === "member" ? "Studiyaga oʻtish" : "Davom etish"}
          </Button>
        </div>
      </main>
    );
  }

  const { p } = view;
  return (
    <main className="ds-invite">
      <div className="ds-invite-body">
        <span className="ds-avatar" aria-hidden>
          {initials(p.studio.name)}
        </span>
        <h1 className="ds-invite-title">{p.studio.name}</h1>
        <p className="ds-body ds-secondary">{p.inviter ? `${p.inviter} sizni menejer qilib taklif qildi` : "Sizni menejer qilib taklif qilishdi"}</p>
        <ul className="ds-invite-caps" aria-label="Menejer nimalar qila oladi">
          <li>
            <StudioIcon name="calendar" variant="Filled" />
            Kalendar va buyurtmalar
          </li>
          <li>
            <StudioIcon name="check" />
            Toʻlov kiritish
          </li>
          <li data-off>
            <StudioIcon name="lock" variant="Filled" />
            Pul hisoboti — faqat egasida
          </li>
        </ul>
        {joinError && (
          <p className="ds-alert" role="alert" style={{ marginTop: "var(--ds-space-16)", width: "100%" }}>
            {joinError}
          </p>
        )}
      </div>
      <div className="ds-invite-foot">
        {/* In Telegram the native MainButton is the CTA (same as Onboarding) */}
        {!tg && (
          <Button size="l" block loading={joining} onClick={join}>
            Qoʻshilish
          </Button>
        )}
        <Button variant="ghost" size="l" block disabled={joining} onClick={clearInvite}>
          Rad etish
        </Button>
      </div>
    </main>
  );
}
