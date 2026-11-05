import type { NextRequest } from "next/server";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { assertSameOrigin, body, clientIp, json, route } from "@/server/http";
import { phoneSchema } from "@/server/phone";
import { limit } from "@/server/ratelimit";
import { isISODate } from "@/lib/dates";

/* "Biz topib beramiz" — concierge callback request from an empty search */
export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await limit(`lead:ip:${clientIp(req)}`, 10, 3600);
  const input = await body(
    req,
    z.object({
      phone: phoneSchema,
      date: z.string().refine(isISODate).optional(),
      context: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])).optional(),
    }),
  );
  const [row] = await db.insert(schema.leads).values({ phone: input.phone, eventDate: input.date, context: input.context }).returning({ id: schema.leads.id });
  return json({ id: row.id }, { status: 201 });
});
