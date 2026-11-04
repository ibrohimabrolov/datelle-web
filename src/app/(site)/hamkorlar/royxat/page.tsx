import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Container } from "@/components/ui/Primitives";
import { PartnerForm } from "@/components/partner/PartnerForm";

export const metadata: Metadata = { title: "Hamkor boʻlish", alternates: { canonical: "/hamkorlar/royxat" } };

export default function RoyxatPage() {
  return (
    <Container wide className="flex flex-col gap-10 pt-4 pb-24 lg:pt-6 lg:pb-32">
      <div className="flex flex-col gap-4">
        <Link href="/hamkorlar" className="inline-flex w-fit items-center gap-1.5 py-3 t-body-sm text-ink-2 hover:text-ink">
          <Icon name="chevronLeft" size={16} />
          Hamkorlar uchun
        </Link>
        <h1 className="text-[36px] leading-10 font-bold tracking-[-0.025em] sm:t-h1">Hamkor boʻlish</h1>
        <p className="max-w-[640px] t-body-m text-ink-2 sm:t-body-l">Arizani toʻldiring — 48 soat ichida tekshiramiz va profilingizni ochamiz.</p>
      </div>
      <PartnerForm />
    </Container>
  );
}
