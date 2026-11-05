import type { Metadata } from "next";
import { VendorsPage } from "@/components/admin/Vendors";

export const metadata: Metadata = { title: "Studiyalar · Admin" };

export default function Page() {
  return <VendorsPage />;
}
