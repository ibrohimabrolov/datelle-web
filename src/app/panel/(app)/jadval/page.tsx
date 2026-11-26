import type { Metadata } from "next";
import { JadvalScreen } from "@/components/studio/screens/Jadval";

export const metadata: Metadata = { title: "Jamoa jadvali" };

export default function Page() {
  return <JadvalScreen />;
}
