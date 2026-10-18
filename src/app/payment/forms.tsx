"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addPayment,
  adjustStudentBill,
  cancelPayment,
  createMonthBills,
  createStudentBill,
  removeBill,
  setStudentFeeRate,
  setSubjectFee,
} from "@/lib/actions/fees";
import { PAYMENT_METHODS, senToInput } from "@/lib/fees";
import type { Result } from "@/lib/fees.server";

const input = "rounded-md border border-gray-300 px-2.5 py-1.5 text-sm";
const button =
  "rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40";

function Message({ state }: { state: Result }) {
  if (state.error) return <p className="text-xs text-red-700">{state.error}</p>;
  if (state.success) return <p className="text-xs text-teal-700">{state.success}</p>;
  return null;
}

// ---- fee settings -----------------------------------------------------------

export function SubjectFeeForm({ subject, feeSen }: { subject: string; feeSen: number | null }) {
  const [state, action, pending] = useActionState(setSubjectFee.bind(null, subject), {});
  // Held in state: React resets an uncontrolled field once the action returns.
  const [fee, setFee] = useState(feeSen === null ? "" : senToInput(feeSen));
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500">RM</span>
      <input
        name="fee"
        value={fee}
        onChange={(e) => setFee(e.target.value)}
        inputMode="decimal"
        placeholder="not set"
        aria-label={`Monthly fee for ${subject}`}
        className={`${input} w-28`}
      />
      <span className="text-sm text-gray-500">/ month</span>
      <button disabled={pending} className={button}>
        Save
      </button>
      <Message state={state} />
    </form>
  );
}

export function StudentRateForm({
  studentId,
  subject,
  ownSen,
  note,
}: {
  studentId: string;
  subject: string;
  ownSen: number | null;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(setStudentFeeRate.bind(null, studentId, subject), {});
  const [fee, setFee] = useState(ownSen === null ? "" : senToInput(ownSen));
  const [why, setWhy] = useState(note ?? "");
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="fee"
        value={fee}
        onChange={(e) => setFee(e.target.value)}
        inputMode="decimal"
        placeholder="usual fee"
        aria-label={`${subject} fee for this student`}
        className={`${input} w-24`}
      />
      <input
        name="note"
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        placeholder="Why (e.g. sibling discount)"
        aria-label="Reason for this student's fee"
        className={`${input} min-w-0 flex-1`}
      />
      <button disabled={pending} className={button}>
        Save
      </button>
      <Message state={state} />
    </form>
  );
}

// ---- bills ------------------------------------------------------------------

export function CreateMonthBillsButton({
  month,
  label,
  missing,
}: {
  month: string;
  label: string;
  missing: number;
}) {
  const [busy, start] = useTransition();
  const [state, setState] = useState<Result>({});
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        disabled={busy || missing === 0}
        onClick={() => {
          if (!confirm(`Create ${label} bills for the ${missing} student(s) who do not have one yet?`)) return;
          start(async () => setState(await createMonthBills(month)));
        }}
        className={button}
      >
        {busy ? "Creating..." : `Create ${label} bills`}
      </button>
      <span className="text-sm text-gray-600">
        {missing === 0 ? "Every student has a bill for this month." : `${missing} student(s) have no bill yet.`}
      </span>
      <Message state={state} />
    </div>
  );
}

export function CreateStudentBillForm({ studentId, defaultMonth }: { studentId: string; defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  const [busy, start] = useTransition();
  const [state, setState] = useState<Result>({});
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        aria-label="Month to bill"
        className={input}
      />
      <button
        disabled={busy || !month}
        onClick={() => start(async () => setState(await createStudentBill(studentId, month)))}
        className={button}
      >
        Create bill
      </button>
      <Message state={state} />
    </div>
  );
}

export function AdjustBillForm({
  billId,
  adjustmentSen,
  note,
}: {
  billId: string;
  adjustmentSen: number;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(adjustStudentBill.bind(null, billId), {});
  const [amount, setAmount] = useState(adjustmentSen ? senToInput(adjustmentSen) : "");
  const [why, setWhy] = useState(note ?? "");
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500">RM</span>
      <input
        name="adjustment"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        placeholder="-20 or 15"
        aria-label="Adjustment"
        className={`${input} w-24`}
      />
      <input
        name="note"
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        placeholder="Reason"
        aria-label="Reason for the adjustment"
        className={`${input} min-w-0 flex-1`}
      />
      <button disabled={pending} className={button}>
        Save
      </button>
      <Message state={state} />
    </form>
  );
}

export function DeleteBillButton({ billId, label }: { billId: string; label: string }) {
  const [busy, start] = useTransition();
  const [state, setState] = useState<Result>({});
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        disabled={busy}
        onClick={() => {
          if (!confirm(`Delete the ${label} bill?`)) return;
          start(async () => setState(await removeBill(billId)));
        }}
        className="text-sm text-red-600 hover:underline disabled:opacity-40"
      >
        Delete bill
      </button>
      <Message state={state} />
    </span>
  );
}

// ---- payments ---------------------------------------------------------------

export function PaymentForm({ billId, balanceSen, today }: { billId: string; balanceSen: number; today: string }) {
  const [state, action, pending] = useActionState(addPayment.bind(null, billId), {});
  const [amount, setAmount] = useState(senToInput(balanceSen));
  const [method, setMethod] = useState("CASH");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">RM</span>
        <input
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          aria-label="Amount received"
          className={`${input} w-28`}
        />
        <select
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          aria-label="Paid by"
          className={input}
        >
          {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="paidOn"
          value={paidOn}
          max={today}
          onChange={(e) => setPaidOn(e.target.value)}
          aria-label="Date paid"
          className={input}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional, e.g. bank reference)"
          aria-label="Note"
          className={`${input} min-w-0 flex-1`}
        />
        <button disabled={pending} className={button}>
          {pending ? "Saving..." : "Record payment"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

export function VoidPaymentButton({ paymentId, receiptNo }: { paymentId: string; receiptNo: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, start] = useTransition();
  const [state, setState] = useState<Result>({});
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-red-600 hover:underline">
        Void
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
          if (!confirm(`Void receipt ${receiptNo}? The amount will be owed again.`)) return;
          start(async () => {
            const r = await cancelPayment(paymentId, reason);
            setState(r);
            if (!r.error) setOpen(false);
          });
        }}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-40"
      >
        Void payment
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:underline">
        Cancel
      </button>
      <Message state={state} />
    </span>
  );
}
