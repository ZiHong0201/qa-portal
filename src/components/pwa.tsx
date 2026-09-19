"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// Chrome fires this so a site can offer its own install button instead of
// relying on the browser's menu. It isn't in the DOM lib's type list.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-hint-dismissed";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, which predates the standard media query.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

// Device facts, read through useSyncExternalStore rather than set from an
// effect: they depend only on the browser and never change after mount, so the
// server renders false and the client corrects it with no hydration mismatch.
const subscribeNever = () => () => {};

function iosNeedsHintSnapshot() {
  return isIos() && !isStandalone();
}

function installedSnapshot() {
  return isStandalone();
}

// Desktop browsers can install a PWA too, but "add this to your phone" is not
// what someone at a computer wants, so the offer is limited to touch devices.
function handheldSnapshot() {
  return (
    /android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (window.matchMedia("(pointer: coarse)").matches &&
      window.matchMedia("(max-width: 1024px)").matches)
  );
}

/**
 * Registers the service worker. No UI - mounted once from the root layout so
 * every page is covered, including the signed-out pages where a student is
 * most likely to install.
 *
 * Chrome will not offer to install a site that has no service worker with a
 * fetch handler, so this is what makes the install button appear at all.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async () => {
        // An earlier version registered at /admin/ only. Leaving that behind
        // would keep a second, narrower worker shadowing this one on admin
        // pages, so retire it.
        const all = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          all
            .filter((r) => r.scope.endsWith("/admin/"))
            .map((r) => r.unregister()),
        );
      })
      .catch(() => {
        // An unregistered worker only costs the offline page, so a failure
        // here should never take the portal down with it.
      });
  }, []);

  return null;
}

/** Everything a caller needs to offer installation on the current device. */
function useInstallState() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );

  const iosNeedsHint = useSyncExternalStore(
    subscribeNever,
    iosNeedsHintSnapshot,
    () => false,
  );
  const installed = useSyncExternalStore(
    subscribeNever,
    installedSnapshot,
    () => false,
  );
  const handheld = useSyncExternalStore(
    subscribeNever,
    handheldSnapshot,
    () => false,
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // Once installed the button has nothing left to do.
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }, [promptEvent]);

  return { promptEvent, iosNeedsHint, installed, handheld, install };
}

function ShareIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 ${className ?? ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v12M12 3l-4 4M12 3l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The iPhone walkthrough. Safari offers no install API at all - a site cannot
 * add itself to the home screen - so the only thing left is to show exactly
 * which buttons to press.
 */
function IosInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40"
      />
      <div className="animate-pop-in relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            className="h-12 w-12 rounded-xl"
          />
          <div>
            <p className="font-bold text-slate-900">Add to your iPhone</p>
            <p className="text-xs text-slate-500">Three taps in Safari</p>
          </div>
        </div>

        <ol className="mt-5 flex flex-col gap-4 text-sm text-slate-700">
          <li className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
              1
            </span>
            <span className="flex items-center gap-1.5">
              Tap <ShareIcon className="text-sky-600" /> at the bottom of Safari
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
              2
            </span>
            <span>
              Scroll down and choose{" "}
              <span className="font-semibold">Add to Home Screen</span>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
              3
            </span>
            <span>
              Tap <span className="font-semibold">Add</span> — done
            </span>
          </li>
        </ol>

        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This only works in Safari. If you&apos;re in Chrome, open the site in
          Safari first.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/**
 * A direct "add this to my phone" button for the signed-out pages.
 *
 * On Android and desktop Chrome this installs in one tap. On iPhone there is
 * no such API, so it opens the walkthrough instead.
 */
export function InstallButton({ className }: { className?: string }) {
  const { promptEvent, iosNeedsHint, installed, handheld, install } =
    useInstallState();
  const [showIos, setShowIos] = useState(false);

  if (installed || !handheld) return null;
  // Nothing useful to offer: not iOS, and the browser hasn't said it's
  // installable (already installed, unsupported browser, or criteria unmet).
  if (!promptEvent && !iosNeedsHint) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (promptEvent ? install() : setShowIos(true))}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-5 py-2.5 font-semibold text-sky-700 shadow-sm backdrop-blur transition-all hover:bg-white active:scale-[0.98]"
        }
      >
        <ShareIcon size={16} />
        Add to my phone
      </button>
      {showIos && <IosInstructions onClose={() => setShowIos(false)} />}
    </>
  );
}

/**
 * The dismissable banner shown inside the app, for anyone who didn't install
 * from the front page.
 */
export function InstallBanner() {
  const { promptEvent, iosNeedsHint, installed, handheld, install } =
    useInstallState();
  const [dismissed, setDismissed] = useState(false);
  const [showIos, setShowIos] = useState(false);

  const alreadyDismissed = useCallback(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // Private mode or blocked storage: just show it.
      return false;
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Nothing to do - the hint simply returns next visit.
    }
  }

  if (installed || !handheld || dismissed || alreadyDismissed()) return null;
  if (!promptEvent && !iosNeedsHint) return null;

  return (
    <>
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-sky-900">
            Add the portal to your phone
          </p>
          <p className="mt-0.5 text-sky-800/80">
            {promptEvent
              ? "One tap, and it gets its own icon like any other app."
              : "Takes three taps in Safari — we'll show you."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => (promptEvent ? install() : setShowIos(true))}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            {promptEvent ? "Install" : "Show me"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-lg px-2 py-1.5 text-sm text-sky-700 hover:bg-sky-100"
          >
            ✕
          </button>
        </div>
      </div>
      {showIos && <IosInstructions onClose={() => setShowIos(false)} />}
    </>
  );
}
