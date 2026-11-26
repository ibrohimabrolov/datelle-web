import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { expenseOptions } from "@/server/panel/expenses";

export const GET = route(async (req: NextRequest) => {
  const ctx = await requireStudio(req, { role: "owner" });
  return json(await expenseOptions(ctx));
});
