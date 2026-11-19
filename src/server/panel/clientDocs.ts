import "server-only";
import { z } from "zod";
import { DOC_LANGS, type DocLang } from "@/lib/studio/clientDocs";
import { todayISO } from "@/lib/dates";
import { db } from "../db";
import { HttpError } from "../http";
import { renderSmeta, smetaFileName } from "../pdf/smeta";
import { callTelegramFile, TelegramError } from "../telegram/api";
import { botToken } from "../telegram/config";
import { audit, type StudioCtx } from "./auth";
import { getOrder, lastReminder } from "./orders";

/* Smeta PDF + balance reminder for one order. Both are client-facing; both leave a trace in the
   order history (action "smeta" / "remind") so the team sees who reminded whom, and when. */

const langs = DOC_LANGS.map((l) => l.value) as [DocLang, ...DocLang[]];
export const langSchema = z.enum(langs).catch("uz");
export const smetaSendSchema = z.object({ lang: z.enum(langs).default("uz") });
export const remindSchema = z.object({ channel: z.enum(["telegram", "sms", "copy"]), lang: z.enum(langs).default("uz") });

export async function buildSmeta(ctx: StudioCtx, orderId: string, lang: DocLang) {
  const o = await getOrder(ctx, orderId);
  const bytes = await renderSmeta(
    {
      studio: ctx.studio.name,
      contact: ctx.user.username ? `@${ctx.user.username}` : null,
      code: o.code,
      issued: todayISO(),
      client: o.client,
      phone: o.phone,
      date: o.date,
      eventType: o.eventType,
      venue: o.venue,
      guests: o.guests,
      notes: o.notes,
      total: o.total,
      paid: o.paid,
      payments: o.payments.map((p) => ({ paidOn: p.paidOn, method: p.method, amount: p.amount })),
    },
    lang,
  );
  return { bytes, name: smetaFileName(o.code, lang), order: o };
}

/* The Mini App can't save files reliably, so the bot sends the PDF to the studio member's own chat —
   one tap "Forward" and it's with the client. */
export async function sendSmeta(ctx: StudioCtx, orderId: string, lang: DocLang) {
  const token = botToken();
  if (!token) throw new HttpError(503, "bot_disabled", "Bot sozlanmagan");
  if (!ctx.user.telegramId) throw new HttpError(409, "no_telegram", "Akkauntingiz Telegram’ga ulanmagan");
  const { bytes, name, order } = await buildSmeta(ctx, orderId, lang);
  try {
    await callTelegramFile(
      token,
      "sendDocument",
      { chat_id: ctx.user.telegramId, caption: `${order.client} · ${order.code}\nMijozga forward qiling.` },
      { field: "document", name, type: "application/pdf", bytes },
    );
  } catch (e) {
    if (e instanceof TelegramError && e.permanent) throw new HttpError(409, "bot_blocked", "Botga /start yuboring, keyin qayta urinib koʻring");
    throw new HttpError(502, "telegram_failed", "Telegram javob bermadi. Qayta urinib koʻring");
  }
  await audit(db, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "order", entityId: orderId, action: "smeta", diff: { lang, channel: "telegram" } });
  return { ok: true };
}

export async function recordReminder(ctx: StudioCtx, orderId: string, input: z.infer<typeof remindSchema>) {
  const o = await getOrder(ctx, orderId); // tenancy
  await audit(db, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "order", entityId: orderId, action: "remind", diff: { ...input, balance: o.balance } });
  return { lastReminder: await lastReminder(ctx, orderId) };
}
