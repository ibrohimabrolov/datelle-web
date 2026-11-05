import type { Metadata } from "next";
import { LeadsPage } from "@/components/admin/Inbox";

export const metadata: Metadata = { title: "Lidlar · Admin" };

export default function Page() {
  return <LeadsPage />;
}
