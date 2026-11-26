import type { NextRequest } from "next/server";
import { json, route } from "@/server/http";
import { requireStudio } from "@/server/panel/auth";
import { propOptions } from "@/server/panel/props";

export const GET = route(async (req: NextRequest) => json(await propOptions(await requireStudio(req))));
