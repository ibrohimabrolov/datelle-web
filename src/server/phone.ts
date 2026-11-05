import { z } from "zod";

/* Uzbek mobile numbers → +998XXXXXXXXX. Accepts "90 123 45 67", "+998 90 123-45-67", "998901234567". */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("998")) d = d.slice(3);
  if (d.length !== 9) return null;
  if (!/^(20|33|50|55|61|62|65|66|67|69|70|71|72|73|74|75|76|77|78|79|88|90|91|93|94|95|97|98|99)/.test(d)) return null;
  return `+998${d}`;
}

export const phoneSchema = z
  .string()
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Telefon raqami notoʻgʻri" });
      return z.NEVER;
    }
    return p;
  });

export const maskPhone = (p: string) => `${p.slice(0, 6)} ${p.slice(6, 9)} ** ${p.slice(11)}`;
