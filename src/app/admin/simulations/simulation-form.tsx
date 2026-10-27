"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { FormState } from "@/lib/actions/auth";
import { PHET_PRESETS, phetUrl, phetUrlMs } from "@/lib/simulations";

export function SimulationForm({
  action,
  initial,
  grades,
  subjects,
  chapters,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: {
    title: string;
    description: string | null;
    grades: string[];
    subject: string;
    chapter: string | null;
    topicCode: string | null;
    url: string;
    urlMs: string | null;
  };
  grades: string[];
  subjects: string[];
  /** Chapters already in use, offered as suggestions so spellings match. */
  chapters: string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Controlled, so picking a PhET sim can fill them in.
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [urlMs, setUrlMs] = useState(initial?.urlMs ?? "");

  if (grades.length === 0 || subjects.length === 0) {
    return (
      <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
        Add at least one grade and one subject in{" "}
        <Link href="/admin/master-data" className="underline">
          Master Data
        </Link>{" "}
        before adding a simulation.
      </p>
    );
  }

  function pickPreset(slug: string) {
    const preset = PHET_PRESETS.find((p) => p.slug === slug);
    if (!preset) return;
    setTitle(preset.title);
    setUrl(phetUrl(slug));
    setUrlMs(phetUrlMs(slug));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-3">
        <label className="mb-1 block text-sm font-medium text-sky-900" htmlFor="preset">
          Quick fill from PhET (optional)
        </label>
        <select
          id="preset"
          defaultValue=""
          onChange={(e) => pickPreset(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        >
          <option value="">Choose a PhET simulation…</option>
          {PHET_PRESETS.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-sky-800/80">
          Fills in the title and both links below. You can still change any of them.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Gas Properties"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <span className="mb-1 block text-sm font-medium">Grades</span>
          <div className="flex flex-col gap-1 rounded-md border border-gray-300 px-3 py-2">
            {grades.map((g) => (
              <label key={g} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="grades"
                  value={g}
                  defaultChecked={initial ? initial.grades.includes(g) : g === grades[0]}
                />
                {g}
              </label>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="subject">
            Subject
          </label>
          <select
            id="subject"
            name="subject"
            required
            defaultValue={initial?.subject ?? subjects[0]}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="-mt-2 text-xs text-gray-500">
        Only students in one of these grades (and this subject) will see this simulation.
      </p>
      <div className="flex gap-4">
        <div className="flex-[2]">
          <label className="mb-1 block text-sm font-medium" htmlFor="chapter">
            Chapter (optional)
          </label>
          <input
            id="chapter"
            name="chapter"
            list="chapter-options"
            defaultValue={initial?.chapter ?? ""}
            placeholder="e.g. Chapter 5: Matter"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <datalist id="chapter-options">
            {chapters.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="topicCode">
            Topic (optional)
          </label>
          <input
            id="topicCode"
            name="topicCode"
            defaultValue={initial?.topicCode ?? ""}
            placeholder="e.g. 5.1"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-gray-500">
        Students see the library grouped by chapter. Pick an existing one from the suggestions so
        the same chapter is not listed twice under different spellings.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="description">
          What to try (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          placeholder="e.g. Pump in more particles and watch the pressure. What happens when you heat the box?"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="url">
          Simulation URL (English)
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://phet.colorado.edu/sims/html/..."
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="urlMs">
          Simulation URL (BM, optional)
        </label>
        <input
          id="urlMs"
          name="urlMs"
          type="url"
          value={urlMs}
          onChange={(e) => setUrlMs(e.target.value)}
          placeholder="https://phet.colorado.edu/sims/html/...?locale=ms"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          With both links, students get a switch between English and BM. Both must be https://
          links that allow being embedded.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
        {url.startsWith("https://") && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Try it in a new tab
          </a>
        )}
      </div>
    </form>
  );
}
