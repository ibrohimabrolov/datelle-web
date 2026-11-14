"use client";

import { PageHead } from "../Shell";

/* Placeholder for modules built in later phases (IMPLEMENTATION-PLAN 3–5). Branch-only — never merged to users. */
export function Planned({ title, text }: { title: string; text: string }) {
  return (
    <>
      <PageHead title={title} />
      <section className="ds-card" style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-8)" }}>
        <h2 className="ds-h3">Tez orada</h2>
        <p className="ds-body ds-secondary">{text}</p>
      </section>
    </>
  );
}
