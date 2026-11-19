import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { recordReminder, remindSchema } from "@/server/panel/clientDocs";
import { limit } from "@/server/ratelimit";

/* POST { channel, lang } — the studio sent the balance reminder (the text goes from their own phone);
   we only record it, so the order shows "Eslatildi · 2 kun oldin" and the team doesn't double-remind. */
export const POST = route<RouteContext<"/api/panel/orders/[id]/remind">>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await recordReminder(ctx, (await params).id, await body(req, remindSchema)));
});
