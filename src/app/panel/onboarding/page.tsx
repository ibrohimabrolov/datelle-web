import type { Metadata } from "next";
import { OnboardingScreen } from "@/components/studio/screens/Onboarding";

export const metadata: Metadata = { title: "Studiyangiz" };

export default function Page() {
  return <OnboardingScreen />;
}
