export type Day = { wd: string; d: number; free: number; few?: boolean };

/* Date tile — Figma "Date tile" (Default / Few / Selected) · lg 128h · dark for inverse surfaces */
export function DateTile({
  day,
  selected,
  onSelect,
  size = "lg",
  tone = "light",
  note,
}: {
  day: Day;
  selected?: boolean;
  onSelect?: () => void;
  size?: "lg" | "md";
  tone?: "light" | "dark";
  note?: string;
}) {
  const label = note ?? (day.few ? `${day.free} ta qoldi` : `${day.free} boʻsh`);
  const surface = selected
    ? "bg-brand text-white border-transparent"
    : tone === "light"
      ? "bg-surface border-line hover:border-line-strong"
      : "bg-white/6 border-white/12 text-white hover:border-white/24";
  const wdColor = selected ? "text-white/72" : tone === "light" ? "text-ink-3" : "text-white/56";
  const noteColor = selected
    ? "text-white/80"
    : day.few
      ? tone === "light" ? "text-accent-subtle-text" : "text-[#E8C27A]"
      : tone === "light" ? "text-brand" : "text-ink-inverse-muted";

  const sizing =
    size === "lg"
      ? "h-[128px] min-w-[88px] flex-1 rounded-2xl py-4 gap-1"
      : "h-[112px] min-w-[72px] flex-1 rounded-2xl py-3.5 gap-1";

  const Tag = onSelect ? "button" : "div";
  return (
    <Tag
      {...(onSelect ? { type: "button" as const, onClick: onSelect, "aria-pressed": selected } : {})}
      className={`flex flex-col items-center justify-center border transition-colors duration-200 ${sizing} ${surface} ${onSelect ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" : ""}`}
    >
      <span className={`t-cap-m ${wdColor}`}>{day.wd}</span>
      <span
        className={`font-semibold ${size === "lg" ? "text-[32px] leading-10" : "text-[28px] leading-9"} tracking-[-0.015em] ${selected ? "text-white" : tone === "light" ? "text-ink" : "text-white"}`}
      >
        {day.d}
      </span>
      <span className={`t-cap-m whitespace-nowrap ${noteColor}`}>{label}</span>
    </Tag>
  );
}
