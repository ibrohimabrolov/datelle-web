import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarScreen } from "@/components/studio/screens/Calendar";

export const metadata: Metadata = { title: "Kalendar" };

/* ?oy=YYYY-MM&sana=YYYY-MM-DD — deep links from the bot reminder land on the day panel */
export default function Page() {
  return (
    <Suspense fallback={<span className="ds-skeleton" style={{ height: 480, borderRadius: "var(--ds-radius-xl)" }} />}>
      <CalendarScreen />
    </Suspense>
  );
}
