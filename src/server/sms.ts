import "server-only";

/* SMS delivery behind one interface.
   console — dev: prints to the server log
   demo    — preview deployments without an SMS contract: the API also returns the code to the page
   eskiz   — production (eskiz.uz) */
export type SmsMode = "console" | "demo" | "eskiz";
export const smsMode = (): SmsMode => {
  const m = process.env.SMS_PROVIDER;
  return m === "eskiz" || m === "demo" ? m : "console";
};
/* The code may be echoed back to the browser only when no real SMS is sent */
export const echoCode = () => smsMode() !== "eskiz";

let eskizToken: { value: string; exp: number } | null = null;

async function eskizAuth() {
  if (eskizToken && eskizToken.exp > Date.now()) return eskizToken.value;
  const form = new FormData();
  form.set("email", process.env.ESKIZ_EMAIL ?? "");
  form.set("password", process.env.ESKIZ_PASSWORD ?? "");
  const r = await fetch("https://notify.eskiz.uz/api/auth/login", { method: "POST", body: form });
  if (!r.ok) throw new Error(`eskiz auth ${r.status}`);
  const j = (await r.json()) as { data?: { token?: string } };
  if (!j.data?.token) throw new Error("eskiz auth: no token");
  eskizToken = { value: j.data.token, exp: Date.now() + 25 * 24 * 3600_000 };
  return eskizToken.value;
}

export async function sendSms(phone: string, text: string) {
  const mode = smsMode();
  if (mode !== "eskiz") {
    console.info(`[sms:${mode}] → ${phone}: ${text}`);
    return;
  }
  const token = await eskizAuth();
  const form = new FormData();
  form.set("mobile_phone", phone.replace("+", ""));
  form.set("message", text);
  form.set("from", process.env.ESKIZ_FROM ?? "4546");
  const r = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!r.ok) throw new Error(`eskiz send ${r.status}`);
}
