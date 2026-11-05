/* Illustration (Figma) — not live data */
const DAYS = [
  { wd: "Pa", d: 11, free: 35 },
  { wd: "Ju", d: 12, free: 34 },
  { wd: "Sh", d: 13, free: 6, few: true },
  { wd: "Ya", d: 14, free: 4, few: true },
  { wd: "Du", d: 15, free: 44 },
];
import { DateTile } from "@/components/ui/DateTile";
import { Container } from "@/components/ui/Primitives";

const PRICES = [
  { label: "Tugʻilgan kun dekori — S", price: "1 800 000 soʻm", style: "bg-surface-subtle" },
  { label: "Toʻy zali — M", price: "6 500 000 soʻm", style: "bg-brand-subtle border-[1.5px] border-brand", priceClass: "text-brand" },
  { label: "Fotozona", price: "900 000 soʻm", style: "bg-surface-subtle" },
];

export function WhyBento() {
  return (
    <section className="bg-bg-primary">
      <Container className="flex flex-col gap-10 py-20 lg:gap-14 lg:py-[120px]">
        <h2 className="lines max-w-[640px] text-[32px] leading-9 font-bold tracking-[-0.025em] sm:t-h1">
          <span>Instagram’da yoʻq</span>
          <span>uchta narsa.</span>
        </h2>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Ochiq narx */}
            <div className="flex flex-col justify-between gap-8 rounded-3xl border border-line bg-surface p-6 sm:p-9 lg:h-[460px]">
              <div className="flex max-w-[440px] flex-col gap-2">
                <h3 className="t-h3">Ochiq narx</h3>
                <p className="t-body-m text-ink-2">Har bir paketning narxi va tarkibi ochiq — Direct’da soʻrash shart emas.</p>
              </div>
              <div className="flex flex-col gap-2">
                {PRICES.map((p) => (
                  <div key={p.label} className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 text-[14px] leading-5 ${p.style}`}>
                    <span className="font-medium">{p.label}</span>
                    <span className={`font-semibold whitespace-nowrap ${p.priceClass ?? ""}`}>{p.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Real bandlik */}
            <div className="flex flex-col justify-between gap-8 overflow-hidden rounded-3xl bg-inverse p-6 sm:p-9 lg:h-[460px]">
              <div className="flex max-w-[440px] flex-col gap-2">
                <h3 className="t-h3 text-white">Real bandlik</h3>
                <p className="t-body-m text-ink-inverse-muted">Studiyalar kalendarni shu yerda yuritadi — siz faqat boʻsh kunlarni koʻrasiz.</p>
              </div>
              <div className="-mx-6 flex gap-2.5 overflow-x-auto px-6 [scrollbar-width:none] sm:mx-0 sm:px-0">
                {DAYS.map((d) => (
                  <DateTile key={d.d} day={d} selected={d.d === 12} />
                ))}
              </div>
            </div>
          </div>

          {/* Himoyalangan zadatok */}
          <div className="flex flex-col justify-between gap-8 rounded-3xl border border-line bg-surface p-6 sm:p-9 lg:h-[300px] lg:flex-row lg:items-center">
            <div className="flex max-w-[460px] flex-col gap-2">
              <h3 className="t-h3">Himoyalangan zadatok</h3>
              <p className="t-body-m text-ink-2">
                Studiya pulni ikki qismda oladi. Muammo boʻlsa, tadbirdan keyin 48 soat ichida xabar bering — ikkinchi qism toʻxtatiladi.
              </p>
            </div>
            <div className="flex w-full max-w-[620px] flex-col gap-3">
              <div className="flex gap-1.5">
                <div className="flex h-16 basis-[70%] items-center rounded-xl bg-brand px-5 t-title text-white">70%</div>
                <div className="flex h-16 basis-[30%] items-center rounded-xl border-[1.5px] border-dashed border-accent bg-accent-subtle px-5 t-title text-accent-subtle-text">
                  30%
                </div>
              </div>
              <div className="flex gap-1.5 t-body-sm text-ink">
                <span className="basis-[70%]">Bron tasdiqlangach</span>
                <span className="basis-[30%]">Tadbirdan 48 soat keyin</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
