"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const ready = code.length === 6;

  return (
    <form
      className="mt-5 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) router.push(`/play/${code}`);
      }}
    >
      <input
        value={code}
        // Digits only, and spaces dropped, because the screen shows the code
        // as "123 456" and some people will type it exactly like that.
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        placeholder="123 456"
        aria-label="Quiz code"
        className="w-full rounded-2xl border-2 border-sky-200 px-4 py-3 text-center font-mono text-3xl tracking-[0.3em] text-sky-950 outline-none focus:border-sky-500"
      />
      <button
        type="submit"
        disabled={!ready}
        className="rounded-2xl bg-sky-600 py-3 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:opacity-40"
      >
        Enter
      </button>
    </form>
  );
}
