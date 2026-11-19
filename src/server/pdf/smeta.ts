import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { ACCENT, PETALS } from "@/components/ui/Logo";
import { docDate, docEvent, docMoney, METHOD_DOC, SMETA_COPY, type DocLang } from "@/lib/studio/clientDocs";

/* Smeta — the one-page A4 document a studio sends its client: what, when, where, how much, what's left.
   Inter (Latin + Cyrillic, subset-embedded), studio tokens as colours, 8pt grid.
   Fonts are traced into the route bundle via next.config outputFileTracingIncludes. */

export type SmetaData = {
  studio: string;
  contact?: string | null; // "@username" of the studio member who sends it
  code: string;
  issued: string; // ISO
  client: string;
  phone: string;
  date: string;
  eventType: string;
  venue?: string | null;
  guests?: number | null;
  notes?: string | null;
  total: number;
  paid: number;
  payments: { paidOn: string; method: string; amount: number }[];
};

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  text: hex("#0f0f11"),
  secondary: hex("#45454c"),
  tertiary: hex("#5c5c64"),
  border: hex("#e4e4e7"),
  surface: hex("#f1f1f3"),
  dueBg: hex("#fffaeb"),
  due: hex("#92400e"),
  paidBg: hex("#eaf3ef"),
  paid: hex("#1e5a45"),
  petal: hex("#1e5a45"),
  accent: hex("#e9806a"),
};

const W = 595.28;
const H = 841.89;
const M = 48; // page margin
const fontsDir = () => path.join(process.cwd(), "assets", "fonts");
let fontCache: Promise<[Uint8Array, Uint8Array]> | null = null;
const loadFonts = () =>
  (fontCache ??= Promise.all([readFile(path.join(fontsDir(), "Inter-Regular.ttf")), readFile(path.join(fontsDir(), "Inter-SemiBold.ttf"))]).catch((e) => {
    fontCache = null;
    throw e;
  }));

function wrap(text: string, font: PDFFont, size: number, width: number, maxLines = 99): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = `${cut[maxLines - 1].replace(/\s+\S*$/, "")} …`;
    return cut;
  }
  return lines;
}

