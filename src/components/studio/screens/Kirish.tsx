"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "../Button";
import { StudioIcon } from "../icons";
import { usePanel, type Me } from "../PanelProvider";
import { telegramLoginPopup } from "../telegram";

type Config = { botId: number | null; botUsername: string | null; devLogin: boolean };

/* S1 · Kirish (Figma 22:10519). Desktop: brand panel + auth column. Mini App never lands here — it signs in from initData. */
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
      setError(e instanceof ApiError ? e.message : "Telegram bilan bogʻlanib boʻlmadi. Qayta urinib koʻring.");
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
        <p className="ds-hero">
          Sanalar, buyurtmalar
          <br />
          va pul — bir joyda
        </p>
        <p className="ds-body">Dekor studiyalari va floristlar uchun</p>
      </section>

      <main className="ds-auth-main">
        <div className="ds-auth-box">
          <div className="ds-mobile-only">
            <span className="ds-mark" data-size="lg" aria-hidden>
              D
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-8)" }}>
            <h1 className="ds-h1">Kirish</h1>
            <p className="ds-body ds-secondary">Telegram akkauntingiz orqali</p>
          </div>

          <Button
            size="l"
            block
            loading={busy === "tg" || !cfg || state.status !== "anon"}
            disabled={Boolean(unavailable) || busy === "dev"}
            onClick={signInTelegram}
            icon={<StudioIcon name="send" variant="Filled" />}
          >
            Telegram orqali kirish
          </Button>

          {unavailable && <p className="ds-helper">Telegram orqali kirish hali sozlanmagan</p>}
          {error && (
            <p className="ds-alert" role="alert">
              {error}
            </p>
          )}

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
