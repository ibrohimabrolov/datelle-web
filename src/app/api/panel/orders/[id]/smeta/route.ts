import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { buildSmeta, langSchema, sendSmeta, smetaSendSchema } from "@/server/panel/clientDocs";
import { limit } from "@/server/ratelimit";

type Ctx = RouteContext<"/api/panel/orders/[id]/smeta">;

/* GET ?lang=uz|ru — the PDF itself (desktop download / preview) */
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  const ctx = await requireStudio(req);
  await limit(`panel:pdf:${ctx.user.id}`, 60, 3600);
  const { bytes, name } = await buildSmeta(ctx, (await params).id, langSchema.parse(req.nextUrl.searchParams.get("lang")));
  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${req.nextUrl.searchParams.has("inline") ? "inline" : "attachment"}; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});

/* POST { lang } — the bot sends the PDF to the member's own Telegram chat, ready to forward */
export const POST = route<Ctx>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:pdf:${ctx.user.id}`, 60, 3600);
  const { lang } = await body(req, smetaSendSchema);
  return json(await sendSmeta(ctx, (await params).id, lang));
});
