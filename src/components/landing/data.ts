/* Landing constants shared by both languages. */

const BOT = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "floreal_uz_bot").replace(/^@/, "");
export const BOT_HANDLE = `@${BOT}`;
export const BOT_URL = `https://t.me/${BOT}`;
export const LOGIN_URL = "/panel/kirish";

/* All visible copy lives in ./copy.ts (UZ + RU). */
