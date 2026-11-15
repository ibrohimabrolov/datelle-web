import type { NextRequest } from "next/server";
import { assertSameOrigin, json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { removeMember } from "@/server/panel/team";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DELETE = route<RouteContext<"/api/panel/members/[userId]">>(async (req: NextRequest, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireStudio(req, { role: "owner" });
  const { userId } = await params;
  if (!UUID_RE.test(userId)) return json({ error: { code: "not_found", message: "Aʼzo topilmadi" } }, { status: 404 });
  return json(await removeMember(ctx, userId));
});
