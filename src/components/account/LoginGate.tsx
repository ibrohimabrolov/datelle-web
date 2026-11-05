"use client";

import { OtpForm } from "@/components/auth/OtpDialog";
import { Container } from "@/components/ui/Primitives";

/* B1/B2 inline — used by pages that need a verified phone */
export function LoginGate({ title, lead, onDone }: { title: string; lead?: string; onDone: () => void }) {
  return (
    <Container wide className="flex justify-center py-16 lg:py-24">
      <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="t-h2">{title}</h1>
          <p className="t-body-m text-ink-2">{lead ?? "Bron qilgan telefon raqamingizni tasdiqlang — soʻrovlaringiz shu raqamga bogʻlangan."}</p>
        </div>
        <OtpForm onDone={onDone} />
      </div>
    </Container>
  );
}
