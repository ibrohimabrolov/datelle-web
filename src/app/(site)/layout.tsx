import { Suspense } from "react";
import { Nav, NavLive } from "@/components/home/Nav";
import { Footer } from "@/components/home/Footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<Nav />}>
        <NavLive />
      </Suspense>
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
    </>
  );
}
