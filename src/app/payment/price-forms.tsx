"use client";

import { useActionState, useState, useTransition } from "react";
import { removePriceRow, saveExtra, savePriceRow } from "@/lib/actions/fees";
import { MAX_MONTHS, promoSaves } from "@/lib/fee-plans";
import { parseRinggit, rm, senToInput } from "@/lib/fees";
import type { Result } from "@/lib/fees.server";
import { Message, button, input } from "./form-parts";

const MONTH_CHOICES = Array.from({ length: MAX_MONTHS - 1 }, (_, i) => i + 2);

/** What the typed promotion works out to against paying monthly - as they type. */
function PromoHint({ monthly, months, price }: { monthly: string; months: string; price: string }) {
  const m = parseRinggit(monthly);
  const p = parseRinggit(price);
  const n = Number(months);
  if (!m || !p || !n) return null;
  const normal = m * n;
  return promoSaves({ months: n, priceSen: p }, m) ? (
    <span className="text-xs text-teal-700">
      saves {rm(normal - p)} on {rm(normal)}
    </span>
  ) : (
    <span className="text-xs text-amber-700">
      not cheaper than {n} months at {rm(m)} ({rm(normal)}), so it will not be applied
    </span>
  );
}

function Fields({
  monthly,
  setMonthly,
  months,
  setMonths,
  price,
  setPrice,
}: {
  monthly: string;
  setMonthly: (v: string) => void;
  months: string;
  setMonths: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
}) {
  return (
    <>
      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-500">RM</span>
        <input
          name="monthly"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          inputMode="decimal"
          aria-label="Monthly price"
          className={`${input} w-24`}
        />
        <span className="text-gray-500">/ month</span>
      </label>
      <span className="text-sm text-gray-400">·</span>
      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-500">Promotion</span>
        <select
          name="promoMonths"
          value={months}
          onChange={(e) => {
            setMonths(e.target.value);
            if (!e.target.value) setPrice("");
          }}
          aria-label="Promotion months"
          className={input}
        >
          <option value="">none</option>
          {MONTH_CHOICES.map((n) => (
            <option key={n} value={n}>
              {n} months
            </option>
          ))}
        </select>
      </label>
      {months && (
        <label className="flex items-center gap-1 text-sm">
          <span className="text-gray-500">for RM</span>
          <input
            name="promoPrice"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            aria-label="Promotion price"
            className={`${input} w-24`}
          />
        </label>
      )}
    </>
  );
}

export function PriceRowForm({
  band,
  subjects,
  monthlySen,
  promoMonths,
  promoSen,
}: {
  band: string;
  subjects: number;
  monthlySen: number;
  promoMonths: number | null;
  promoSen: number | null;
}) {
  const [state, action, pending] = useActionState(savePriceRow.bind(null, band), {});
  // Held in state: React resets an uncontrolled form once its action returns.
  const [monthly, setMonthly] = useState(senToInput(monthlySen));
  const [months, setMonths] = useState(promoMonths ? String(promoMonths) : "");
  const [price, setPrice] = useState(promoSen ? senToInput(promoSen) : "");
  const [busy, start] = useTransition();
  const [removeState, setRemoveState] = useState<Result>({});
  const changed =
    monthly !== senToInput(monthlySen) ||
    months !== (promoMonths ? String(promoMonths) : "") ||
    price !== (promoSen ? senToInput(promoSen) : "");

  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="subjects" value={subjects} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-sm font-medium text-stone-900">
          {subjects} subject{subjects === 1 ? "" : "s"}
        </span>
        <Fields {...{ monthly, setMonthly, months, setMonths, price, setPrice }} />
        <button disabled={pending || !changed} className={button}>
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!confirm(`Remove the price for ${subjects} subject${subjects === 1 ? "" : "s"}?`)) return;
            start(async () => setRemoveState(await removePriceRow(band, subjects)));
          }}
          className="text-sm text-red-600 hover:underline disabled:opacity-40"
        >
          Remove
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 pl-26">
        {months && <PromoHint monthly={monthly} months={months} price={price} />}
        <Message state={state} />
        {removeState.error && <Message state={removeState} />}
      </div>
    </form>
  );
}

export function AddPriceRowForm({ band, nextSubjects }: { band: string; nextSubjects: number }) {
  const [state, action, pending] = useActionState(savePriceRow.bind(null, band), {});
  const [subjects, setSubjects] = useState(String(nextSubjects));
  const [monthly, setMonthly] = useState("");
  const [months, setMonths] = useState("");
  const [price, setPrice] = useState("");
  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex w-24 items-center gap-1 text-sm">
          <input
            name="subjects"
            type="number"
            min={1}
            max={20}
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            aria-label="Number of subjects"
            className={`${input} w-14`}
          />
          <span className="text-gray-500">subj.</span>
        </label>
        <Fields {...{ monthly, setMonthly, months, setMonths, price, setPrice }} />
        <button disabled={pending || !monthly.trim()} className={button}>
          Add
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 pl-26">
        {months && <PromoHint monthly={monthly} months={months} price={price} />}
        <Message state={state} />
      </div>
    </form>
  );
}

/** The material cost and delivery fee: its name on the receipt, and amount. */
export function ExtraChargeForm({ label, amountSen }: { label: string; amountSen: number }) {
  const [state, action, pending] = useActionState(saveExtra, {});
  const [name, setName] = useState(label);
  const [amount, setAmount] = useState(senToInput(amountSen));
  const changed = name !== label || amount !== senToInput(amountSen);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="label"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        aria-label="Name of the charge"
        className={`${input} w-72 max-w-full`}
      />
      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-500">RM</span>
        <input
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          aria-label="Amount"
          className={`${input} w-24`}
        />
      </label>
      <button disabled={pending || !changed} className={button}>
        Save
      </button>
      <Message state={state} />
    </form>
  );
}
