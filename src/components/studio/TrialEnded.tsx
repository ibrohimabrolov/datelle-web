"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/config/brand";
import { api, useToday } from "@/lib/api";
import { StudioIcon } from "./icons";
import { Modal } from "./Modal";
import { usePanel, useStudio } from "./PanelProvider";
import { PRICE_MONTH, SEATS_INCLUDED } from "./plan";

const KEY = (studioId: string) => `ds-trial-ended:${studioId}`;

/* S6 · Obuna tugadi (Figma 37:11684): the owner sees it once a day after the free month ends.
   Data stays and nothing is locked (no billing yet) — it's the prompt to pay; payment is arranged by
   Telegram/phone and the trial date is moved after it. Managers can't pay, so they never see it. */
export function TrialEndedGate() {
  const ctx = useStudio();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const id = ctx?.studio.id;
  const owner = ctx?.studio.role === "owner";

  useEffect(() => {
    if (!id || !owner || !today) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(KEY(id));
    } catch {}
    if (seen === today) return;
    let alive = true;
    api<{ studio: { trialEndsAt: string | null } }>("/api/panel/studio")
      .then((d) => {
        const ends = d.studio.trialEndsAt?.slice(0, 10);
        if (alive && ends && ends < today) setOpen(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, owner, today]);

  if (!open || !ctx) return null;
  const close = () => {
    setOpen(false);
    try {
      if (today) localStorage.setItem(KEY(ctx.studio.id), today);
    } catch {}
  };
  return <TrialEnded studioName={ctx.studio.name} onClose={close} />;
}

export function TrialEnded({ studioName, onClose }: { studioName: string; onClose(): void }) {
  const { tg } = usePanel();
  const message = `Assalomu alaykum! «${studioName}» uchun Floreal obunasini yoqmoqchiman.`;
  const telegram = `${BRAND.telegramUrl}?text=${encodeURIComponent(message)}`;
  return (
    <Modal
      title="Bepul davr tugadi"
      description="Maʼlumotlaringiz saqlanadi. Davom etish uchun obunani yoqing."
      // eslint-disable-next-line @next/next/no-img-element -- static 3D (Figma Illustration · Muddat, 96)
      media={<img src="/studio/3d/muddat.webp" alt="" width={96} height={96} />}
      variant="dialog"
      closeButton
      onClose={onClose}
    >
      <div className="ds-planbox">
        <div className="ds-planbox-head">
          <span className="ds-body-strong">Oylik</span>
          <span>
            <span className="ds-h2">{PRICE_MONTH}</span> <span className="ds-label ds-secondary">soʻm/oy</span>
          </span>
        </div>
        <ul>
          {["Kalendar va buyurtmalar", "Kunlik eslatma", `${SEATS_INCLUDED} tagacha foydalanuvchi`].map((t) => (
            <li key={t}>
              <StudioIcon name="check-circle" variant="Filled" size={18} />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="ds-modal-foot" data-split>
        <a className="ds-btn" data-style="secondary" data-size="m" href={`tel:${BRAND.phoneE164}`}>
          Bogʻlanish
        </a>
        <a
          className="ds-btn"
          data-style="primary"
          data-size="m"
          href={telegram}
          target="_blank"
          rel="noreferrer"
          data-autofocus
          onClick={(e) => {
            if (tg?.openTelegramLink) {
              e.preventDefault();
              tg.openTelegramLink(telegram);
            }
          }}
        >
          Obunani yoqish
        </a>
      </div>
    </Modal>
  );
}
