import type { Metadata } from "next";
import { Suspense } from "react";
import { RequestsPage } from "@/components/admin/Requests";
import { Rows } from "@/components/admin/kit";

export const metadata: Metadata = { title: "Soʻrovlar · Admin" };

export default function Page() {
  return (
    <Suspense fallback={<Rows />}>
      <RequestsPage />
    </Suspense>
  );
}
