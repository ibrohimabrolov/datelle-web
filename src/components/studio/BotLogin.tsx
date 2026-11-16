"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import type { Me } from "./PanelProvider";
import { api, ApiError } from "@/lib/api";
import { Button } from "./Button";
import { StudioIcon } from "./icons";

/* Desktop sign-in through @datelle_bot (Figma "S1 · Kirish · bot").
   Primary path on desktop: the Login Widget's confirmation message is sent by Telegram itself
   and sometimes never arrives. Here the bot asks, the user taps «Tasdiqlash», this browser polls. */
type Started = { start: string; code: string; expiresAt: string; url: string };
type Phase = { kind: "loading" } | { kind: "waiting"; login: Started; qr: string | null } | { kind: "expired" } | { kind: "declined" } | { kind: "error"; message: string };

const POLL_MS = 2000;

export function BotLogin({ onDone, onCancel }: { onDone(me: Me): void; onCancel(): void }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [now, setNow] = useState(() => Date.now());

  const start = useCallback(async () => {
    setPhase({ kind: "loading" });
    try {
      const login = await api<Started>("/api/panel/auth/bot", { method: "POST", body: {} });
      // QR is for desktop: scan with the phone, approve there. Light modules on white — scannable in dark mode too.
      const qr = await QRCode.toString(login.url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0f0f11ff", light: "#ffffffff" } }).catch(() => null);
      setPhase({ kind: "waiting", login, qr });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof ApiError ? e.message : "Internet aloqasini tekshirib, qayta urinib koʻring." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off the request once on mount
    void start();
  }, [start]);

  const waiting = phase.kind === "waiting" ? phase.login : null;
  useEffect(() => {
    if (!waiting) return;
    const expires = Date.parse(waiting.expiresAt);
    let stop = false;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      if (stop || document.hidden) return;
      if (Date.now() > expires + 5000) return setPhase({ kind: "expired" });
      try {
        const r = await api<{ state: string; me?: Me }>("/api/panel/auth/bot/poll", { method: "POST", body: {} });
        if (stop) return;
        if (r.state === "approved" && r.me) {
          stop = true;
          onDone(r.me);
        } else if (r.state === "declined") setPhase({ kind: "declined" });
        else if (r.state === "expired") setPhase({ kind: "expired" });
        else if (r.state === "missing") setPhase({ kind: "error", message: "Brauzer kirish soʻrovini saqlamadi. Cookie'lar yoqilganini tekshirib, qayta urining." });
      } catch {
        /* network blip — next tick retries */
      }
    }, POLL_MS);
    return () => {
      stop = true;
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [waiting, onDone]);

  if (phase.kind === "loading") {
    return (
      <div className="ds-botlogin" aria-busy="true">
        <div className="ds-botlogin-card" data-loading />
        <Button size="l" block loading>
          Telegram’ni ochish
        </Button>
      </div>
    );
  }

  if (phase.kind !== "waiting") {
    const [title, text] =
      phase.kind === "expired"
        ? ["Kod muddati tugadi", "Xavfsizlik uchun kod 5 daqiqa ishlaydi. Yangisini oling."]
        : phase.kind === "declined"
          ? ["Kirish bekor qilindi", "Botda «Bekor qilish» bosildi. Siz boʻlsangiz, qayta urining."]
          : ["Telegram bilan bogʻlanib boʻlmadi", phase.message];
    return (
      <div className="ds-botlogin">
        <div className="ds-alert" data-tone={phase.kind === "expired" ? "warning" : "danger"} role="alert">
          <span className="ds-alert-icon" aria-hidden>
            !
          </span>
          <div>
            <b>{title}</b>
            <span>{text}</span>
          </div>
        </div>
        <Button size="l" block icon={<StudioIcon name="refresh-cw" variant="Line" />} onClick={start}>
          {phase.kind === "expired" ? "Yangi kod olish" : "Qayta urinish"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Orqaga
        </Button>
      </div>
    );
  }

  const left = Math.max(0, Math.ceil((Date.parse(phase.login.expiresAt) - now) / 1000));
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <div className="ds-botlogin">
      <p className="ds-body ds-secondary">
        <span className="ds-desktop-only">Telefonda QR’ni skanerlang yoki tugmani bosing, keyin botda «Tasdiqlash»ni bosing.</span>
        <span className="ds-mobile-only">Tugmani bosing va botda «Tasdiqlash»ni bosing.</span>
      </p>
      <div className="ds-botlogin-card">
        {phase.qr && (
          <div className="ds-qr" role="img" aria-label="Telegram bot havolasi QR kodi" dangerouslySetInnerHTML={{ __html: phase.qr }} />
        )}
        <div className="ds-botlogin-code">
          <span className="ds-caps ds-secondary">Kod</span>
          <b aria-label={`Kod ${phase.login.code.split("").join(" ")}`}>{phase.login.code}</b>
          <span className="ds-label ds-secondary">Botdagi kod bilan bir xil boʻlsin</span>
        </div>
      </div>
      <a className="ds-btn" data-style="primary" data-size="l" data-block href={phase.login.url} target="_blank" rel="noreferrer">
        <StudioIcon name="send" variant="Filled" />
        <span>Telegram’ni ochish</span>
      </a>
      <p className="ds-botlogin-status" role="status">
        <span className="ds-spinner" aria-hidden />
        Tasdiqlash kutilmoqda · {mmss}
      </p>
      <Button variant="ghost" onClick={onCancel}>
        Boshqa usul bilan kirish
      </Button>
    </div>
  );
}
