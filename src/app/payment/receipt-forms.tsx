"use client";

import { useState, useTransition } from "react";
import { cancelReceipt, previewReceipt, resendReceipt, sendNewReceipt } from "@/lib/actions/fees";
import { type FeePlan, MAX_MONTHS, parsePercent, percent, planFor, quote, taxOn } from "@/lib/fee-plans";
import { PAYMENT_METHODS, parseRinggit, periodLabel, rm } from "@/lib/fees";
import type { ExtraCharge, Result } from "@/lib/fees.server";
import type { ReceiptData } from "@/lib/receipt";
import { GradeSelect, Message, SubjectTicks, button, input } from "./form-parts";
import { ReceiptCard } from "./receipt-card";

/** One child on the form. `key` only keeps React's list steady as children come and go. */
type ChildDraft = {
  key: number;
  name: string;
  grade: string;
  subjects: string[];
  months: number;
  startMonth: string;
  extraIds: string[];
};

const MAX_CHILDREN = 10;

/**
 * One child's part of the receipt: who they are, what they take, for how long,
 * any extra charges for them, and what that comes to - each child priced on
 * their own.
 */
function ChildCard({
  index,
  count,
  child,
  onChange,
  onRemove,
  plans,
  grades,
  subjects,
  extras,
}: {
  index: number;
  count: number;
  child: ChildDraft;
  onChange: (c: ChildDraft) => void;
  onRemove: () => void;
  plans: FeePlan[];
  grades: string[];
  subjects: string[];
  extras: ExtraCharge[];
}) {
  const set = (patch: Partial<ChildDraft>) => onChange({ ...child, ...patch });
  const plan = planFor(plans, child.grade);
  const promoMonths = plan?.promo[child.subjects.length]?.months;
  const price = child.grade ? quote(plans, child.grade, child.subjects.length, child.months) : null;
  const extraSen = extras.filter((e) => child.extraIds.includes(e.id)).reduce((t, e) => t + e.amountSen, 0);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-stone-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-900">{count > 1 ? `Child ${index + 1}` : "Child"}</p>
        {count > 1 && (
          <button type="button" onClick={onRemove} className="text-sm text-red-600 hover:underline">
            Remove
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-medium">
          Child&apos;s name
          <input value={child.name} onChange={(e) => set({ name: e.target.value })} required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Grade
          <GradeSelect grades={grades} value={child.grade} onChange={(grade) => set({ grade })} />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Subjects joined</span>
        <SubjectTicks subjects={subjects} chosen={child.subjects} onChange={(s) => set({ subjects: s })} />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Duration
          <select value={child.months} onChange={(e) => set({ months: Number(e.target.value) })} className={input}>
            {Array.from({ length: MAX_MONTHS }, (_, i) => i + 1).map((n) => {
              const q = child.grade ? quote(plans, child.grade, child.subjects.length, n) : null;
              const priced = q && !("error" in q) ? q : null;
              return (
                <option key={n} value={n}>
                  {n} month{n === 1 ? "" : "s"}
                  {priced && ` - ${rm(priced.amountSen)}${priced.priceNote ? " (with promotion)" : ""}`}
                </option>
              );
            })}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Starting from
          <input
            type="month"
            value={child.startMonth}
            onChange={(e) => set({ startMonth: e.target.value })}
            required
            className={input}
          />
        </label>
        {promoMonths && child.months % promoMonths !== 0 && price && !("error" in price) && (
          <button
            type="button"
            onClick={() => set({ months: promoMonths })}
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
          >
            Use the {promoMonths}-month promotion
          </button>
        )}
      </div>

      {extras.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Extra charges</span>
          <div className="flex flex-wrap gap-2">
            {extras.map((e) => (
              <label
                key={e.id}
                className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm has-checked:border-teal-500 has-checked:bg-teal-50"
              >
                <input
                  type="checkbox"
                  checked={child.extraIds.includes(e.id)}
                  onChange={(ev) =>
                    set({
                      extraIds: ev.target.checked
                        ? [...child.extraIds, e.id]
                        : child.extraIds.filter((x) => x !== e.id),
                    })
                  }
                />
                {e.label} <span className="font-medium tabular-nums">+{rm(e.amountSen)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm">
        {!price ? (
          <span className="text-gray-500">Choose the grade to see the fee.</span>
        ) : "error" in price ? (
          <span className="text-red-700">{price.error}</span>
        ) : (
          <>
            <span className="font-semibold tabular-nums text-teal-800">{rm(price.amountSen + extraSen)}</span>
            <span className="text-gray-600">
              {" "}
              · {periodLabel(child.startMonth, child.months)} ·{" "}
              {price.priceNote ?? `${child.months} x ${rm(price.monthlySen)} a month`}
              {price.amountSen < price.normalSen && ` (saves ${rm(price.normalSen - price.amountSen)})`}
              {extraSen > 0 && ` · + ${rm(extraSen)} extra charges`}
            </span>
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Making a receipt, in the order the admin works: who pays (the parent) and
 * where the receipt goes, then each child - grade, subjects, how many months -
 * then any extra charges, discount and tax, the total as they go, the receipt
 * itself to check, and only then Send, which saves it and emails it.
 */
export function ReceiptBuilder({
  plans,
  grades,
  subjects,
  startMonth,
  today,
  extras,
  defaultTaxRateBp,
}: {
  /** The saved price list, so the total shown is the one the server charges. */
  plans: FeePlan[];
  grades: string[];
  subjects: string[];
  startMonth: string;
  today: string;
  /** The one-off charges a tick adds - the material fee and so on. */
  extras: ExtraCharge[];
  /** The tax rate a receipt starts with, from the Prices page. */
  defaultTaxRateBp: number;
}) {
  const newChild = (key: number, from?: ChildDraft): ChildDraft => ({
    key,
    name: "",
    grade: "",
    subjects: [],
    months: from?.months ?? 1,
    startMonth: from?.startMonth ?? startMonth,
    extraIds: [],
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [children, setChildren] = useState<ChildDraft[]>([newChild(0)]);
  const [method, setMethod] = useState("CASH");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountNote, setDiscountNote] = useState("");
  const [taxRate, setTaxRate] = useState((defaultTaxRateBp / 100).toFixed(2).replace(/\.00$/, ""));

  const [preview, setPreview] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  // The total, worked out as the server will: each child's fee, the extra
  // charges, less the additional discount, then tax on what is left.
  const prices = children.map((c) => (c.grade ? quote(plans, c.grade, c.subjects.length, c.months) : null));
  const childProblem = prices.some((p) => !p || "error" in p);
  const tuitionSen = prices.reduce((t, p) => t + (p && !("error" in p) ? p.amountSen : 0), 0);
  const extraSen = children.reduce(
    (t, c) => t + extras.filter((e) => c.extraIds.includes(e.id)).reduce((u, e) => u + e.amountSen, 0),
    0
  );
  const discountSen = discount.trim() ? parseRinggit(discount) : 0;
  const taxBp = taxRate.trim() ? parsePercent(taxRate) : 0;
  const beforeDiscount = tuitionSen + extraSen;
  const problem = childProblem
    ? "Fill in each child's grade and subjects to see the total."
    : discountSen === null || discountSen < 0
      ? "Enter the discount as an amount, such as 20."
      : discountSen > beforeDiscount
        ? "The discount is more than the amount being charged."
        : taxBp === null || taxBp > 10000
          ? "Enter a tax rate from 0 to 100, such as 6."
          : null;
  const lessDiscount = beforeDiscount - (discountSen ?? 0);
  const taxSen = taxOn(lessDiscount, taxBp ?? 0);
  const totalSen = lessDiscount + taxSen;

  const fields = () => {
    const f = new FormData();
    f.set("name", name);
    f.set("email", email);
    f.set(
      "students",
      JSON.stringify(
        children.map((c) => ({
          name: c.name,
          grade: c.grade,
          subjects: c.subjects,
          startMonth: c.startMonth,
          months: c.months,
          extraIds: c.extraIds,
        }))
      )
    );
    f.set("method", method);
    f.set("paidOn", paidOn);
    f.set("note", note);
    f.set("discount", discount);
    f.set("discountNote", discountNote);
    f.set("taxRate", taxRate);
    return f;
  };

  if (preview) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Check the receipt before sending.</p>
          <p>
            Make sure the names, email and amount are right. <strong>Send</strong> saves it under the next receipt
            number and emails it to <strong>{preview.email}</strong>, with a copy to the centre.
          </p>
        </div>
        <ReceiptCard receipt={preview} />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                // Only an error comes back - success moves on to the saved receipt.
                const r = await sendNewReceipt(fields());
                if (r?.error) setError(r.error);
              })
            }
            className={`${button} px-5 py-2`}
          >
            {busy ? "Sending..." : `Send - ${rm(preview.amountSen)}`}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setPreview(null);
              setError(null);
            }}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            Back to edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          const r = await previewReceipt(fields());
          if ("error" in r) setError(r.error);
          else setPreview(r.data);
        });
      }}
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-900">Bill to (parent)</span>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Parent&apos;s name
            <input value={name} onChange={(e) => setName(e.target.value)} required className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email address
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={input} />
            <span className="text-xs font-normal text-gray-500">The receipt is emailed here.</span>
          </label>
        </div>
      </div>

      {children.map((c, i) => (
        <ChildCard
          key={c.key}
          index={i}
          count={children.length}
          child={c}
          onChange={(next) => setChildren(children.map((x) => (x.key === c.key ? next : x)))}
          onRemove={() => setChildren(children.filter((x) => x.key !== c.key))}
          plans={plans}
          grades={grades}
          subjects={subjects}
          extras={extras}
        />
      ))}
      {children.length < MAX_CHILDREN && (
        <button
          type="button"
          onClick={() => {
            const last = children[children.length - 1];
            setChildren([...children, newChild(Math.max(...children.map((c) => c.key)) + 1, last)]);
          }}
          className="self-start rounded-md border border-dashed border-teal-500 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50"
        >
          + Add another child
        </button>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Additional discount
          <span className="flex items-center gap-1">
            <span className="text-sm font-normal text-gray-500">RM</span>
            <input
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className={`${input} w-24`}
            />
          </span>
        </label>
        {discount.trim() && (
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-medium">
            Reason (shown on the receipt)
            <input
              value={discountNote}
              onChange={(e) => setDiscountNote(e.target.value)}
              maxLength={100}
              placeholder="e.g. sibling discount"
              className={input}
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Tax rate
          <span className="flex items-center gap-1">
            <input
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              inputMode="decimal"
              className={`${input} w-20`}
            />
            <span className="text-sm font-normal text-gray-500">%</span>
          </span>
        </label>
      </div>

      <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4">
        <p className="text-xs font-medium tracking-wide text-teal-900 uppercase">Total</p>
        {problem ? (
          <p className="mt-1 text-sm text-red-700">{problem}</p>
        ) : (
          <>
            <p className="mt-1 text-3xl font-bold tabular-nums text-teal-800">{rm(totalSen)}</p>
            <p className="mt-1 text-xs text-gray-600">
              {children.length} child{children.length === 1 ? "" : "ren"}: {rm(tuitionSen)} tuition
              {extraSen > 0 && ` · + ${rm(extraSen)} extra charges`}
              {(discountSen ?? 0) > 0 && ` · - ${rm(discountSen!)} discount`}
              {taxSen > 0 && ` · + ${rm(taxSen)} tax at ${percent(taxBp!)}`}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Paid by
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={input}>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Date paid
          <input
            type="date"
            value={paidOn}
            max={today}
            onChange={(e) => setPaidOn(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-medium">
          Note (optional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. bank reference"
            className={input}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={busy || !!problem} className={`${button} self-start px-5 py-2`}>
        {busy ? "Preparing..." : "Preview receipt"}
      </button>
    </form>
  );
}

export function ResendReceiptButton({ id, label }: { id: string; label: string }) {
  const [busy, start] = useTransition();
  const [state, setState] = useState<Result>({});
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        disabled={busy}
        onClick={() => start(async () => setState(await resendReceipt(id)))}
        className="rounded-md border border-teal-600 bg-white px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50 disabled:opacity-40"
      >
        {busy ? "Sending..." : label}
      </button>
      <Message state={state} />
    </span>
  );
}

export function VoidReceiptButton({ id, receiptNo }: { id: string; receiptNo: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, start] = useTransition();
  const [state, setState] = useState<Result>({});
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-red-600 hover:underline">
        Void receipt
      </button>
    );
  }
  return (
    <span className="flex w-full flex-wrap items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
        placeholder="Why is it being voided?"
        aria-label={`Reason for voiding ${receiptNo}`}
        className={`${input} min-w-0 flex-1`}
      />
      <button
        disabled={busy || !reason.trim()}
        onClick={() => {
          if (!confirm(`Void receipt ${receiptNo}? It stays on record, marked void.`)) return;
          start(async () => {
            const r = await cancelReceipt(id, reason);
            setState(r);
            if (!r.error) setOpen(false);
          });
        }}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-40"
      >
        Void
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:underline">
        Cancel
      </button>
      <Message state={state} />
    </span>
  );
}
