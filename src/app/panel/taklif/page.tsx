import type { Metadata } from "next";
import { InviteScreen } from "@/components/studio/screens/Invite";

export const metadata: Metadata = { title: "Taklif" };

export default function Page() {
  return <InviteScreen />;
}
