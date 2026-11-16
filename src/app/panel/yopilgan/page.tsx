import type { Metadata } from "next";
import { RemovedScreen } from "@/components/studio/screens/Removed";

export const metadata: Metadata = { title: "Kirish yopilgan" };

export default function Page() {
  return <RemovedScreen />;
}
