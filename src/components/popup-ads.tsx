"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { LivePopupAd } from "@/lib/announcements.server";

// Which ads this person has already dismissed, kept in sessionStorage so they
// are shown once on arrival rather than on every page they open. Clearing when
// the tab closes is what makes the next sign-in show them again, and keying by
// user means a different student on the same device still sees them.
function seenKey(userId: string, adId: string) {
  return `popup-seen:${userId}:${adId}`;
}

function hasSeen(userId: string, adId: string) {
  try {
    return sessionStorage.getItem(seenKey(userId, adId)) === "1";
  } catch {
    // Private mode, or storage blocked. Treat as unseen - showing the ad is a
    // better failure than a blank screen where one was expected.
    return false;
  }
}

function markSeen(userId: string, adId: string) {
  try {
    sessionStorage.setItem(seenKey(userId, adId), "1");
  } catch {
    // Nothing to do: the ad closes either way, it just may reappear on the
    // next page load in a browser that refuses to remember.
  }
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

export function PopupAds({ ads, userId }: { ads: LivePopupAd[]; userId: string }) {
  // A string of one character per ad - "1" seen, "0" not. Read through
  // useSyncExternalStore so the server renders nothing and the client corrects
  // it after hydration, with no mismatch. Returning a plain string keeps the
  // snapshot comparable by value, so React does not re-render in a loop.
  const getSnapshot = useCallback(
    () => ads.map((ad) => (hasSeen(userId, ad.id) ? "1" : "0")).join(""),
    [ads, userId]
  );

  // Every ad counts as seen until the client says otherwise, so nothing flashes
  // up during server render or hydration.
  const getServerSnapshot = useCallback(() => "1".repeat(ads.length), [ads.length]);

  const seen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const index = seen.indexOf("0");
  const ad = index === -1 ? null : ads[index];

  const dismiss = useCallback(() => {
    if (!ad) return;
    markSeen(userId, ad.id);
    emit();
  }, [ad, userId]);

  // Escape closes, matching the nav drawer. Bound only while an ad is up.
  useEffect(() => {
    if (!ad) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [ad, dismiss]);

  // The page behind must not scroll while the overlay is up.
  useEffect(() => {
    if (!ad) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [ad]);

  if (!ad) return null;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ad.imageUrl}
      alt={ad.title ?? "Announcement"}
      className="block max-h-[70vh] w-full object-contain"
    />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ad.title ?? "Announcement"}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={dismiss}
    >
      <div
        className="animate-pop-in relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        // The backdrop closes on click; without this, a click on the ad itself
        // would bubble up and close it too.
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-xl leading-none text-white transition-colors hover:bg-black/70"
        >
          &times;
        </button>

        {ad.linkUrl ? (
          <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" onClick={dismiss}>
            {image}
          </a>
        ) : (
          image
        )}

        {ad.title && (
          <p className="px-4 py-3 text-center text-sm font-medium text-gray-800">{ad.title}</p>
        )}
      </div>
    </div>
  );
}
