import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";

export const GET = route(async (req: NextRequest) => {
  const { studio, role } = await requireStudio(req);
  return json({ studio, role });
});
