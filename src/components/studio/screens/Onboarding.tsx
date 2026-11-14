"use client";

import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "../Button";
import { Splash, usePanel, type Me, type Studio } from "../PanelProvider";

type Category = Studio["category"];
const OPTIONS: { value: Category; title: string; hint: string }[] = [
  { value: "dekor", title: "Dekor", hint: "Arka, sahna, stol" },
  { value: "floristika", title: "Floristika", hint: "Guldasta, kompozitsiya" },
];
const CAP_MIN = 1;
const CAP_MAX = 20;

/* S1 · Onboarding (Figma 5:3) — one screen, no steps. In Telegram the CTA is the native MainButton. */
export function OnboardingScreen() {
  const { state, tg, setMe } = usePanel();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("dekor");
  const [capacity, setCapacity] = useState(3);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  async function submit() {
    if (saving) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErrors({ name: "Studiya nomini kiriting" });
      nameRef.current?.focus();
      tg?.HapticFeedback?.notificationOccurred("error");
      return;
    }
    setSaving(true);
    setErrors({});
    setFormError(null);
    tg?.MainButton.showProgress();
    try {
      await api("/api/panel/onboarding", { body: { name: trimmed, category, dailyCapacity: capacity } });
      tg?.HapticFeedback?.notificationOccurred("success");
      setMe(await api<Me>("/api/panel/me")); // provider routes the new owner to Dashboard
    } catch (e) {
      if (e instanceof ApiError && e.code === "studio_exists") return setMe(await api<Me>("/api/panel/me"));
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      else setFormError(e instanceof ApiError ? e.message : "Saqlab boʻlmadi. Qayta urinib koʻring.");
      tg?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSaving(false);
      tg?.MainButton.hideProgress();
    }
  }
  const onMainButton = useEffectEvent(() => void submit());

  // Telegram MainButton replaces the in-page CTA (Figma "Bottom bar (MainButton)")
  const canOnboard = state.status === "ready" && !state.studio;
  useEffect(() => {
    if (!tg || !canOnboard) return;
    const onClick = () => onMainButton();
    tg.MainButton.setParams({ text: "Boshlash", is_visible: true, is_active: true });
    tg.MainButton.onClick(onClick);
    return () => {
      tg.MainButton.offClick(onClick);
      tg.MainButton.hide();
    };
  }, [tg, canOnboard]);

  // Roving focus for the radio group (arrow keys move and select, like native radios)
  function onRadioKey(e: KeyboardEvent, i: number) {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + OPTIONS.length) % OPTIONS.length;
    setCategory(OPTIONS[next].value);
    radios.current[next]?.focus();
  }

  // Only a signed-in user without a studio fills this in; anyone else is being redirected
  if (!canOnboard) return <Splash />;

  return (
    <form
      className="ds-onb"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="ds-motif" aria-hidden>
        <i style={{ height: 40, background: "var(--ds-bg-surface)" }} />
        <i style={{ height: 52, background: "var(--ds-day-booked-bg)" }} />
        <i style={{ height: 46, background: "var(--ds-day-limited-bg)" }} />
        <i style={{ height: 52, background: "var(--ds-day-booked-bg)" }} />
        <i style={{ height: 58, background: "var(--ds-day-selected-bg)" }} />
        <i style={{ height: 46, background: "var(--ds-day-limited-bg)" }} />
        <i style={{ height: 40, background: "var(--ds-bg-surface)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-8)" }}>
        <h1 className="ds-onb-title">Studiyangiz</h1>
        <p className="ds-body ds-secondary">Buni faqat siz va jamoangiz koʻradi</p>
      </div>

      <div className="ds-field">
        <label htmlFor="studio-name">Studiya nomi</label>
        <input
          ref={nameRef}
          id="studio-name"
          className="ds-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== "name")));
          }}
          placeholder="Masalan, Studio Gulzor"
          maxLength={60}
          autoComplete="organization"
          enterKeyHint="done"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "studio-name-err" : undefined}
        />
        {errors.name && (
          <p id="studio-name-err" className="ds-helper" data-error>
            {errors.name}
          </p>
        )}
      </div>

      <div className="ds-field">
        <span className="ds-label ds-secondary" id="cat-label">
          Yoʻnalish
        </span>
        <div className="ds-options" role="radiogroup" aria-labelledby="cat-label">
          {OPTIONS.map((o, i) => {
            const on = category === o.value;
            return (
              <button
                key={o.value}
                ref={(el) => {
                  radios.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                className="ds-option"
                onClick={() => setCategory(o.value)}
                onKeyDown={(e) => onRadioKey(e, i)}
              >
                <div>
                  <span className="ds-h3">{o.title}</span>
                  <span className="ds-radio" aria-hidden>
                    {on && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.33 7.58 5.25 10.5 11.67 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </div>
                <p>{o.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ds-capacity">
        <div>
          <span className="ds-body-medium" id="cap-label">
            Kunlik sigʻim
          </span>
          <span className="ds-label ds-secondary">Bir kunda nechta tadbir</span>
        </div>
        <div className="ds-stepper" role="group" aria-labelledby="cap-label">
          <button type="button" aria-label="Kamaytirish" disabled={capacity <= CAP_MIN} onClick={() => setCapacity((c) => Math.max(CAP_MIN, c - 1))}>
            −
          </button>
          <output aria-live="polite">{capacity}</output>
          <button type="button" aria-label="Koʻpaytirish" disabled={capacity >= CAP_MAX} onClick={() => setCapacity((c) => Math.min(CAP_MAX, c + 1))}>
            +
          </button>
        </div>
      </div>

      {formError && (
        <p className="ds-alert" role="alert">
          {formError}
        </p>
      )}

      {!tg && (
        <div className="ds-bottombar">
          <Button type="submit" size="l" block loading={saving}>
            Boshlash
          </Button>
        </div>
      )}
    </form>
  );
}
