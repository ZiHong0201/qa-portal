"use client";

import { useEffect, useRef } from "react";

// How fast the text crosses the screen. Constant by design: the distance to
// travel is the screen width plus the text width, so a fixed DURATION would
// make the same notice crawl on a phone and race across a desktop.
const PIXELS_PER_SECOND = 80;

// Nothing shorter than this, so a handful of words does not flick past.
const MIN_DURATION_SECONDS = 8;

export function Megaphone() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      {/* Horn, opening to the right towards the text it is announcing. */}
      <path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z" />
      {/* Handle hanging off the underside of the horn. */}
      <path d="M7 14v3a2 2 0 0 0 4 0v-1" />
      {/* Two arcs for the sound coming out. */}
      <path d="M17 9a4 4 0 0 1 0 6" />
      <path d="M19.5 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

/**
 * One line of text scrolling right to left.
 *
 * The track carries `padding-left: 100%`, which is 100% of the VIEWPORT, so
 * the text begins just past the right-hand edge of the screen rather than
 * flush against the left. Animating to translateX(-100%) - 100% of the
 * track's own width, which is the padding plus the text - carries it all the
 * way off the left. So each pass enters from the right, crosses, and leaves.
 */
export function Marquee({ text }: { text: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Measured rather than guessed: scrollWidth is exactly the distance the
  // track travels, so dividing by the speed gives a duration that reads at
  // the same pace on any screen. Written straight to the node's style - no
  // state, so a resize never triggers a React render.
  useEffect(() => {
    const track = trackRef.current;
    const viewport = track?.parentElement;
    if (!track || !viewport) return;

    const update = () => {
      const seconds = Math.max(MIN_DURATION_SECONDS, track.scrollWidth / PIXELS_PER_SECOND);
      track.style.setProperty("--marquee-duration", `${seconds}s`);
    };

    update();
    // Rotating a phone changes the distance, and so the duration.
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="marquee-viewport min-w-0 flex-1 overflow-hidden">
      <div
        ref={trackRef}
        className="marquee-track text-sm"
        // A rough server-side guess so the first frame is close, before the
        // effect measures properly. Assumes ~7px a character on a ~900px
        // screen; being a little off for one frame is invisible.
        style={{
          ["--marquee-duration" as string]: `${Math.max(
            MIN_DURATION_SECONDS,
            (text.length * 7 + 900) / PIXELS_PER_SECOND
          )}s`,
        }}
      >
        {text}
      </div>
    </div>
  );
}
