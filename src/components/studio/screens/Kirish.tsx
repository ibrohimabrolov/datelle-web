"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "../Button";
import { StudioIcon } from "../icons";
import { usePanel, type Me } from "../PanelProvider";
import { telegramLoginPopup } from "../telegram";
import { Illustration } from "../StateBlock";

type Config = { botId: number | null; botUsername: string | null; devLogin: boolean };

/* S1 · Kirish v2 (Figma 22:10519 · xato 117:15987). Desktop: inset surface card with 3D hero + auth column.
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
      setError(e instanceof ApiError ? e.message : "Qayta urinib koʻring. Brauzer uchinchi tomon cookie'larini bloklamaganini tekshiring.");
    } finally {
      setBusy(null);
    }
  }

  async function signInDev() {
    setBusy("dev");
    setError(null);
    try {
      setMe(await api<Me>("/api/panel/auth/dev", { body: { id: 700000001, firstName: "Ibrohim" } }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Xatolik yuz berdi");
    } finally {
      setBusy(null);
    }
  }

  const unavailable = cfg && !cfg.botId;

  return (
    <div className="ds-auth">
      <section className="ds-auth-brand" aria-hidden>
        <div className="ds-brandline" style={{ padding: 0, gap: "var(--ds-space-12)" }}>
          <span className="ds-mark" data-size="lg">
            D
          </span>
          <span className="ds-body-strong">Datelle Studio</span>
        </div>
        <div className="ds-auth-hero">
          <Illustration art="kalendar" />
        </div>
        <div className="ds-auth-copy">
          <p className="ds-hero">
            Sanalar, buyurtmalar
            <br />
            va pul — bir joyda
          </p>
          <p className="ds-body ds-secondary">Dekor studiyalari va floristlar uchun</p>
        </div>
      </section>

      <main className="ds-auth-main">
        <div className="ds-auth-box">
          {error ? <Illustration art="xato" /> : <Illustration art="kalendar" className="ds-mobile-only" />}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-8)" }}>
            <h1 className="ds-h1">Kirish</h1>
            <p className="ds-body ds-secondary">Telegram akkauntingiz orqali</p>
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
            icon={<StudioIcon name={error ? "refresh-cw" : "send"} variant={error ? "Line" : "Filled"} />}
          >
            {error ? "Qayta urinish" : "Telegram orqali kirish"}
          </Button>

          {unavailable && <p className="ds-helper">Telegram orqali kirish hali sozlanmagan</p>}

          {cfg?.botUsername && (
            <p className="ds-label" style={{ display: "flex", gap: "var(--ds-space-8)", flexWrap: "wrap" }}>
              <span className="ds-secondary">Studiya yoʻqmi?</span>
              <a className="ds-label-strong ds-brand" href={`https://t.me/${cfg.botUsername}`} target="_blank" rel="noreferrer">
                @{cfg.botUsername} ni oching
              </a>
            </p>
          )}

          {cfg?.devLogin && state.status === "anon" && (
            <Button variant="ghost" onClick={signInDev} loading={busy === "dev"} disabled={busy === "tg"}>
              Test sifatida kirish
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
