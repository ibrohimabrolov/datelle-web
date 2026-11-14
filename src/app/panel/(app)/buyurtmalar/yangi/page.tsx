import type { Metadata } from "next";
import { Planned } from "@/components/studio/screens/Planned";

export const metadata: Metadata = { title: "Yangi buyurtma" };

export default function Page() {
  return <Planned title="Yangi buyurtma" text="Mijoz, tadbir va avans formasi 4-bosqichda quriladi." />;
}
