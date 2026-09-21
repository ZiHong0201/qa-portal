"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Watches a single question while it is on screen and reports how it was
 * answered: how long it took, whether the student left the tab, and whether
 * anything was pasted.
 *
 * None of this is shown to the student while they answer - the point is to
 * give a teacher context afterwards, not to put a clock over someone's
 * shoulder. And none of it proves anything on its own: a phone call, a
 * notification, or a PWA backgrounding all look identical to switching away
 * to look something up. Treat a flag as a reason to ask, never as a verdict.
 *
 * Deliberately not attempted: anything claiming to detect what a student did
 * in another application or on a second device. The browser cannot see it,
 * and pretending otherwise would give false confidence.
 */
export type IntegritySignals = {
  secondsTaken: number;
  awayCount: number;
  awaySeconds: number;
  pasteAttempts: number;
};

export function useIntegrityTracker(questionId: string) {
  // Not Date.now() here: calling it during render is impure, and the reset
  // effect below sets it on mount anyway.
  const shownAt = useRef(0);
  const awayCount = useRef(0);
  const awayMs = useRef(0);
  const hiddenSince = useRef<number | null>(null);
  const pasteAttempts = useRef(0);

  // Reset for each new question rather than each mount: the deck keeps the
  // same component alive as the student moves between cards.
  useEffect(() => {
    shownAt.current = Date.now();
    awayCount.current = 0;
    awayMs.current = 0;
    hiddenSince.current = null;
    pasteAttempts.current = 0;
  }, [questionId]);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        hiddenSince.current = Date.now();
        awayCount.current += 1;
      } else if (hiddenSince.current !== null) {
        awayMs.current += Date.now() - hiddenSince.current;
        hiddenSince.current = null;
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const countPaste = useCallback(() => {
    pasteAttempts.current += 1;
  }, []);

  const read = useCallback((): IntegritySignals => {
    // If the answer is submitted while still hidden - possible on a phone
    // returning to a PWA - close off the open away period first.
    const pendingAway = hiddenSince.current === null ? 0 : Date.now() - hiddenSince.current;
    return {
      secondsTaken: Math.round((Date.now() - shownAt.current) / 1000),
      awayCount: awayCount.current,
      awaySeconds: Math.round((awayMs.current + pendingAway) / 1000),
      pasteAttempts: pasteAttempts.current,
    };
  }, []);

  return { read, countPaste };
}

/**
 * Handlers that block copying, cutting, pasting and the context menu on the
 * question card.
 *
 * Worth being honest about the limits: this stops casual copy and paste, and
 * nothing more. A screenshot, a photograph of the screen, or simply retyping
 * the question all defeat it in seconds. It is a speed bump, not a barrier.
 */
export function blockingHandlers(onPaste?: () => void) {
  const swallow = (e: React.SyntheticEvent) => {
    e.preventDefault();
    return false;
  };

  return {
    onCopy: swallow,
    onCut: swallow,
    onContextMenu: swallow,
    onDragStart: swallow,
    onPaste: (e: React.ClipboardEvent) => {
      e.preventDefault();
      onPaste?.();
    },
  };
}
