import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { assertSameOrigin, body, json, route } from "@/server/http";
import { createRequest, createSchema, getRequest, listRequests } from "@/server/requests";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ items: await listRequests(user.id) });
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const input = await body(req, createSchema);
  const id = await createRequest(user, input);
  return json({ request: await getRequest(user.id, id) }, { status: 201 });
});
