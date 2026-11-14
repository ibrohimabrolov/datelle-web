"use client";

import { useState } from "react";
import { Button } from "../Button";
import { usePanel, useStudio } from "../PanelProvider";
import { PageHead } from "../Shell";

const CATEGORY = { dekor: "Dekor", floristika: "Floristika" } as const;

/* S6 · Sozlamalar — read-only in Phase 1; editing, team and invites arrive in Phase 2 */
export function SettingsScreen() {
  const { tg, signOut } = usePanel();
  const ctx = useStudio();
  const [leaving, setLeaving] = useState(false);
  if (!ctx)
    return (
      <>
        <PageHead title="Sozlamalar" settings={false} />
        <span className="ds-skeleton" style={{ height: 232, borderRadius: "var(--ds-radius-xl)" }} />
        <span className="ds-skeleton" style={{ height: 188, borderRadius: "var(--ds-radius-xl)" }} />
      </>
    );
  const { me, studio } = ctx;

  return (
    <>
      <PageHead title="Sozlamalar" settings={false} />

      <section className="ds-card" aria-labelledby="s-studio">
        <h2 id="s-studio" className="ds-h3">
          Studiya
        </h2>
        <dl className="ds-rows" style={{ margin: "var(--ds-space-8) 0 0" }}>
          <Row k="Nomi" v={studio.name} />
          <Row k="Yoʻnalish" v={CATEGORY[studio.category]} />
          <Row k="Kunlik sigʻim" v={`${studio.dailyCapacity} ta tadbir`} />
          <Row k="Rolingiz" v={studio.role === "owner" ? "Egasi" : "Menejer"} />
        </dl>
      </section>

      <section className="ds-card" aria-labelledby="s-account">
        <h2 id="s-account" className="ds-h3">
          Hisob
        </h2>
        <dl className="ds-rows" style={{ margin: "var(--ds-space-8) 0 var(--ds-space-16)" }}>
          <Row k="Ism" v={me.user.name} />
          {me.user.username && <Row k="Telegram" v={`@${me.user.username}`} />}
        </dl>
        {/* In the Mini App the session is re-created on every open, so "Chiqish" would be a no-op */}
        {!tg && (
          <Button
            variant="secondary"
            loading={leaving}
            onClick={async () => {
              setLeaving(true);
              await signOut();
            }}
          >
            Chiqish
          </Button>
        )}
      </section>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="ds-row">
      <dt className="ds-body">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
