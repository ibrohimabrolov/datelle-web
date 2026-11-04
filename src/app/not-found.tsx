import Link from "next/link";
import { Nav } from "@/components/home/Nav";
import { Footer } from "@/components/home/Footer";
import { buttonClass } from "@/components/ui/Button";
import { Container } from "@/components/ui/Primitives";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main>
        <Container wide className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-24 text-center">
          <span className="text-[120px] leading-none font-bold tracking-[-0.06em] text-brand sm:text-[160px]">404</span>
          <h1 className="t-h2">Bu sahifa yoʻq</h1>
          <p className="max-w-[440px] t-body-m text-ink-2">Havola eskirgan yoki xato yozilgan. Studiyalarni sana boʻyicha qaytadan qidiring.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonClass("secondary", "lg")}>Bosh sahifa</Link>
            <Link href="/studiyalar" className={buttonClass("primary", "lg")}>Studiyalarni koʻrish</Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
