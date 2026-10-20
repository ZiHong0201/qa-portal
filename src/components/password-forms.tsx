"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { changeMyPassword, forgotPassword, resetForgottenPassword } from "@/lib/actions/password";

// As on the login form: solid white, since globals.css pins input backgrounds.
const FIELD =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
const BUTTON =
  "mt-1 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-md transition-all hover:from-sky-500 hover:to-indigo-500 hover:shadow-lg active:scale-[0.98] disabled:opacity-60";

function Notice({ state }: { state: { error?: string; success?: string } }) {
  if (state.error) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
        {state.success}
      </p>
    );
  }
  return null;
}

function Field({
  label,
  name,
  value,
  onChange,
  autoComplete,
  type = "password",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className={FIELD}
      />
    </div>
  );
}

export function ChangePasswordForm() {
  // Held in state: React resets an uncontrolled form once its action returns,
  // which would wipe what was typed when the answer is an error.
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, action, pending] = useActionState(async (prev: { error?: string; success?: string }, f: FormData) => {
    const r = await changeMyPassword(prev, f);
    if (r.success) {
      setCurrent("");
      setPassword("");
      setConfirm("");
    }
    return r;
  }, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Notice state={state} />
      <Field label="Current password" name="current" value={current} onChange={setCurrent} autoComplete="current-password" />
      <Field label="New password" name="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field label="New password again" name="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <p className="-mt-2 text-xs text-slate-500">At least 8 characters.</p>
      <button disabled={pending} className={BUTTON}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPassword, {});
  const [email, setEmail] = useState("");
  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <Notice state={state} />
        <Link href="/login" className="text-center text-sm font-medium text-sky-700 hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <Notice state={state} />
      <p className="text-sm text-slate-600">
        Enter the email you log in with, and we will email you a link to choose a new password.
      </p>
      <Field label="Email" name="email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <button disabled={pending} className={BUTTON}>
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
      <Link href="/login" className="text-center text-sm font-medium text-sky-700 hover:underline">
        Back to log in
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetForgottenPassword.bind(null, token), {});
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <Notice state={state} />
        <Link href="/login" className={`${BUTTON} text-center`}>
          Log in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <Notice state={state} />
      <Field label="New password" name="password" value={password} onChange={setPassword} autoComplete="new-password" />
      <Field label="New password again" name="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <p className="-mt-2 text-xs text-slate-500">At least 8 characters.</p>
      <button disabled={pending} className={BUTTON}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
