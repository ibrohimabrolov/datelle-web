import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalog } from "@/components/catalog/Catalog";
import { CatalogSkeleton } from "@/components/catalog/CatalogSkeleton";

export const metadata: Metadata = {
  title: "Boʻsh studiyalar — sana boʻyicha",
  description: "Tanlangan kunda boʻsh dekor studiyalari va floristlar: narx, reyting va tuman boʻyicha filtr.",
};

export default function StudiyalarPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <Catalog />
    </Suspense>
  );
}
