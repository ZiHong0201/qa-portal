"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/actions/auth";
import { WindowFields } from "./window-fields";

type Initial = {
  title: string;
  linkUrl: string;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export function PopupForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: Initial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <ImageField initialUrl={initial?.imageUrl ?? null} />

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="title">
          Caption (optional)
        </label>
        <input
          id="title"
          name="title"
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. Mid-term break: portal closed 20-24 Oct"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Shown under the image, and read aloud by screen readers in place of it.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="linkUrl">
          Link (optional)
        </label>
        <input
          id="linkUrl"
          name="linkUrl"
          type="url"
          defaultValue={initial?.linkUrl ?? ""}
          placeholder="https://example.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          If set, tapping the image opens this in a new tab.
        </p>
      </div>

      <WindowFields initial={initial} />

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

// Same drag/paste/click picker as the catalogue, minus the "optional" wording -
// a pop-up with no picture has nothing to show.
function ImageField({ initialUrl }: { initialUrl: string | null }) {
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
      <label className="mb-1 block text-sm font-medium" htmlFor="image">
        Image
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
            alt="Pop-up preview"
            className="max-h-56 rounded-md border border-gray-200 object-contain"
          />
        ) : (
          <p className="text-sm text-gray-500">
            Drag and drop an image here, paste from clipboard, or click to browse
          </p>
        )}
        <p className="text-xs text-gray-500">
          {fileName ??
            (previewUrl
              ? "Drop, paste, or click to replace"
              : "PNG, JPEG, or WebP · up to 5MB · portrait or square works best")}
        </p>
        <input
          ref={inputRef}
          id="image"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => applyFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
