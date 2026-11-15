"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "../Button";
import { StudioIcon } from "../icons";
import { usePanel, type Me } from "../PanelProvider";
import { telegramLoginPopup } from "../telegram";
import { Illustration, type StudioArt } from "../StateBlock";

type Config = {
  botId: number | null;
  botUsername: string | null;
  devLogin: boolean;
};

/* Figma "Login/Slide" (204:724) — one per product promise, every claim true for v1. */
const SLIDES: { art: StudioArt; title: string; text: string }[] = [
  {
    art: "kalendar",
    title: "Bandlik bir qarashda",
    text: "Qaysi kun band, qaysi kunda bitta joy qolgan — kalendarda koʻrinadi.",
  },
  {
    art: "pul",
    title: "Avans va qoldiq nazoratda",
    text: "Har buyurtmada kim qancha toʻlagani va qancha qolgani.",
  },
  {
    art: "bot",
    title: "Ertangi tadbirlar — Telegram'da",
    text: "Har kecha bot ertangi buyurtmalar va olinadigan qoldiqni yuboradi.",
  },
];
const SLIDE_MS = 5000;

/* Auto-advances every 5 s; pauses on hover / keyboard focus / hidden tab; never moves with prefers-reduced-motion (WCAG 2.2.2). */
function Slides() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0); // restarts the timer after a manual pick
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const t = setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, [paused, tick]);
  return (
    <section
      ref={ref}
      className="ds-auth-media"
      aria-roledescription="carousel"
      aria-label="Datelle Studio imkoniyatlari"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) =>
        !ref.current?.contains(e.relatedTarget as Node) && setPaused(false)
      }
    >
      <div className="ds-brandline">
        <span className="ds-mark" data-size="lg" aria-hidden>
          D
        </span>
        <span className="ds-body-strong">Datelle Studio</span>
      </div>
      <div className="ds-slides" aria-live="off">
        {SLIDES.map((s, n) => (
          <div
            key={s.art}
            className="ds-slide"
            data-active={n === i || undefined}
            role="group"
            aria-roledescription="slayd"
            aria-label={`${n + 1} / ${SLIDES.length}`}
            aria-hidden={n !== i}
          >
            <div className="ds-slide-hero">
              <Illustration art={s.art} />
            </div>
            <p className="ds-slide-copy">
              <b>{s.title}</b>
              <span>{s.text}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="ds-dots">
        {SLIDES.map((s, n) => (
          <button
            key={s.art}
            type="button"
            aria-label={`${n + 1}-slayd: ${s.title}`}
            aria-current={n === i}
            onClick={() => {
              setI(n);
              setTick((t) => t + 1);
            }}
          />
        ))}
      </div>
    </section>
  );
}

/* S1 · Kirish v3 (Figma 22:10519 · xato 117:15987). Desktop: green stage → card = 3D slides + auth column.
   Mini App never lands here — it signs in from initData. */
export function KirishScreen() {
  const { state, setMe } = usePanel();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [busy, setBusy] = useState<"tg" | "dev" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Config>("/api/panel/auth/config")
      .then(setCfg)
      .catch(() => setCfg({ botId: null, botUsername: null, devLogin: false }));
  }, []);

  async function signInTelegram() {
    if (!cfg?.botId) return;
    setBusy("tg");
    setError(null);
    try {
      const user = await telegramLoginPopup(cfg.botId);
      if (!user) return; // closed the popup — not an error
      setMe(await api<Me>("/api/panel/auth/widget", { body: user }));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Qayta urinib koʻring. Brauzer uchinchi tomon cookie'larini bloklamaganini tekshiring.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function signInDev() {
    setBusy("dev");
    setError(null);
    try {
      setMe(
        await api<Me>("/api/panel/auth/dev", {
          body: { id: 700000001, firstName: "Ibrohim" },
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Xatolik yuz berdi");
    } finally {
      setBusy(null);
    }
  }

  const unavailable = cfg && !cfg.botId;

  return (
    <div className="ds-auth">
      <div className="ds-auth-card">
        <Slides />

        <main className="ds-auth-main">
          <div className="ds-auth-box">
            <Illustration
              art={error ? "xato" : "kalendar"}
              className="ds-mobile-only"
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--ds-space-8)",
              }}
            >
              <h1 className="ds-h1">Kirish</h1>
              <p className="ds-body ds-secondary">
                Telegram akkauntingiz orqali
              </p>
            </div>

            {error && (
              <div className="ds-alert" data-tone="danger" role="alert">
                <span className="ds-alert-icon" aria-hidden>
                  !
                </span>
                <div>
                  <b>Telegram bilan bogʻlanib boʻlmadi</b>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <Button
              size="l"
              block
              loading={busy === "tg" || !cfg || state.status !== "anon"}
              disabled={Boolean(unavailable) || busy === "dev"}
              onClick={signInTelegram}
              icon={
                <StudioIcon
                  name={error ? "refresh-cw" : "send"}
                  variant={error ? "Line" : "Filled"}
                />
              }
            >
              {error ? "Qayta urinish" : "Telegram orqali kirish"}
            </Button>

            {unavailable ? (
              <p className="ds-helper">
                Telegram orqali kirish hali sozlanmagan
              </p>
            ) : (
              <p className="ds-auth-note">
                Bu qurilmada 30 kun kirgan holda qolasiz
              </p>
            )}

            {cfg?.botUsername && (
              <p
                className="ds-label"
                style={{
                  display: "flex",
                  gap: "var(--ds-space-8)",
                  flexWrap: "wrap",
                }}
              >
                <span className="ds-secondary">Studiya yoʻqmi?</span>
                <a
                  className="ds-label-strong ds-brand"
                  href={`https://t.me/${cfg.botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{cfg.botUsername} ni oching
                </a>
              </p>
            )}

            {cfg?.devLogin && state.status === "anon" && (
              <Button
                variant="ghost"
                onClick={signInDev}
                loading={busy === "dev"}
                disabled={busy === "tg"}
              >
                Test sifatida kirish
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
