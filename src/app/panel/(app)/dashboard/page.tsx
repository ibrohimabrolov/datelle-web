import type { Metadata } from "next";
import { DashboardScreen } from "@/components/studio/screens/Dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return <DashboardScreen />;
}
