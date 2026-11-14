/* Bot copy and message builders. Pure — no env, no network; unit-tested.
   Copy follows the UX dictionary in claude/Datelle-MVP-SCOPE.md:
   "Qoldiq" (not "Olinadigan qoldiq"), dates "15-noyabr, sh", short verb-led CTAs. */
import { MONTHS, WD_SHORT, dayNum, weekdayIdx } from "@/lib/dates";

/* ——— Bot API shapes we use (subset) ——— */
export type TgChat = { id: number; type: "private" | "group" | "supergroup" | "channel" };
export type TgMessage = { message_id: number; chat: TgChat; from?: { id: number; first_name: string; language_code?: string }; text?: string };
export type TgUpdate = { update_id: number; message?: TgMessage };

export type InlineButton = { text: string; web_app: { url: string } } | { text: string; url: string };
export type SendMessage = {
  chat_id: number;
  text: string;
  parse_mode?: "HTML";
  link_preview_options?: { is_disabled: boolean };
  reply_markup?: { inline_keyboard: InlineButton[][] };
};

export const COPY = {
  open: "Ochish",
  openStudio: "Datelle Studio’ni ochish",
  joinTeam: "Jamoaga qoʻshilish",
  start: (name?: string) =>
    [
      name ? `Salom, ${escapeHtml(name)}!` : "Salom!",
      "",
      "Datelle Studio — studiyangiz kalendari, buyurtmalari va puli bir joyda.",
      "Har kuni kechqurun ertangi tadbirlarni shu yerga yuboraman.",
    ].join("\n"),
  invite: "Sizni studiya jamoasiga taklif qilishdi. Qoʻshilish uchun tugmani bosing.",
  help: [
    "<b>Buyruqlar</b>",
    "/start — Datelle Studio’ni ochish",
    "/help — yordam",
    "",
    "Savol boʻlsa — @datelle_uz",
  ].join("\n"),
  groupOnly: "Men faqat shaxsiy chatda ishlayman.",
} as const;

/* Commands shown in the Telegram "/" menu (setMyCommands) */
export const BOT_COMMANDS = [
  { command: "start", description: "Datelle Studio’ni ochish" },
  { command: "help", description: "Yordam" },
] as const;
export const BOT_DESCRIPTION =
  "Dekor studiyalari va floristlar uchun: kalendar, buyurtmalar, avans va qoldiq. Har kuni kechqurun ertangi tadbirlar eslatmasi.";
export const BOT_SHORT_DESCRIPTION = "Studiyangiz kalendari, buyurtmalari va puli";

/* ——— helpers ——— */
export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* 12 500 000 soʻm — plain spaces between thousands (MVP-SCOPE) */
export const formatSum = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} soʻm`;

/* "15-noyabr, sh" */
export const shortDate = (iso: string) => `${dayNum(iso)}-${MONTHS[Number(iso.slice(5, 7)) - 1]}, ${WD_SHORT[weekdayIdx(iso)].toLowerCase()}`;

/* Invite tokens travel as /start inv_<token> or Mini App startapp=inv_<token> */
const INVITE_RE = /^inv_([A-Za-z0-9_-]{16,64})$/;
export const parseInvite = (param: string | undefined) => (param ? INVITE_RE.exec(param)?.[1] : undefined);

/* "/start@datelle_bot inv_x" → { cmd: "start", arg: "inv_x" } */
export function parseCommand(text: string | undefined) {
  const m = /^\/([a-z_]+)(?:@\w+)?(?:\s+(\S+))?/i.exec(text?.trim() ?? "");
  return m ? { cmd: m[1].toLowerCase(), arg: m[2] } : null;
}

const withQuery = (base: string, q: Record<string, string>) => {
  const u = new URL(base);
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  return u.toString();
};

/* ——— update → reply ———
   Returns the sendMessage payload, or null when the update needs no answer.
   panelUrl is the Mini App entry (https, set in BotFather /setdomain for the Login Widget). */
export function replyTo(update: TgUpdate, panelUrl: string): SendMessage | null {
  const msg = update.message;
  if (!msg?.text) return null;
  const cmd = parseCommand(msg.text);

  if (msg.chat.type !== "private") {
    return cmd?.cmd === "start" ? { chat_id: msg.chat.id, text: COPY.groupOnly } : null;
  }

  const base = { chat_id: msg.chat.id, parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

  if (cmd?.cmd === "start") {
    const invite = parseInvite(cmd.arg);
    if (invite) {
      return {
        ...base,
        text: COPY.invite,
        reply_markup: { inline_keyboard: [[{ text: COPY.joinTeam, web_app: { url: withQuery(panelUrl, { taklif: invite }) } }]] },
      };
    }
    return {
      ...base,
      text: COPY.start(msg.from?.first_name),
      reply_markup: { inline_keyboard: [[{ text: COPY.openStudio, web_app: { url: panelUrl } }]] },
    };
  }

  // /help, unknown commands and free text all get the same short help
  return { ...base, text: COPY.help, reply_markup: { inline_keyboard: [[{ text: COPY.openStudio, web_app: { url: panelUrl } }]] } };
}

/* ——— daily reminder (20:00 Tashkent) ——— */
export type ReminderOrder = { client: string; place?: string | null; balance: number };
export type ReminderDigest = { date: string; orders: ReminderOrder[] };

export const REMINDER_MAX_LINES = 10;

/* Text for tomorrow's events, or null on an empty day — no message is sent then */
export function reminderText({ date, orders }: ReminderDigest): string | null {
  if (orders.length === 0) return null;
  const lines = orders.slice(0, REMINDER_MAX_LINES).map((o) => {
    const who = escapeHtml(o.client.trim() || "Mijoz");
    const where = o.place?.trim() ? ` — ${escapeHtml(o.place.trim())}` : "";
    const due = o.balance > 0 ? ` · qoldiq ${formatSum(o.balance)}` : "";
    return `• ${who}${where}${due}`;
  });
  const rest = orders.length - REMINDER_MAX_LINES;
  if (rest > 0) lines.push(`va yana ${rest} ta`);

  const due = orders.reduce((s, o) => s + Math.max(0, o.balance), 0);
  return [
    `<b>Ertaga, ${shortDate(date)} — ${orders.length} ta tadbir</b>`,
    "",
    ...lines,
    "",
    due > 0 ? `Qoldiq: <b>${formatSum(due)}</b>` : "Qoldiq yoʻq — hammasi toʻlangan",
  ].join("\n");
}

export function reminderMessage(chatId: number, digest: ReminderDigest, panelUrl: string): SendMessage | null {
  const text = reminderText(digest);
  if (!text) return null;
  const url = withQuery(new URL("kalendar", panelUrl.endsWith("/") ? panelUrl : `${panelUrl}/`).toString(), { sana: digest.date });
  return {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [[{ text: COPY.open, web_app: { url } }]] },
  };
}
