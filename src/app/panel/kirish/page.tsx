import type { Metadata } from "next";
import { KirishScreen } from "@/components/studio/screens/Kirish";

export const metadata: Metadata = { title: "Kirish" };

export default function Page() {
  return <KirishScreen />;
}
