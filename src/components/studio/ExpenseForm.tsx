"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dayLabel, dayShort, todayISO } from "@/lib/dates";
import { categoryLabel, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/studio/expenses";
import { groupThousands } from "@/lib/studio/orders";
import { Button } from "./Button";
import { Field, MoneyInput } from "./Fields";
import { StudioIcon } from "./icons";
import { ConfirmDialog, Menu, Modal } from "./Modal";
import { Overlay } from "./Overlay";
import { useStudio } from "./PanelProvider";

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  title: string;
  date: string;
  createdAt: string;
  order: { id: string; client: string; venue: string | null; date: string } | null;
  paidBy: { id: string; name: string } | null;
  createdBy: string | null;
};
type Options = { orders: { id: string; client: string; venue: string | null; date: string }[]; members: { id: string; name: string; role: string }[] };

const orderLine = (o: { client: string; venue: string | null; date: string }) => [o.client, o.venue, dayShort(o.date)].filter(Boolean).join(" · ");
const SelectChevron = () => <StudioIcon name="chevron-down" size={20} />;

/* Figma S9 · Xarajatlar · qoʻshish (modal 480, 499:11777): Summa · Kategoriya chips · Nima uchun · Tadbir · Sana + Kim toʻladi · Bekor / Qoʻshish.
   The same dialog edits an existing expense (title "Xarajatni tahrirlash", primary "Saqlash"). */
