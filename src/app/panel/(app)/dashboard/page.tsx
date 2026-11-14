import type { Metadata } from "next";
import { Planned } from "@/components/studio/screens/Planned";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return <Planned title="Dashboard" text="Oylik tushum, jami qoldiq va yaqin 7 kunlik tadbirlar shu yerda boʻladi." />;
}
