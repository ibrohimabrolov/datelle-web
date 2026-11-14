"use client";

import { useEffect, useEffectEvent } from "react";
import { StudioIcon } from "./icons";

export type ToastMsg = { id: number; text: string; action?: { label: string; run(): void } };

/* Figma Toast: one at a time, 5 s, optional undo. role=status so screen readers announce it politely. */
export function Toast({ toast, onDone }: { toast: ToastMsg | null; onDone(): void }) {
  const done = useEffectEvent(onDone);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => done(), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className="ds-toast" role="status" key={toast.id}>
      <StudioIcon name="check" />
      <span>{toast.text}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.run();
            onDone();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
