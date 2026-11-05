import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPage } from "@/components/account/LoginPage";

export const metadata: Metadata = { title: "Kirish", robots: { index: false } };

export default function KirishPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy />}>
      <LoginPage />
    </Suspense>
  );
}
