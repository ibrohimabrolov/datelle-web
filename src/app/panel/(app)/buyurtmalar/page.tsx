import type { Metadata } from "next";
import { Planned } from "@/components/studio/screens/Planned";

export const metadata: Metadata = { title: "Buyurtmalar" };

export default function Page() {
  return <Planned title="Buyurtmalar" text="Buyurtmalar roʻyxati, qidiruv va toʻlovlar shu yerda boʻladi." />;
}
