import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VENDORS, vendorBySlug } from "@/data/catalog";
import { BriefForm, BriefWithParams } from "@/components/vendor/BriefForm";
import { VendorSkeleton } from "@/components/vendor/VendorSkeleton";

export function generateStaticParams() {
  return VENDORS.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/studio/[slug]/taklif">): Promise<Metadata> {
  const { slug } = await params;
  const v = vendorBySlug(slug);
  return v ? { title: `Individual taklif — ${v.name}`, robots: { index: false } } : { title: "Studiya topilmadi" };
}

export default function TaklifPage({ params }: PageProps<"/studio/[slug]/taklif">) {
  return (
    <Suspense fallback={<VendorSkeleton />}>
      <Brief params={params} />
    </Suspense>
  );
}

async function Brief({ params }: Pick<PageProps<"/studio/[slug]/taklif">, "params">) {
  const { slug } = await params;
  if (!vendorBySlug(slug)) notFound();
  return (
    <Suspense fallback={<BriefForm slug={slug} />}>
      <BriefWithParams slug={slug} />
    </Suspense>
  );
}
