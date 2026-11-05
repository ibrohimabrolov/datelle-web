import type { Metadata } from "next";
import { ApplicationsPage } from "@/components/admin/Inbox";

export const metadata: Metadata = { title: "Hamkor arizalari · Admin" };

export default function Page() {
  return <ApplicationsPage />;
}
