"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/actions/auth";

const MAX_CHOICES = 6;

type InitialQuestion = {
  body: string;
  points: number;
  explanation: string | null;
  diagramUrl: string | null;
  choices: { text: string; isCorrect: boolean }[];
};

export function QuestionForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: InitialQuestion;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  const initialChoices = initial?.choices?.length
    ? initial.choices
    : [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ];
  const correctDefaultIndex = Math.max(
    initialChoices.findIndex((c) => c.isCorrect),
    0
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="body">
          Question
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={4}
          defaultValue={initial?.body}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <DiagramField initialUrl={initial?.diagramUrl ?? null} />

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="points">
          Marks
        </label>
        <input
          id="points"
          name="points"
          type="number"
          min={1}
          max={1000}
          required
          defaultValue={initial?.points ?? 10}
          className="w-32 rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="explanation">
          Explanation (optional)
        </label>
        <textarea
          id="explanation"
          name="explanation"
          rows={3}
          defaultValue={initial?.explanation ?? ""}
          placeholder="Shown to students if they answer incorrectly, along with the correct answer."
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Options (select the correct one)
        </label>
        <div className="flex flex-col gap-2">
          {Array.from({ length: MAX_CHOICES }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctChoice"
                value={String(i)}
                defaultChecked={i === correctDefaultIndex}
                required={i === 0}
              />
              <input
                type="text"
                name="choiceText"
                defaultValue={initialChoices[i]?.text ?? ""}
                placeholder={i < 2 ? `Option ${i + 1} (required)` : `Option ${i + 1} (optional)`}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function DiagramField({ initialUrl }: { initialUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function applyFile(file: File | undefined | null) {
    if (!file) return;
    if (inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
    }
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      );
      if (!item) return;
      e.preventDefault();
      applyFile(item.getAsFile());
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor="diagram">
        Diagram (optional)
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          applyFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:bg-gray-50"
        }`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Diagram preview"
            className="h-32 w-32 rounded-md border border-gray-200 object-cover"
          />
        ) : (
          <p className="text-sm text-gray-500">
            Drag and drop an image here, paste from clipboard, or click to browse
          </p>
        )}
        <p className="text-xs text-gray-500">
          {fileName ?? (previewUrl ? "Drop, paste, or click to replace" : "PNG, JPEG, or WebP · up to 5MB")}
        </p>
        <input
          ref={inputRef}
          id="diagram"
          name="diagram"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => applyFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
