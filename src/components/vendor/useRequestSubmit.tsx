"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";
import { OtpDialog } from "@/components/auth/OtpDialog";
import { useSession } from "@/components/auth/session";

export type RequestPayload = {
  type: "booking" | "quote";
  vendor: string;
  date: string;
  name: string;
  packageId?: string;
  eventType?: string;
  guests?: number;
  venue?: string;
  budget?: string;
  notes?: string;
};

/* Booking/quote submit: verify phone once (OTP), then create the request and open its page */
export function useRequestSubmit() {
  const router = useRouter();
  const session = useSession();
  const [pending, setPending] = useState<{ phone: string; payload: RequestPayload } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const send = async (payload: RequestPayload, phone?: string) => {
    setBusy(true);
    setError(null);
    try {
      const { request } = await api<{ request: { id: string } }>("/api/requests", { body: payload });
      router.push(`/sorov/${request.id}`);
    } catch (e) {
      const ae = e as ApiError;
      if (ae.status === 401 && phone) setPending({ phone, payload });
      else if (ae.code === "duplicate" && ae.extra.id) router.push(`/sorov/${ae.extra.id}`);
      else setError(ae);
      setBusy(false);
    }
  };

  const submit = (payload: RequestPayload, phone: string) => {
    if (session.status === "user") return send(payload, phone);
    setPending({ phone, payload });
  };

  const dialog = (
    <OtpDialog
      open={!!pending}
      phone={pending?.phone ?? ""}
      name={pending?.payload.name}
      onClose={() => setPending(null)}
      onDone={() => {
        const p = pending!;
        setPending(null);
        void send(p.payload);
      }}
    />
  );

  return { submit, busy, error, clearError: () => setError(null), dialog, user: session.user, sessionStatus: session.status };
}
