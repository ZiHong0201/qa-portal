"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveState } from "@/lib/live";

/**
 * Polls a live quiz's state.
 *
 * Polling rather than a socket on purpose: the portal runs on serverless
 * functions, which cannot hold a hundred connections open, and the state is
 * small and changes a few times a minute. What would make polling wasteful -
 * a hundred phones each reaching the database - is absorbed by the CDN; see
 * the route handler.
 *
 * Paused while the page is hidden, so a phone in a pocket stops asking, and
 * re-asked the moment it is looked at again.
 */
export function useLiveState(code: string, intervalMs: number) {
  const [state, setState] = useState<LiveState | null>(null);
  const [missing, setMissing] = useState(false);
  // Server clock minus this device's clock. Phones are routinely seconds
  // wrong, and the countdown has to agree with the deadline the server
  // enforces, not with whatever the phone believes the time is.
  const [offset, setOffset] = useState(0);
  const inFlight = useRef(false);

  const load = useCallback(
    async (bypassCache = false) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const sent = Date.now();
        // A unique query string steps around the one-second CDN cache, for
        // the moment right after the host has changed something.
        const url = `/api/live/${code}${bypassCache ? `?fresh=${sent}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        const received = Date.now();
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        if (!res.ok) return; // a blip; the next poll will try again
        const data = (await res.json()) as LiveState;
        // `Age` says how long the CDN had been holding this copy, so the
        // server's clock reading inside it is that much older than it looks.
        const age = Number(res.headers.get("age") ?? 0) * 1000;
        setOffset(data.serverNow + age - (sent + received) / 2);
        setMissing(false);
        setState(data);
      } catch {
        // Offline for a moment. Keep showing the last state rather than an error.
      } finally {
        inFlight.current = false;
      }
    },
    [code]
  );

  useEffect(() => {
    // Deferred a tick so the first fetch is not a setState inside the effect body.
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, intervalMs);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, intervalMs]);

  return { state, missing, offset, refresh: () => load(true) };
}

/** The server's idea of now, ticking, corrected by the measured offset. */
export function useServerNow(offset: number, tickMs = 200): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), tickMs);
    return () => clearInterval(timer);
  }, [offset, tickMs]);
  return now;
}

/** Whole seconds left until `at`, never negative. */
export function secondsUntil(at: number | null, now: number): number {
  if (at === null) return 0;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

/**
 * Standard competition ranks (1, 2, 2, 4) for standings already sorted by
 * score. Used for every place number shown anywhere, so the projector and a
 * player's phone can never disagree about where someone came.
 */
export function withRanks<T extends { score: number }>(standings: T[]): (T & { rank: number })[] {
  let rank = 0;
  return standings.map((s, i) => {
    // A new score starts a new place; an equal one shares the place above.
    if (i === 0 || standings[i - 1].score !== s.score) rank = i + 1;
    return { ...s, rank };
  });
}

/** Standard competition rank (1, 2, 2, 4) of a player within the standings. */
export function rankIn(standings: { id: string; score: number }[], id: string): number | null {
  const me = standings.find((s) => s.id === id);
  if (!me) return null;
  return standings.filter((s) => s.score > me.score).length + 1;
}
