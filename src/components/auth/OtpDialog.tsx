"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PhoneField, isPhoneValid } from "@/components/ui/Form";
import { setSessionUser, type User } from "./session";

type OtpRes = { phone: string; resendIn: number; devCode?: string };

/* B1/B2 · Telefon va SMS kod — one dialog, two steps. Used inline by booking forms and by /kirish. */
export function OtpForm({ initialPhone = "", name, onDone, autoSend }: { initialPhone?: string; name?: string; onDone: (u: User) => void; autoSend?: boolean }) {
  const [phone, setPhone] = useState(initialPhone);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<OtpRes | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const codeRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const send = async () => {
    if (!isPhoneValid(phone)) return setErr("Raqamni toʻliq kiriting");
    setBusy(true);
    setErr(undefined);
    try {
      const res = await api<OtpRes>("/api/auth/otp", { body: { phone } });
      setSent(res);
      setLeft(res.resendIn);
      setStep("code");
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae.fields?.phone ?? ae.message);
      if (ae.code === "otp_cooldown") {
        setStep("code");
        setLeft(Number(ae.extra.retryAfter) || 60);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autoSend && !started.current && isPhoneValid(initialPhone)) {
      started.current = true;
      void send(); // one-shot kick-off when opened from a form
    }
  });

  const verify = async (c = code) => {
    if (!/^\d{6}$/.test(c)) return setErr("Kod 6 ta raqamdan iborat");
    setBusy(true);
    setErr(undefined);
    try {
      const { user } = await api<{ user: User }>("/api/auth/verify", { body: { phone, code: c, ...(name ? { name } : {}) } });
      setSessionUser(user);
      onDone(user);
    } catch (e) {
      setErr((e as ApiError).message);
      setBusy(false);
    }
  };

  if (step === "phone")
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <PhoneField value={phone} onChange={(v) => (setPhone(v), setErr(undefined))} error={err} />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "Yuborilmoqda…" : "Kod olish"}
        </Button>
        <p className="t-cap text-ink-3">Raqamingizga 6 xonali SMS kod yuboramiz. Raqam studiyaga faqat bron tasdiqlangandan keyin koʻrinadi.</p>
      </form>
    );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void verify();
      }}
    >
      <p className="t-body-s text-ink-2">
        <b className="font-semibold text-ink">{phone}</b> raqamiga kod yuborildi.{" "}
        <button type="button" onClick={() => (setStep("phone"), setErr(undefined))} className="font-semibold text-brand hover:underline">
          Oʻzgartirish
        </button>
      </p>
      {sent?.devCode && (
        <p className="rounded-lg bg-warning-subtle px-3 py-2 t-cap-m text-warning-subtle-text">
          Demo rejim — SMS yuborilmaydi. Kod: <b className="font-semibold tracking-[0.2em]">{sent.devCode}</b>
        </p>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="otp" className="text-[14px] leading-[18px] font-medium text-ink-2">
          SMS kod
        </label>
        <input
          ref={codeRef}
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          aria-invalid={!!err}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            setErr(undefined);
            if (v.length === 6) void verify(v);
          }}
          className={`h-14 w-full rounded-lg border bg-surface px-4 text-center text-[24px] leading-8 font-semibold tracking-[0.5em] outline-none focus:border-[1.5px] focus:border-brand ${err ? "border-error" : "border-line"}`}
          placeholder="••••••"
        />
        {err && <span className="t-cap text-error">{err}</span>}
      </div>
      <Button type="submit" size="lg" disabled={busy || code.length !== 6} className="w-full">
        {busy ? "Tekshirilmoqda…" : "Tasdiqlash"}
      </Button>
      <button type="button" disabled={left > 0 || busy} onClick={() => void send()} className="t-body-sm text-brand disabled:text-ink-3">
        {left > 0 ? `Kodni qayta yuborish — ${left} s` : "Kodni qayta yuborish"}
      </button>
    </form>
  );
}

export function OtpDialog({ open, phone, name, onClose, onDone }: { open: boolean; phone: string; name?: string; onClose: () => void; onDone: (u: User) => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        aria-labelledby="otp-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col gap-5 rounded-t-3xl bg-surface p-6 shadow-03 sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="otp-title" className="t-h3">
              Raqamni tasdiqlang
            </h2>
            <p className="t-body-s text-ink-2">Bir marta — keyingi bronlar uchun kerak boʻlmaydi.</p>
          </div>
          <button type="button" aria-label="Yopish" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface-subtle">
            <Icon name="x" />
          </button>
        </div>
        <OtpForm initialPhone={phone} name={name} onDone={onDone} autoSend />
      </div>
    </div>
  );
}
