"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";

// Solid white rather than translucent: globals.css pins input backgrounds
// with an unlayered rule, which outranks a Tailwind utility, so a bg-white/80
// here would silently render opaque anyway.
const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {state.error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {state.error}
        </p>
      )}
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          className={FIELD_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          className={FIELD_CLASS}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 font-semibold text-white shadow-md transition-all hover:from-sky-500 hover:to-indigo-500 hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
