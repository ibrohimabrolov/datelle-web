import { requireAdmin } from "@/server/admin";
import { json, route } from "@/server/http";

export const GET = route(async () => {
  await requireAdmin();
  return json({ admin: true });
});
