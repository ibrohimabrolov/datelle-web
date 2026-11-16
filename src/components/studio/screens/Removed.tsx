"use client";

import { useRouter } from "next/navigation";
import { Button } from "../Button";
import { StudioIcon } from "../icons";
import { Splash, usePanel } from "../PanelProvider";
import { Illustration } from "../StateBlock";
import { AuthShell } from "./Kirish";

/* S1 · Kirish · ruxsat yoʻq (Figma 93:12136, mobile "Kirish yopilgan" 34:2238).
   Shown when the signed-in person has no studio because an owner removed them in the last 30 days.
   Primary way back is a new invite from the owner; they can also start their own studio. */
export function RemovedScreen() {
  const { state } = usePanel();
  const router = useRouter();
  const removed = state.status === "ready" ? state.me.removed : null;
  if (!removed) return <Splash />;
  const owner = removed.by;
  return (
    <AuthShell>
      <Illustration art="qulf" className="ds-mobile-only" />
      <h1 className="ds-h1">Kirish yopilgan</h1>
      <div className="ds-alert" data-tone="info" role="status">
        <span className="ds-alert-icon" aria-hidden>
          i
        </span>
        <div>
          <b>{removed.studio} egasi sizni jamoadan chiqardi</b>
          <span>Qayta qoʻshilish uchun egasidan yangi taklif linkini soʻrang.</span>
        </div>
      </div>
      {owner?.username ? (
        <a className="ds-btn" data-style="secondary" data-size="l" data-block href={`https://t.me/${owner.username}`} target="_blank" rel="noreferrer">
          <StudioIcon name="send" variant="Filled" />
          <span>{owner.name}ga yozish</span>
        </a>
      ) : null}
      <Button variant="ghost" onClick={() => router.push("/panel/onboarding")}>
        Oʻz studiyamni ochish
      </Button>
    </AuthShell>
  );
}
