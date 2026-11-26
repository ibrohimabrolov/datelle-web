import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { scheduleWeek, weekQuery } from "@/server/panel/schedule";

/* Owner and manager — the crew roster and who goes where */
export const GET = route(async (req: NextRequest) => json(await scheduleWeek(await requireStudio(req), weekQuery.parse(Object.fromEntries(req.nextUrl.searchParams)))));
