import { Icon } from "./Icon";

export type Step = { title: string; sub: string; state: "done" | "current" | "todo" };

/* Vertical progress — Figma B4/G2 timeline (20px markers, 1px rail) */
export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-3 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span className={`absolute top-6 bottom-1 left-[9.5px] w-px ${s.state === "done" ? "bg-brand" : "bg-line-strong"}`} aria-hidden />
          )}
          <span
            className={`relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
              s.state === "done"
                ? "bg-brand text-white"
                : s.state === "current"
                  ? "border-[1.5px] border-brand bg-surface"
                  : "border-[1.5px] border-line-strong bg-surface"
            }`}
          >
            {s.state === "done" && <Icon name="check" size={12} />}
            {s.state === "current" && <span className="size-2 rounded-full bg-brand" />}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className={`t-body-sm ${s.state === "todo" ? "text-ink-2" : "text-ink"}`}>{s.title}</span>
            <span className="t-cap text-ink-3">{s.sub}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
