"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col items-center justify-center gap-5 px-4 text-center">
      <h1 className="t-h2">Nimadir notoʻgʻri ketdi</h1>
      <p className="t-body-m text-ink-2">Sahifani qayta yuklab koʻring. Muammo takrorlansa, Telegram’da yozing.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className={buttonClass("primary", "lg")}>
          Qayta urinish
        </button>
        <Link href="/" className={buttonClass("secondary", "lg")}>
          Bosh sahifa
        </Link>
      </div>
    </div>
  );
}
