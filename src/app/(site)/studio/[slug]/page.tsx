import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BRAND } from "@/config/brand";
import { VENDORS, fmtSum, vendorBySlug } from "@/data/catalog";
import { VendorView, VendorWithParams } from "@/components/vendor/VendorView";
import { VendorSkeleton } from "@/components/vendor/VendorSkeleton";

export function generateStaticParams() {
  return VENDORS.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/studio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const v = vendorBySlug(slug);
  if (!v) return { title: "Studiya topilmadi" };
  return {
    title: `${v.name} — ${v.category === "dekor" ? "dekor studiyasi" : "florist"}, ${v.district}`,
    description: `${v.name}: ${fmtSum(v.priceFrom)}dan, reyting ${v.rating}. Boʻsh kunlarni koʻring va ${BRAND.name} orqali bron qiling.`,
    alternates: { canonical: `/studio/${v.slug}` },
    openGraph: { images: [{ url: v.img.src, width: v.img.width, height: v.img.height }] },
  };
}

/* params are awaited inside Suspense so the static shell (nav/footer) streams instantly */
export default function StudioPage({ params }: PageProps<"/studio/[slug]">) {
  return (
    <Suspense fallback={<VendorSkeleton />}>
      <Studio params={params} />
    </Suspense>
  );
}

async function Studio({ params }: Pick<PageProps<"/studio/[slug]">, "params">) {
  const { slug } = await params;
  if (!vendorBySlug(slug)) notFound();
  return (
    <Suspense fallback={<VendorView slug={slug} />}>
      <VendorWithParams slug={slug} />
    </Suspense>
  );
}
