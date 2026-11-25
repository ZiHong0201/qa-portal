"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin bar across the top of the window from the moment a link is clicked
// until the new page is showing.
//
// The loading.tsx skeletons already cover moving to another page. This covers
// what they cannot: links and search forms that stay on the same page and
// only change its ?query (filters, tabs, month pickers, searches), where Next
// keeps the old page on screen until the new one is ready and nothing else
// says the click was taken.
//
// Server-action forms (POST) are left alone: their buttons show their own
// "Saving…" state.

// Navigations that finish faster than this never show the bar, so a page
// that was already prefetched does not flash it.
const SHOW_AFTER_MS = 120;
// If the address never changes - a link the proxy bounced straight back, say -
// the bar gives up rather than crawling forever.
const GIVE_UP_AFTER_MS = 15_000;

let timers: number[] = [];
let running = false;

function clearTimers() {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
}

function begin(bar: HTMLDivElement) {
  clearTimers();
  running = true;
  timers.push(
    window.setTimeout(() => {
      bar.style.transition = "none";
      bar.style.opacity = "1";
      bar.style.width = "0%";
      void bar.offsetWidth; // commit the reset so the crawl below animates from zero
      // Fast at first, then ever slower, never quite reaching the end.
      bar.style.transition = "width 8s cubic-bezier(0.1, 0.7, 0.2, 1)";
      bar.style.width = "85%";
    }, SHOW_AFTER_MS),
    window.setTimeout(() => finish(bar), GIVE_UP_AFTER_MS)
  );
}

function finish(bar: HTMLDivElement) {
  if (!running) return;
  running = false;
  clearTimers();
  if (bar.style.opacity !== "1") return; // never shown
  bar.style.transition = "width 150ms ease-out, opacity 250ms ease 150ms";
  bar.style.width = "100%";
  bar.style.opacity = "0";
}

function samePage(to: URL) {
  return to.pathname === location.pathname && to.search === location.search;
}

export function NavigationProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // The new page is on screen once the address has changed.
  useEffect(() => {
    if (barRef.current) finish(barRef.current);
  }, [pathname, search]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const onClick = (e: MouseEvent) => {
      // A new tab or window, or a right-click: this page is not going anywhere.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      const to = new URL(a.href, location.href);
      // Another site, or a #jump within this page.
      if (to.origin !== location.origin || samePage(to)) return;
      begin(bar);
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (form.method !== "get") return;
      const to = new URL(form.action || location.href, location.href);
      if (to.origin !== location.origin) return;
      const data = new FormData(form, e.submitter);
      to.search = new URLSearchParams(data as unknown as Record<string, string>).toString();
      if (samePage(to)) return;
      begin(bar);
    };

    // A page restored by the Back button can come back mid-crawl.
    const onPageShow = () => finish(bar);

    // Capture phase, so a handler that stops the event further down cannot
    // hide it from the bar.
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("pageshow", onPageShow);
      clearTimers();
    };
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] h-[3px] bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)] print:hidden"
      style={{ width: "0%", opacity: 0 }}
    />
  );
}
