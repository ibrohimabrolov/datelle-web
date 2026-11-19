/* Forward → buyurtma: pull order fields out of a client chat (Telegram / Instagram Direct), Uzbek (Latin + Cyrillic) and Russian.
   Pure and local — no AI service: clients' names and phones never leave our server (personal-data law, PROJECT_CONTEXT §11.4).
   Every field is optional; the studio always reviews the form before saving. Unit-tested in tests/unit.test.ts. */
import { addDays, isISODate, todayISO } from "../dates";

export type ParsedOrder = {
  clientName?: string;
  clientPhone?: string; // +998XXXXXXXXX
  eventDate?: string; // ISO
  eventType?: string; // STUDIO_EVENTS slug
  venue?: string;
  guests?: number;
  total?: number;
  advance?: number;
};
export type ParseContext = { today?: string; senderName?: string | null };

/* Fields the form shows as "not found" when missing */
export const KEY_FIELDS = ["clientName", "clientPhone", "eventDate", "total"] as const;
export const FIELD_LABEL: Record<keyof ParsedOrder, string> = {
  clientName: "ism",
  clientPhone: "telefon",
  eventDate: "sana",
  eventType: "tadbir turi",
  venue: "joy",
  guests: "mehmonlar",
  total: "summa",
  advance: "avans",
};

type Span = [number, number];
const overlaps = (s: Span, taken: Span[]) => taken.some(([a, b]) => s[0] < b && s[1] > a);

