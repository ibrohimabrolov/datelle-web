import type { Metadata } from "next";
import { SettingsScreen } from "@/components/studio/screens/Settings";

export const metadata: Metadata = { title: "Sozlamalar" };

export default function Page() {
  return <SettingsScreen />;
}
