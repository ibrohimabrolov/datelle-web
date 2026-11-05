import type { Step } from "@/components/ui/Stepper";

export type ReqStatus = "pending" | "confirmed" | "declined" | "expired" | "cancelled" | "paid" | "completed";
export type RequestView = {
  id: string; code: string; type: "booking" | "quote"; status: ReqStatus; eventDate: string; eventType: string | null;
  guests: number | null; venue: string | null; budget: string | null; price: number | null; deposit: number | null;
  respondBy: string; createdAt: string; contactName: string; packageTitle: string | null;
  vendor: { slug: string; name: string; category: string; district: string; imageKey: string; responseHours: number };
  events?: { toStatus: ReqStatus; actor: string; createdAt: string }[];
};

export const STATUS_LABEL: Record<ReqStatus, { label: string; tone: "brand" | "warning" | "neutral" | "error" | "success" }> = {
  pending: { label: "Javob kutilmoqda", tone: "warning" },
  confirmed: { label: "Tasdiqlandi · zadatok kutilmoqda", tone: "brand" },
  paid: { label: "Sana band qilindi", tone: "success" },
  completed: { label: "Bajarildi", tone: "success" },
  declined: { label: "Studiya rad etdi", tone: "error" },
  expired: { label: "Javob berilmadi", tone: "neutral" },
  cancelled: { label: "Bekor qilindi", tone: "neutral" },
};

export const TONE_CLASS = {
  brand: "bg-brand-subtle text-brand-subtle-text",
  warning: "bg-warning-subtle text-warning-subtle-text",
  neutral: "bg-surface-subtle text-[color:var(--neutral-subtle-text)]",
  error: "bg-error-subtle text-error-subtle-text",
  success: "bg-success-subtle text-success-subtle-text",
};

/* Toshkent clock for timestamps */
export function fmtTime(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5 * 3600_000);
  const today = new Date(Date.now() + 5 * 3600_000);
  const hm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  if (d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)) return `bugun, ${hm}`;
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (d.toISOString().slice(0, 10) === tomorrow.toISOString().slice(0, 10)) return `ertaga, ${hm}`;
  return `${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}, ${hm}`;
}

export function stepsFor(r: RequestView): Step[] {
  const at = (s: ReqStatus) => r.events?.find((e) => e.toStatus === s)?.createdAt;
  const sent = { title: r.type === "booking" ? "Bron soʻrovi yuborildi" : "Soʻrov yuborildi", sub: fmtTime(r.createdAt), state: "done" as const };
  const ended = ["declined", "expired", "cancelled"].includes(r.status);
  if (ended) {
    const t = at(r.status);
    return [sent, { title: STATUS_LABEL[r.status].label, sub: t ? fmtTime(t) : "", state: "done" }];
  }
  const answered = ["confirmed", "paid", "completed"].includes(r.status);
  const paid = ["paid", "completed"].includes(r.status);
  return [
    sent,
    {
      title: r.type === "booking" ? "Studiya tasdigʻi" : "Studiya taklifi",
      sub: answered ? fmtTime(at("confirmed") ?? r.createdAt) : `${fmtTime(r.respondBy)} gacha · 22:00–08:00 hisoblanmaydi`,
      state: answered ? "done" : "current",
    },
    { title: "Zadatok toʻlash", sub: "Payme yoki Click · 30%", state: paid ? "done" : answered ? "current" : "todo" },
    { title: "Sana band · kontaktlar ochiladi", sub: "Zadatokdan keyin darhol", state: paid ? "done" : "todo" },
  ];
}