export function ExpenseForm({ expense, onClose, onSaved }: { expense?: Expense; onClose(): void; onSaved(e: Expense, created: boolean): void }) {
  const ctx = useStudio();
  const [opts, setOpts] = useState<Options | null>(null);
  const [amount, setAmount] = useState<number | null>(expense?.amount ?? null);
  const [category, setCategory] = useState<ExpenseCategory | null>(expense?.category ?? null);
  const [title, setTitle] = useState(expense?.title ?? "");
  const [orderId, setOrderId] = useState<string>(expense?.order?.id ?? "");
  const [spentOn, setSpentOn] = useState(expense?.date ?? todayISO());
  const [paidBy, setPaidBy] = useState<string>(expense ? (expense.paidBy?.id ?? "") : (ctx?.me.user.id ?? ""));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<Options>("/api/panel/expenses/options")
      .then((o) => alive && setOpts(o))
      .catch(() => alive && setOpts({ orders: [], members: [] }));
    return () => {
      alive = false;
    };
  }, []);

  // keep the linked order selectable even when it falls outside the ±3 month window
  const orders = opts ? (expense?.order && !opts.orders.some((o) => o.id === expense.order!.id) ? [expense.order, ...opts.orders] : opts.orders) : [];
  const members = opts?.members ?? [];

  return (
    <Modal title={expense ? "Xarajatni tahrirlash" : "Xarajat qoʻshish"} onClose={onClose}>
      <form
        className="ds-form ds-xp-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          setErrors({});
          const payload = { amount: amount ?? 0, category, title, orderId: orderId || null, spentOn, paidBy: paidBy || null };
          try {
            const r = expense
              ? await api<{ expense: Expense }>(`/api/panel/expenses/${expense.id}`, { method: "PATCH", body: payload })
              : await api<{ expense: Expense }>("/api/panel/expenses", { body: payload });
            onSaved(r.expense, !expense);
          } catch (e2) {
            if (e2 instanceof ApiError && e2.fields) setErrors(e2.fields);
            else setErr(e2 instanceof ApiError ? e2.message : "Saqlab boʻlmadi");
            setBusy(false);
          }
        }}
      >
        <Field label="Summa" error={errors.amount}>
          {(a) => <MoneyInput {...a} value={amount} onChange={setAmount} data-autofocus placeholder="0" />}
        </Field>

        <div className="ds-field">
          <span className="ds-label ds-secondary" id="xp-cat-label">
            Kategoriya
          </span>
          <div className="ds-chips" role="radiogroup" aria-labelledby="xp-cat-label" aria-describedby={errors.category ? "xp-cat-err" : undefined}>
            {EXPENSE_CATEGORIES.map((c) => (
              <button key={c.slug} type="button" role="radio" className="ds-chip-btn" aria-checked={category === c.slug} onClick={() => setCategory(c.slug)}>
                {c.label}
              </button>
            ))}
          </div>
          {errors.category && (
            <p id="xp-cat-err" className="ds-helper" data-error>
              {errors.category}
            </p>
          )}
        </div>

        <Field label="Nima uchun" error={errors.title}>
          {(a) => <input {...a} className="ds-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Atirgul, 300 dona" maxLength={120} />}
        </Field>

        <Field label="Tadbir" error={errors.orderId} hint="Umumiy xarajat boʻlsa — boʻsh qoldiring">
          {(a) => (
            <span className="ds-select ds-xp-select">
              <select {...a} value={orderId} onChange={(e) => setOrderId(e.target.value)} disabled={!opts}>
                <option value="">Umumiy xarajat</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {orderLine(o)}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </span>
          )}
        </Field>

        <div className="ds-pair">
          <Field label="Sana" error={errors.spentOn}>
            {(a) => <input {...a} className="ds-input" type="date" value={spentOn} max={todayISO()} onChange={(e) => e.target.value && setSpentOn(e.target.value)} />}
          </Field>
          <Field label="Kim toʻladi" error={errors.paidBy}>
            {(a) => (
              <span className="ds-select ds-xp-select">
                <select {...a} value={paidBy} onChange={(e) => setPaidBy(e.target.value)} disabled={!opts}>
                  <option value="">Koʻrsatilmagan</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </span>
            )}
          </Field>
        </div>

        {err && (
          <p className="ds-alert" role="alert">
            {err}
          </p>
        )}
        <div className="ds-modal-foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button type="submit" loading={busy} disabled={!amount || !category || title.trim().length < 2}>
            {expense ? "Saqlash" : "Qoʻshish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* Figma S9 · Xarajatlar · xarajat paneli (side panel 480, 499:12089): pill · amount · title · info rows · Oʻchirish / Tahrirlash */
export function ExpenseDetail({ id, onClose, onEdit, onDeleted }: { id: string; onClose(): void; onEdit(e: Expense): void; onDeleted(e: Expense): void }) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let alive = true;
    api<{ expense: Expense }>(`/api/panel/expenses/${id}`)
      .then((r) => alive && setExpense(r.expense))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Yuklab boʻlmadi"));
    return () => {
      alive = false;
    };
  }, [id]);

  const added = expense ? new Date(expense.createdAt) : null;
  const addedLabel = added
    ? `${dayShort(new Date(added.getTime() + 5 * 3600_000).toISOString().slice(0, 10))}, ${new Date(added.getTime() + 5 * 3600_000).toISOString().slice(11, 16)}${expense!.createdBy ? ` · ${expense!.createdBy.split(" ")[0]}` : ""}`
    : "";

  return (
    <Overlay
      title="Xarajat"
      onClose={onClose}
      actions={expense ? <Menu label="Amallar" items={[{ label: "Tahrirlash", onSelect: () => onEdit(expense) }, { label: "Oʻchirish", danger: true, onSelect: () => setConfirm(true) }]} /> : undefined}
    >
      {error ? (
        <div className="ds-stack" role="alert">
          <p className="ds-body-strong">Xarajatni ochib boʻlmadi</p>
          <p className="ds-body ds-secondary">{error}</p>
        </div>
      ) : !expense ? (
        <div className="ds-stack" aria-busy>
          <span className="ds-skeleton" style={{ height: 24, width: 64 }} />
          <span className="ds-skeleton" style={{ height: 36, width: 240 }} />
          <span className="ds-skeleton" style={{ height: 230, borderRadius: "var(--ds-radius-lg)" }} />
        </div>
      ) : (
        <>
          <div className="ds-xp-dhead">
            <span className="ds-xp-pill" data-cat={expense.category}>
              {categoryLabel(expense.category)}
            </span>
            <p className="ds-xp-damount">{groupThousands(expense.amount)} soʻm</p>
            <p className="ds-body ds-secondary">{expense.title}</p>
          </div>
          <dl className="ds-xp-info">
            <div>
              <dt>Tadbir</dt>
              <dd data-brand={expense.order ? "" : undefined}>{expense.order ? [expense.order.client, expense.order.venue].filter(Boolean).join(" · ") : "Umumiy xarajat"}</dd>
            </div>
            <div>
              <dt>Sana</dt>
              <dd>{dayLabel(expense.date)}</dd>
            </div>
            <div>
              <dt>Kim toʻladi</dt>
              <dd>{expense.paidBy?.name ?? "Koʻrsatilmagan"}</dd>
            </div>
            <div>
              <dt>Qoʻshildi</dt>
              <dd>{addedLabel}</dd>
            </div>
          </dl>
          <div className="ds-sticky-foot">
            <div className="ds-two">
              <Button variant="secondary" size="l" onClick={() => setConfirm(true)}>
                Oʻchirish
              </Button>
              <Button size="l" onClick={() => onEdit(expense)} data-autofocus>
                Tahrirlash
              </Button>
            </div>
          </div>
        </>
      )}
      {confirm && expense && (
        <ConfirmDialog
          title="Xarajatni oʻchirasizmi?"
          description="Foyda qayta hisoblanadi. Yozuv tarixda qoladi."
          confirm="Oʻchirish"
          tone="destructive"
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await api(`/api/panel/expenses/${expense.id}`, { method: "DELETE", body: {} });
            setConfirm(false);
            onDeleted(expense);
          }}
        />
      )}
    </Overlay>
  );
}
