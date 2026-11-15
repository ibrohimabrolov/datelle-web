import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { listMembers } from "@/server/panel/team";

export const GET = route(async (req: NextRequest) => json(await listMembers(await requireStudio(req, { role: "owner" }))));
