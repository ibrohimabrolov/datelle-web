import type { Metadata } from "next";
import { RekvizitScreen } from "@/components/studio/screens/Rekvizit";

export const metadata: Metadata = { title: "Rekvizit" };

export default function Page() {
  return <RekvizitScreen />;
}
