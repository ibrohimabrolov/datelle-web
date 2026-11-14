import { json, route } from "@/server/http";
import { requirePanelUser } from "@/server/panel/auth";
import { mePayload } from "@/server/panel/service";

export const GET = route(async () => json(await mePayload(await requirePanelUser())));
