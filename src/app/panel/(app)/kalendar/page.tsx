import type { Metadata } from "next";
import { Planned } from "@/components/studio/screens/Planned";

export const metadata: Metadata = { title: "Kalendar" };

export default function Page() {
  return <Planned title="Kalendar" text="Oy koʻrinishi, kun holatlari va kunni yopish shu yerda boʻladi." />;
}
