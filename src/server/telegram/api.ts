/* Minimal Bot API client. Takes the token explicitly so it also runs from build scripts;
   the token is never NEXT_PUBLIC_, so it can't reach a client bundle. */

export class TelegramError extends Error {
  constructor(
    public method: string,
    public status: number,
    public description: string,
    public retryAfter?: number,
  ) {
    super(`telegram ${method} ${status}: ${description}`);
  }
  /* 403 = user blocked the bot / never started it; 400 chat not found — don't retry */
  get permanent() {
    return this.status === 403 || (this.status === 400 && /chat not found|user is deactivated/i.test(this.description));
  }
}

type TgResponse<T> = { ok: true; result: T } | { ok: false; error_code: number; description: string; parameters?: { retry_after?: number } };

export async function callTelegram<T = unknown>(token: string, method: string, payload: object = {}, timeoutMs = 8000): Promise<T> {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  let j: TgResponse<T>;
  try {
    j = (await r.json()) as TgResponse<T>;
  } catch {
    throw new TelegramError(method, r.status, "non-JSON response");
  }
  if (!j.ok) throw new TelegramError(method, j.error_code ?? r.status, j.description ?? "unknown", j.parameters?.retry_after);
  return j.result;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/* One retry on 429 (flood control) honouring retry_after, capped at 5 s so a cron run stays short */
export async function sendWithRetry(token: string, method: string, payload: object) {
  try {
    return await callTelegram(token, method, payload);
  } catch (e) {
    if (e instanceof TelegramError && e.status === 429 && (e.retryAfter ?? 0) <= 5) {
      await sleep((e.retryAfter ?? 1) * 1000);
      return callTelegram(token, method, payload);
    }
    throw e;
  }
}
