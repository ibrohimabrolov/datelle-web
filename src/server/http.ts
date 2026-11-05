import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const json = (data: unknown, init?: ResponseInit & { cache?: "no-store" | "public" }) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", init?.cache === "public" ? "public, s-maxage=30, stale-while-revalidate=120" : "no-store");
  return NextResponse.json(data, { ...init, headers });
};

/* Mutations must come from our own pages as JSON — blocks cross-site form posts (CSRF) */
export function assertSameOrigin(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) throw new HttpError(415, "unsupported_media_type", "JSON kutilgan");
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) throw new HttpError(403, "bad_origin", "Ruxsat yoʻq");
}

export async function body<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "bad_json", "Notoʻgʻri soʻrov");
  }
  return schema.parse(raw);
}

export const clientIp = (req: NextRequest) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/* Uniform error envelope: { error: { code, message, fields? } } */
export function route<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      unstable_rethrow(e); // let Next's own control-flow errors (prerender bail-outs, notFound) through
      if (e instanceof HttpError) return json({ error: { code: e.code, message: e.message, ...e.extra } }, { status: e.status });
      if (e instanceof ZodError) {
        const fields = Object.fromEntries(e.issues.map((i) => [i.path.join(".") || "_", i.message]));
        return json({ error: { code: "validation", message: "Maʼlumotlarni tekshiring", fields } }, { status: 422 });
      }
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return json({ error: { code: "internal", message: "Serverda xatolik. Birozdan keyin urinib koʻring." } }, { status: 500 });
    }
  };
}
