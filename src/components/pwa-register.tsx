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

// Whether this device needs the manual iOS instructions. Read through
// useSyncExternalStore rather than set from an effect: it depends only on the
// browser, never changes after mount, and this way the server renders false
// and the client corrects it without a hydration mismatch.
const subscribeNever = () => () => {};

function iosHintSnapshot() {
  return isIos() && !isStandalone();
}

/**
 * Registers the service worker and offers the install prompt.
 *
 * Mounted from the dashboard and admin layouts - the two places with a
 * content container to sit in - rather than the root layout, which would put
 * a banner over the login page's artwork.
 */
export function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);

  const needsIosHint = useSyncExternalStore(
    subscribeNever,
    iosHintSnapshot,
    () => false,
  );

  const alreadyDismissed = useCallback(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // Private mode or blocked storage: just show the hint.
      return false;
    }
  }, []);

  const showIosHint = needsIosHint && !dismissed && !alreadyDismissed();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(async () => {
          // The first version of this registered at /admin/ only. Leaving that
          // behind would keep a second, narrower worker shadowing the new one
          // on admin pages, so retire it.
          const stale = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            stale
              .filter((r) => r.scope.endsWith("/admin/"))
              .map((r) => r.unregister()),
          );
        })
        .catch(() => {
          // An unregistered worker only costs the offline page, so a failure
          // here should never take the portal down with it.
        });
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    setInstallEvent(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Nothing to do - the hint simply returns next visit.
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  if (!installEvent && !showIosHint) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt=""
        className="h-10 w-10 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-sky-900">Install the app</p>
        {showIosHint ? (
          <p className="mt-0.5 text-sky-800/80">
            Tap the Share button, then{" "}
            <span className="font-medium">Add to Home Screen</span>.
          </p>
        ) : (
          <p className="mt-0.5 text-sky-800/80">
            Add it to this device for a full-screen app with its own icon.
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {installEvent && (
          <button
            type="button"
            onClick={install}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Install
          </button>
        )}
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
  );
}
