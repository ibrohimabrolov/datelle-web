import { Nav } from "@/components/home/Nav";
import { Footer } from "@/components/home/Footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Nav />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
    </>
  );
}
