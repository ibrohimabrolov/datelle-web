import { Container } from "@/components/ui/Primitives";

/* I2 · Vendor sahifasi — yuklanmoqda */
export function VendorSkeleton() {
  const bar = "animate-pulse rounded-xl bg-surface-subtle";
  return (
    <Container wide className="flex flex-col gap-8 pt-6 pb-32" aria-busy aria-label="Yuklanmoqda">
      <div className={`h-5 w-56 ${bar}`} />
      <div className={`h-12 w-80 max-w-full ${bar}`} />
      <div className="flex gap-3">
        <div className={`h-[280px] flex-1 rounded-3xl lg:h-[520px] ${bar}`} />
        <div className="hidden w-[428px] flex-col gap-3 lg:flex">
          <div className={`h-[254px] rounded-3xl ${bar}`} />
          <div className={`h-[254px] rounded-3xl ${bar}`} />
        </div>
      </div>
    </Container>
  );
}
