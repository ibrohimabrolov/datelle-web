import type { Metadata } from "next";
import { ExpensesScreen } from "@/components/studio/screens/Expenses";

export const metadata: Metadata = { title: "Xarajatlar" };

export default function Page() {
  return <ExpensesScreen />;
}
