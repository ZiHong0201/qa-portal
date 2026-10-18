"use client";

import { useState, useTransition } from "react";
import { cancelReceipt, previewReceipt, resendReceipt, sendNewReceipt } from "@/lib/actions/fees";
import { type FeePlan, MAX_MONTHS, parsePercent, percent, planFor, quote, taxOn } from "@/lib/fee-plans";
import { PAYMENT_METHODS, parseRinggit, periodLabel, rm } from "@/lib/fees";
import type { ExtraCharge, Result } from "@/lib/fees.server";
import type { ReceiptData } from "@/lib/receipt";
import { GradeSelect, Message, SubjectTicks, button, input } from "./form-parts";
import { ReceiptCard } from "./receipt-card";

/**
 * Making a receipt, in the order the admin works: who and what (name, email,
 * grade, subjects, how many months), the total as they tick, then the receipt
 * itself to check - and only then Send, which saves it and emails it.
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [months, setMonths] = useState(1);
  const [start, setStart] = useState(startMonth);
  const [method, setMethod] = useState("CASH");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  const [ticked, setTicked] = useState<string[]>([]);
  const [discount, setDiscount] = useState("");
  const [discountNote, setDiscountNote] = useState("");
  const [taxRate, setTaxRate] = useState((defaultTaxRateBp / 100).toFixed(2).replace(/\.00$/, ""));

  const [preview, setPreview] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const plan = planFor(plans, grade);
  const promoMonths = plan?.promo[chosen.length]?.months;
  const price = grade ? quote(plans, grade, chosen.length, months) : { error: "Choose the grade." };

  // The rest of the total, worked out as the server will: extra charges, then
  // the additional discount, then tax on what is left.
  const extraSen = extras.filter((e) => ticked.includes(e.id)).reduce((t, e) => t + e.amountSen, 0);
  const discountSen = discount.trim() ? parseRinggit(discount) : 0;
  const taxBp = taxRate.trim() ? parsePercent(taxRate) : 0;
  const beforeDiscount = "error" in price ? 0 : price.amountSen + extraSen;
  const problem =
    discountSen === null || discountSen < 0
      ? "Enter the discount as an amount, such as 20."
      : discountSen > beforeDiscount && !("error" in price)
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
    f.set("grade", grade);
    chosen.forEach((s) => f.append("subjects", s));
    f.set("months", String(months));
    f.set("startMonth", start);
    f.set("method", method);
    f.set("paidOn", paidOn);
    f.set("note", note);
    ticked.forEach((id) => f.append("extraIds", id));
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
            Make sure the name, email and amount are right. <strong>Send</strong> saves it under the next receipt
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Student name
          <input value={name} onChange={(e) => setName(e.target.value)} required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email address
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={input} />
          <span className="text-xs font-normal text-gray-500">The receipt is emailed here.</span>
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Grade</span>
        <div>
          <GradeSelect grades={grades} value={grade} onChange={setGrade} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Subjects joined</span>
        <SubjectTicks subjects={subjects} chosen={chosen} onChange={setChosen} />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Duration
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={input}>
            {Array.from({ length: MAX_MONTHS }, (_, i) => i + 1).map((n) => {
              const q = grade ? quote(plans, grade, chosen.length, n) : null;
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
          <input type="month" value={start} onChange={(e) => setStart(e.target.value)} required className={input} />
        </label>
        {promoMonths && months % promoMonths !== 0 && !("error" in price) && (
          <button
            type="button"
            onClick={() => setMonths(promoMonths)}
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
                  checked={ticked.includes(e.id)}
                  onChange={(ev) => setTicked(ev.target.checked ? [...ticked, e.id] : ticked.filter((x) => x !== e.id))}
                />
                {e.label} <span className="font-medium tabular-nums">+{rm(e.amountSen)}</span>
              </label>
            ))}
          </div>
        </div>
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
        {"error" in price ? (
          <p className="mt-1 text-sm text-red-700">{price.error}</p>
        ) : problem ? (
          <p className="mt-1 text-sm text-red-700">{problem}</p>
        ) : (
          <>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <span className="text-3xl font-bold tabular-nums text-teal-800">{rm(totalSen)}</span>
              {price.amountSen < price.normalSen && (
                <span className="text-sm text-gray-600">
                  tuition <span className="line-through">{rm(price.normalSen)}</span> · promotion saves{" "}
                  {rm(price.normalSen - price.amountSen)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-600">
              {grade} · {chosen.length} subject{chosen.length === 1 ? "" : "s"} · {periodLabel(start, months)} ·{" "}
              {price.priceNote ?? `${months} x ${rm(price.monthlySen)} a month`}
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
      <button disabled={busy || "error" in price || !!problem} className={`${button} self-start px-5 py-2`}>
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