export async function renderSmeta(d: SmetaData, lang: DocLang): Promise<Uint8Array> {
  const t = SMETA_COPY[lang];
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regBytes, semiBytes] = await loadFonts();
  const reg = await pdf.embedFont(regBytes, { subset: true });
  const semi = await pdf.embedFont(semiBytes, { subset: true });
  pdf.setTitle(`${t.title} ${d.code} — ${d.studio}`);
  pdf.setAuthor(d.studio);
  pdf.setCreator("Floreal");
  pdf.setLanguage(lang === "ru" ? "ru-RU" : "uz-Latn");
  const page = pdf.addPage([W, H]);

  const text = (p: PDFPage, s: string, x: number, y: number, size: number, font = reg, color = C.text) => p.drawText(s, { x, y, size, font, color });
  const right = (s: string, xr: number, y: number, size: number, font = reg, color = C.text) => text(page, s, xr - font.widthOfTextAtSize(s, size), y, size, font, color);
  const rule = (y: number) => page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.75, color: C.border });

  /* ── header: studio left, document id right ── */
  let y = H - M - 20;
  const nameLines = wrap(d.studio, semi, 22, 320, 2);
  nameLines.forEach((l, i) => text(page, l, M, y - i * 28, 22, semi));
  right(t.title.toUpperCase(), W - M, y + 6, 10, semi, C.tertiary);
  right(`№ ${d.code}`, W - M, y - 10, 12, semi);
  right(`${t.issued}: ${docDate(d.issued, lang)}`, W - M, y - 26, 9.5, reg, C.tertiary);
  y -= 28 * (nameLines.length - 1) + 48;
  rule(y);

  /* ── client · event ── */
  y -= 32;
  const colW = (W - 2 * M - 24) / 2;
  const block = (x: number, label: string, rows: [string, string | null | undefined][]) => {
    let yy = y;
    text(page, label.toUpperCase(), x, yy, 8.5, semi, C.tertiary);
    yy -= 22;
    for (const [k, v] of rows) {
      if (!v) continue;
      if (k) text(page, k, x, yy, 9, reg, C.tertiary);
      const lines = wrap(v, reg, 11, colW - (k ? 96 : 0), 2);
      lines.forEach((l, i) => text(page, l, x + (k ? 96 : 0), yy - i * 15, 11));
      yy -= 15 * lines.length + 6;
    }
    return yy;
  };
  const phone = d.phone.replace(/^(\+998)(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5");
  const yA = block(M, t.client, [
    ["", d.client],
    ["", phone],
  ]);
  const yB = block(M + colW + 24, t.event, [
    ["", docEvent(d.eventType, lang)],
    [t.date, docDate(d.date, lang)],
    [t.venue, d.venue],
    [t.guests, d.guests ? String(d.guests) : null],
  ]);
  y = Math.min(yA, yB) - 24;

  /* ── service table ── */
  const head = 28;
  page.drawRectangle({ x: M, y: y - head, width: W - 2 * M, height: head, color: C.surface });
  text(page, t.service, M + 16, y - 18, 9, semi, C.secondary);
  right(t.amount, W - M - 16, y - 18, 9, semi, C.secondary);
  y -= head + 22;
  text(page, t.decor(docEvent(d.eventType, lang)), M + 16, y, 11.5, semi);
  right(docMoney(d.total, lang), W - M - 16, y, 11.5, semi);
  if (d.notes?.trim()) {
    const notes = wrap(d.notes.trim(), reg, 9.5, W - 2 * M - 32 - 160, 6);
    notes.forEach((l, i) => text(page, l, M + 16, y - 18 - i * 14, 9.5, reg, C.secondary));
    y -= 18 + 14 * notes.length;
  }
  y -= 18;
  rule(y);

  /* ── payments ── */
  if (d.payments.length) {
    y -= 28;
    text(page, t.payments.toUpperCase(), M, y, 8.5, semi, C.tertiary);
    for (const p of d.payments.slice(0, 8)) {
      y -= 20;
      text(page, `${docDate(p.paidOn, lang)} · ${METHOD_DOC[lang][p.method] ?? p.method}`, M, y, 10, reg, C.secondary);
      right(docMoney(p.amount, lang), W - M - 16, y, 10);
    }
    y -= 16;
  }

  /* ── totals ── */
  const balance = d.total - d.paid;
  const boxX = W - M - 248;
  y -= 24;
  text(page, t.total, boxX + 16, y, 10, reg, C.secondary);
  right(docMoney(d.total, lang), W - M - 16, y, 10);
  y -= 20;
  text(page, t.paid, boxX + 16, y, 10, reg, C.secondary);
  right(docMoney(d.paid, lang), W - M - 16, y, 10);
  y -= 16;
  const due = balance > 0;
  page.drawRectangle({ x: boxX, y: y - 48, width: 248, height: 48, color: due ? C.dueBg : C.paidBg });
  text(page, due ? t.balance : t.settled, boxX + 16, y - 29, 11, semi, due ? C.due : C.paid);
  if (due) right(docMoney(balance, lang), W - M - 16, y - 30, 16, semi, C.due);
  y -= 48;
  if (due) right(t.dueNote, W - M, y - 20, 9, reg, C.tertiary);

  /* ── footer ── */
  const fy = M;
  page.drawLine({ start: { x: M, y: fy + 24 }, end: { x: W - M, y: fy + 24 }, thickness: 0.75, color: C.border });
  if (d.contact) text(page, `${t.contact}: ${d.contact}`, M, fy + 4, 9, reg, C.secondary);
  const markSize = 12;
  const label = t.footer;
  const lw = reg.widthOfTextAtSize(label, 8.5);
  const mx = W - M - lw - markSize - 6;
  const s = markSize / 32;
  for (const p of PETALS) page.drawSvgPath(p, { x: mx, y: fy + 4 + markSize, scale: s, color: C.petal });
  page.drawSvgPath(ACCENT, { x: mx, y: fy + 4 + markSize, scale: s, color: C.accent });
  text(page, label, W - M - lw, fy + 6, 8.5, reg, C.tertiary);

  return pdf.save();
}

export const smetaFileName = (code: string, lang: DocLang) => `${lang === "ru" ? "Smeta" : "Smeta"}-${code}.pdf`;
