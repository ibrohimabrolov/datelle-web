import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersScreen } from "@/components/studio/screens/Orders";

export const metadata: Metadata = { title: "Buyurtma" };

export default function Page() {
  return (
    <Suspense fallback={<span className="ds-skeleton" style={{ height: 480, borderRadius: "var(--ds-radius-xl)" }} />}>
      <OrdersScreen />
    </Suspense>
  );
}
