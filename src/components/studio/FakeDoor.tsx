"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

/* Figma 07 · Tez orada · dialog: a feature that isn't built yet — title + pitch, "Yopish" / "Menga kerak".
   The vote goes to /api/panel/interest (studio_events), so demand is measurable. */
export function FakeDoor({ title, text, voted, onClose, onVote }: { title: string; text: string; voted: boolean; onClose(): void; onVote(): Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal title={title} size="sm" onClose={onClose}>
      <p className="ds-body ds-secondary">{voted ? "Soʻrovingiz qabul qilingan — tayyor boʻlganda Telegram orqali xabar beramiz." : text}</p>
      {err && (
        <p className="ds-alert" role="alert">
          {err}
        </p>
      )}
      <div className="ds-modal-foot">
        <Button variant="ghost" onClick={onClose} disabled={busy} data-autofocus={voted || undefined}>
          Yopish
        </Button>
        {!voted && (
          <Button
            loading={busy}
            data-autofocus
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await onVote();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Xatolik yuz berdi");
                setBusy(false);
              }
            }}
          >
            Menga kerak
          </Button>
        )}
      </div>
    </Modal>
  );
}
