"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LoginGate } from "./LoginGate";

/* Only same-site paths are allowed as ?next= targets (no open redirect) */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/bronlarim");

export function LoginPage() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  return <LoginGate title="Kirish" lead="Telefon raqamingizni tasdiqlang — parol kerak emas." onDone={() => router.replace(next)} />;
}