/* ʻ ʼ ’ ‘ ` → '  ·  NBSP → space — so one regex covers every way people type Uzbek */
const norm = (s: string) => s.replace(/[ʻʼ’‘`´]/g, "'").replace(/[  ]/g, " ");

/* ── phone ── */
const MOBILE = "(?:20|33|50|55|61|62|65|66|67|69|70|71|72|73|74|75|76|77|78|79|88|90|91|93|94|95|97|98|99)";
const PHONE_RE = new RegExp(`(?<![\\d+])(?:\\+?\\s*998[\\s\\-().]*)?\\(?\\s*(${MOBILE})\\s*\\)?[\\s\\-.]*(\\d{3})[\\s\\-.]*(\\d{2})[\\s\\-.]*(\\d{2})(?!\\d)`, "g");

/* ── dates ── */
const MONTH_STEMS: [RegExp, number][] = [
  [/^(yanv|янв)/, 1],
  [/^(fev|фев)/, 2],
  [/^(mart(?!a\b)|мар)/, 3],
  [/^(apr|апр)/, 4],
  [/^(may|ма[йяе])/, 5],
  [/^(iyun|июн)/, 6],
  [/^(iyul|июл)/, 7],
  [/^(avg|авг)/, 8],
  [/^(sen|сен)/, 9],
  [/^(okt|окт)/, 10],
  [/^(noy|ноя|ноябр)/, 11],
  [/^(dek|дек)/, 12],
];
const WORD_DATE_RE = /(?<!\d)(\d{1,2})\s*(?:-|–|\s)?\s*([a-zа-яё']{3,12})(?:\s+(\d{4}))?/giu;
const NUM_DATE_RE = /(?<!\d|\d[.,])(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4}))?(?!\d|[.,]\d|\s*(?:mln|млн|million|ming|минг|тыс|k(?!\p{L})|%))/giu;
const ISO_RE = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
const RELATIVE: [RegExp, number][] = [
  [/(?<!\p{L})(indinga|послезавтра|индинга)(?!\p{L})/iu, 2],
  [/(?<!\p{L})(ertaga|завтра|эртага)(?!\p{L})/iu, 1],
  [/(?<!\p{L})(bugun|сегодня|бугун)(?!\p{L})/iu, 0],
];

const pad = (n: number) => String(n).padStart(2, "0");
function makeDate(day: number, month: number, year: number | undefined, today: string): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return;
  let y = year ?? Number(today.slice(0, 4));
  if (y < 100) y += 2000;
  let iso = `${y}-${pad(month)}-${pad(day)}`;
  if (!isISODate(iso)) return;
  // no year given and the date already passed → the client means next year
  if (!year && iso < today) {
    iso = `${y + 1}-${pad(month)}-${pad(day)}`;
    if (!isISODate(iso)) return;
  }
  return iso;
}

/* ── money ── */
const MONEY_RE = /(?<![\d+])(\d{1,3}(?:[ .,]\d{3})+|\d+(?:[.,]\d{1,2})?)\s*(mlrd|миллиард|mln|million|миллион|млн|ming|минг|тыс(?:яч[аи]?)?|k(?!\p{L})|к(?!\p{L}))?\s*(?:so'm|som|сум|сўм|sum|uzs)?/giu;
const ADVANCE_WORDS = /(avans|zalog|zaklad|zadatok|задат|предоплат|аванс|oldindan|oldinga|tashlad|berdi|berib|to'lad|перев[её]л|оплатил|закинул)/i;
const TOTAL_WORDS = /(jami|umumiy|narx|summa|budjet|byudjet|бюджет|цен|стоимост|сумм|итого|всего|kelishd|договорил|hammasi)/i;
const MIN_PRICE = 50_000;

function moneyValue(num: string, unit: string | undefined): number | null {
  const u = (unit ?? "").toLowerCase();
  const scale = /^(mlrd|миллиард)/.test(u) ? 1e9 : /^(mln|million|миллион|млн)/.test(u) ? 1e6 : /^(ming|минг|тыс|т|k|к)/.test(u) ? 1e3 : 1;
  const grouped = /^\d{1,3}(?:[ .,]\d{3})+$/.test(num);
  const n = grouped ? Number(num.replace(/[ .,]/g, "")) : Number(num.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * scale);
}

/* ── event type ── */
const EVENTS: [RegExp, string][] = [
  [/(qiz\s*uzatar|qiz\s*bazm|kelin\s*salom|қиз\s*узатар|девичник)/i, "qiz-uzatar"],
  [/(beshik\s*to'y|бешик)/i, "beshik-toy"],
  [/(tug'?ilgan\s*kun|туғилган|день\s*рожд|днюх|(?<!\p{L})др(?!\p{L})|birthday|b-?day)/iu, "tugilgan-kun"],
  [/(yubiley|юбиле)/i, "yubiley"],
  [/(korporativ|корпоратив)/i, "korporativ"],
  [/(to'y|(?<!\p{L})toy(?!\p{L})|toyi|nikoh|свадьб|тўй|(?<!\p{L})той(?!\p{L}))/iu, "toy"],
];

/* ── venue ── */
const VENUE_WORDS = /(?<!\p{L})(to'?yxona|restoran|ресторан|кафе|kafe|zal(?!\p{L}{3})|зал(?!\p{L}{3})|банкет|banket|mehmonxona|hotel|отел|гостиниц|choyxona|чайхан|тўйхона|terras|террас)/iu;
const HOME_WORDS = /(?<!\p{L})(uyda|uyimizda|дома|uyga)(?!\p{L})/iu;
const EXPLICIT_VENUE = /(?:^|\n)\s*(?:joy|manzil|место|адрес|локация)\s*[:\-–]\s*([^\n]{2,120})/i;

/* ── guests ── */
const GUESTS_RE = /(?<!\d)(\d{1,4})\s*(?:ta\s*)?(?:kishi|kishilik|mehmon|odam|nafar|киши|меҳмон|мехмон|одам|нафар|человек|гост|чел(?!\p{L})|персон|pax)/iu;

/* ── name ── */
const NAME_RE = /(?<!\p{L})(?:[Ii]smim|[Ii]smi|[Mm]ijoz|[Ii]sm|[Ии]смим|[Мм]еня\s+зовут|[Ии]мя|[Кк]лиент)\s*[:\-–,]?\s*([A-ZА-ЯЁЎҚҒҲ][\p{L}'-]{1,24}(?:\s+[A-ZА-ЯЁЎҚҒҲ][\p{L}'-]{1,24})?)/u;

export function parseOrder(input: string, ctx: ParseContext = {}): ParsedOrder {
  const today = ctx.today ?? todayISO();
  const text = norm(input).slice(0, 4000);
  const out: ParsedOrder = {};
  const taken: Span[] = [];

  // phone — first one wins (the client's own number usually comes first)
  for (const m of text.matchAll(PHONE_RE)) {
    const span: Span = [m.index!, m.index! + m[0].length];
    taken.push(span);
    out.clientPhone ??= `+998${m[1]}${m[2]}${m[3]}${m[4]}`;
  }

  // dates — ISO, then 15.05, then "15-may" / "15 мая", then ertaga/indinga
  for (const m of text.matchAll(ISO_RE)) {
    const span: Span = [m.index!, m.index! + m[0].length];
    if (overlaps(span, taken)) continue;
    const iso = makeDate(+m[3], +m[2], +m[1], today);
    taken.push(span);
    out.eventDate ??= iso;
  }
  for (const m of text.matchAll(NUM_DATE_RE)) {
    const span: Span = [m.index!, m.index! + m[0].length];
    if (overlaps(span, taken)) continue;
    const iso = makeDate(+m[1], +m[2], m[3] ? +m[3] : undefined, today);
    if (!iso) continue;
    taken.push(span);
    out.eventDate ??= iso;
  }
  for (const m of text.matchAll(WORD_DATE_RE)) {
    const span: Span = [m.index!, m.index! + m[0].length];
    if (overlaps(span, taken)) continue;
    const word = m[2].toLowerCase();
    const month = MONTH_STEMS.find(([re]) => re.test(word))?.[1];
    if (!month) continue;
    const iso = makeDate(+m[1], month, m[3] ? +m[3] : undefined, today);
    if (!iso) continue;
    taken.push(span);
    out.eventDate ??= iso;
  }
  if (!out.eventDate) {
    for (const [re, n] of RELATIVE) {
      if (re.test(text)) {
        out.eventDate = addDays(today, n);
        break;
      }
    }
  }

  // guests — before money, so "150 kishi" is never read as a price
  const g = GUESTS_RE.exec(text);
  if (g) {
    const n = Number(g[1]);
    if (n >= 1 && n <= 5000) out.guests = n;
    taken.push([g.index, g.index + g[0].length]);
  }

  // money — the advance is the amount next to an advance word; the total is the largest of the rest
  const amounts: { value: number; advance: boolean; total: boolean }[] = [];
  for (const m of text.matchAll(MONEY_RE)) {
    const span: Span = [m.index!, m.index! + m[0].length];
    if (overlaps(span, taken)) continue;
    const value = moneyValue(m[1], m[2]);
    if (value == null || (value < MIN_PRICE && !m[2])) continue;
    if (value < 1000) continue;
    // context stays inside the clause: "9 mln, 2 mln avans" must not leak "avans" onto 9 mln
    const before = text.slice(Math.max(0, span[0] - 30), span[0]).split(/[,;\n!?]|\.\s/).pop() ?? "";
    const after = text.slice(span[1], span[1] + 16).split(/[,;\n!?]|\.\s/)[0];
    amounts.push({ value, advance: ADVANCE_WORDS.test(before) || ADVANCE_WORDS.test(after), total: TOTAL_WORDS.test(before) });
  }
  const adv = amounts.find((a) => a.advance && !a.total);
  const tot = amounts.find((a) => a.total) ?? amounts.filter((a) => a !== adv).sort((a, b) => b.value - a.value)[0];
  if (tot) out.total = tot.value;
  if (adv && (!tot || adv.value <= tot.value)) out.advance = adv.value;

  // event type
  for (const [re, slug] of EVENTS) {
    if (re.test(text)) {
      out.eventType = slug;
      break;
    }
  }

  // venue — explicit "Joy: …" first, then the line that names a hall/restaurant, then "uyda"
  const explicit = EXPLICIT_VENUE.exec(text);
  if (explicit) out.venue = tidy(explicit[1]);
  else {
    const line = text
      .split(/\n|[.;!?]\s/)
      .map((l) => l.trim())
      .find((l) => VENUE_WORDS.test(l));
    const v = line && tidy(venuePhrase(line));
    if (v && !/^(zal|зал)$/i.test(v)) out.venue = v; // a bare "hall" says nothing
    else if (HOME_WORDS.test(text)) out.venue = "Uyda";
  }

  // name — the forwarded message's author beats anything guessed from the text
  const sender = ctx.senderName?.trim();
  if (sender && sender.length >= 2) out.clientName = sender.slice(0, 80);
  else {
    const n = NAME_RE.exec(text);
    if (n) out.clientName = n[1].trim();
  }

  return out;
}

/* "… kuni, Navro'z to'yxonasida bo'ladi" → "Navro'z to'yxonasi" · "в кафе Bon" → "кафе Bon"
   Keep the name around the venue word (starts with a capital), strip the case suffix from the venue word. */
const CAP = /^["«]?[A-ZА-ЯЁЎҚҒҲ0-9]/;
function venuePhrase(line: string) {
  const m = VENUE_WORDS.exec(line);
  if (!m) return line;
  const clause = line.slice(0, m.index).split(/[,:;–]/).pop() ?? "";
  const head = clause.trim().split(/\s+/).filter(Boolean).slice(-3);
  while (head.length && !CAP.test(head[0])) head.shift();
  const rest = line.slice(m.index).split(/[\s,]+/);
  const word = rest[0]
    .replace(/(sida|sidagi)$/i, "si")
    .replace(/(сида|сидаги)$/i, "си")
    .replace(/(?<=[a-z'])(dagi|dan|da|ga)$/i, "")
    .replace(/(?<=[а-яёўқғҳ])(даги|дан|да|га)$/i, "")
    .replace(/^(ресторан|зал|банкет|отел)(е|у|ом|ах)$/i, "$1");
  const tail: string[] = [];
  if (!head.length) for (const w of rest.slice(1, 3)) if (/^["«]?[A-ZА-ЯЁЎҚҒҲ]/.test(w)) tail.push(w.replace(/[.,!?]+$/, "")); else break;
  return [...head, word, ...tail].join(" ").replace(/["«»]/g, "").trim() || line;
}
const tidy = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/^[\s,:–-]+|[\s,.:–-]+$/g, "")
    .slice(0, 120);

/* The fields a form should still ask for */
export const missingKeyFields = (p: ParsedOrder) => KEY_FIELDS.filter((k) => p[k] == null);
/* Enough signal to call it an order (otherwise the bot answers with help) */
export const looksLikeOrder = (p: ParsedOrder) => Boolean(p.eventDate || p.clientPhone || p.total);
