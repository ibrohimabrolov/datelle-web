"use client";

import { PhoneField, TextField } from "@/components/ui/Form";
import { Icon } from "@/components/ui/Icon";
import { logout, type User } from "@/components/auth/session";

/* Name + phone. Once the phone is verified it is shown read-only — the request goes out under that number. */
export function ContactFields({
  name, setName, phone, setPhone, errors, user, grid,
}: {
  name: string; setName: (v: string) => void; phone: string; setPhone: (v: string) => void;
  errors: { name?: string; phone?: string }; user: User | null; grid?: boolean;
}) {
  return (
    <div className={grid ? "grid gap-3 sm:grid-cols-2" : "flex flex-col gap-4"}>
      <TextField
        label="Ismingiz"
        placeholder={user?.name ?? "Masalan, Dilnoza"}
        autoComplete="given-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      {user ? (
        <div className="flex flex-col gap-2">
          <span className="text-[14px] leading-[18px] font-medium text-ink-2">Telefon</span>
          <div className="flex h-[52px] items-center justify-between gap-2 rounded-lg border border-line bg-surface-subtle px-4">
            <span className="flex items-center gap-2 t-body-m">
              <Icon name="check" size={16} className="text-success" />
              {user.phone.replace(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/, "+998 $1 $2 $3 $4")}
            </span>
            <button type="button" onClick={() => void logout()} className="t-cap-m text-brand hover:underline">
              Boshqa raqam
            </button>
          </div>
        </div>
      ) : (
        <PhoneField value={phone} onChange={setPhone} error={errors.phone} />
      )}
    </div>
  );
}
