import { Container } from "@/components/ui/Primitives";

/* I1 · Katalog — yuklanmoqda (Figma 259:3493) */
export function CatalogSkeleton() {
  const bar = "animate-pulse rounded-xl bg-surface-subtle";
  return (
    <div aria-busy aria-label="Yuklanmoqda">
      <div className="border-b border-line bg-surface">
        <Container wide className="flex gap-3 py-5">
          {[220, 200, 220, 200].map((w, i) => (
            <div key={i} className={`h-16 shrink-0 ${bar}`} style={{ width: w }} />
          ))}
        </Container>
      </div>
      <Container wide className="flex flex-col gap-5 pt-10 pb-6">
        <div className={`h-10 w-72 ${bar}`} />
        <div className={`h-5 w-96 max-w-full ${bar}`} />
      </Container>
      <Container wide className="grid grid-cols-1 gap-x-8 gap-y-14 pb-14 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4">
            <div className={`h-[304px] rounded-2xl ${bar}`} />
            <div className={`h-5 w-2/3 ${bar}`} />
            <div className={`h-4 w-1/2 ${bar}`} />
          </div>
        ))}
      </Container>
    </div>
  );
}
