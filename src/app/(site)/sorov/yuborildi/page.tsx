import type { Metadata } from "next";
import { Suspense } from "react";
import { SentView } from "@/components/vendor/SentView";

export const metadata: Metadata = { title: "Soʻrov yuborildi", robots: { index: false } };

export default function SentPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy />}>
      <SentView />
    </Suspense>
  );
}
