import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { createExpense, createSchema, expenseOverview, monthQuery } from "@/server/panel/expenses";
import { limit } from "@/server/ratelimit";

/* Owner only (MVP-SCOPE: managers don't see money totals) */
export const GET = route(async (req: NextRequest) => {
  const ctx = await requireStudio(req, { role: "owner" });
  return json(await expenseOverview(ctx, monthQuery.parse(Object.fromEntries(req.nextUrl.searchParams))));
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req, { role: "owner" });
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  return json(await createExpense(ctx, await body(req, createSchema)), { status: 201 });
});
