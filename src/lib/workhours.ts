/* Vendor answer deadline: N working hours; nights (22:00–08:00 Toshkent, UTC+5) don't count */
const TZ_MS = 5 * 3600_000;

export function addWorkingHours(from: Date, hours: number) {
  let t = from.getTime();
  let left = hours * 60; // minutes
  while (left > 0) {
    const local = new Date(t + TZ_MS);
    const h = local.getUTCHours();
    if (h >= 22 || h < 8) {
      const next = new Date(local);
      if (h >= 22) next.setUTCDate(next.getUTCDate() + 1);
      next.setUTCHours(8, 0, 0, 0);
      t = next.getTime() - TZ_MS;
      continue;
    }
    const step = Math.min(left, (22 - h) * 60 - local.getUTCMinutes());
    t += step * 60_000;
    left -= step;
  }
  return new Date(t);
}
