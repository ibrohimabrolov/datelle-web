import type { NextRequest } from "next/server";
import { HttpError, json, route } from "@/server/http";
import { requirePanelUser } from "@/server/panel/auth";
import { getDraft } from "@/server/panel/drafts";

type Ctx = RouteContext<"/api/panel/drafts/[id]">;

/* Forward → buyurtma: the parsed draft for the prefilled order form. Only its author can read it. */
export const GET = route<Ctx>(async (_req: NextRequest, { params }) => {
  const user = await requirePanelUser();
  const draft = await getDraft(user, (await params).id);
  if (!draft) throw new HttpError(404, "not_found", "Qoralama topilmadi yoki allaqachon saqlangan");
  return json({ draft });
});
