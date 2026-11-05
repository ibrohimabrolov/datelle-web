import type { Metadata } from "next";
import { MyRequests } from "@/components/account/MyRequests";

export const metadata: Metadata = { title: "Bronlarim", robots: { index: false } };

export default function BronlarimPage() {
  return <MyRequests />;
}
