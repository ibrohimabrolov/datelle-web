import type { NextRequest } from "next/server";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { interestBody, myInterests, voteInterest } from "@/server/panel/interest";
import { limit } from "@/server/ratelimit";

/* "Tez orada" votes of the signed-in member in the current studio */
export const GET = route(async (req: NextRequest) => json({ features: await myInterests(await requireStudio(req)) }));

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req);
  await limit(`panel:write:${ctx.user.id}`, 300, 3600);
  const { feature } = await body(req, interestBody);
  return json({ features: await voteInterest(ctx, feature) });
});
