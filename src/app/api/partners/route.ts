import type { NextRequest } from "next/server";
import { z } from "zod";
import { DISTRICTS } from "@/data/catalog";
import { db, schema } from "@/server/db";
import { assertSameOrigin, body, clientIp, json, route } from "@/server/http";
import { phoneSchema } from "@/server/phone";
import { limit } from "@/server/ratelimit";

const schemaIn = z.object({
  studioName: z.string().trim().min(2, "Studiya nomini kiriting").max(80),
  category: z.enum(["dekor", "floristika"]),
  district: z.enum(DISTRICTS, { message: "Tumanni tanlang" }),
  instagram: z.string().trim().max(60).optional(),
  legalForm: z.enum(["YaTT", "MChJ", "Oʻzini oʻzi band qilgan"]),
  contactName: z.string().trim().min(2, "Ismingizni kiriting").max(60),
  phone: phoneSchema,
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await limit(`partner:ip:${clientIp(req)}`, 5, 3600);
  const input = await body(req, schemaIn);
  const [row] = await db.insert(schema.partnerApplications).values({ ...input, instagram: input.instagram || null }).returning({ id: schema.partnerApplications.id });
  return json({ id: row.id }, { status: 201 });
});
