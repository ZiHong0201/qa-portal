"use client";

import { useEffect, useRef } from "react";

// The subject palette from the dashboard tiles, so the signed-out pages feel
// like the same app rather than a separate front door.
const COLORS = ["#38bdf8", "#34d399", "#a78bfa", "#fbbf24", "#fb7185", "#22d3ee"];

const BASE_COUNT = 34;
const POINTER_RADIUS = 160;
const MAX_BURST_BUBBLES = 140;

type Bubble = {
  x: number;
  y: number;
  r: number;
  /** Drift the bubble returns to once the pointer has passed. */
  driftX: number;
  driftY: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  /** Burst bubbles fade out and are removed; drifting ones live forever. */
  decay: number;
};

function makeBubble(w: number, h: number): Bubble {
  const r = 8 + Math.random() * 42;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r,
    // Bigger bubbles drift slower, which reads as depth.
    driftX: (Math.random() - 0.5) * 0.35 * (30 / r),
    driftY: -(0.12 + Math.random() * 0.35) * (30 / r),
    vx: 0,
    vy: 0,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 0.2 + Math.random() * 0.3,
    decay: 0,
  };
}

function BubbleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let bubbles: Bubble[] = [];
    // Off-canvas until the pointer actually arrives, so nothing is pushed
    // around before the visitor has moved.
    const pointer = { x: -9999, y: -9999, active: false };
    let frame = 0;

    const resize = () => {
      // Cap the pixel ratio: a 3x phone screen triples the fill cost for no
      // visible gain on shapes this soft.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    bubbles = Array.from({ length: BASE_COUNT }, () => makeBubble(width, height));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const b of bubbles) {
        const gradient = ctx.createRadialGradient(
          b.x - b.r * 0.3,
          b.y - b.r * 0.3,
          b.r * 0.1,
          b.x,
          b.y,
          b.r
        );
        gradient.addColorStop(0, `${b.color}cc`);
        gradient.addColorStop(1, `${b.color}00`);
        ctx.globalAlpha = b.alpha;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const step = () => {
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];

        if (pointer.active) {
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < POINTER_RADIUS && dist > 0.01) {
            // Push hardest right at the cursor, tailing off to nothing at the
            // edge of its reach.
            const force = (1 - dist / POINTER_RADIUS) * 1.6;
            b.vx += (dx / dist) * force;
            b.vy += (dy / dist) * force;
          }
        }

        // Ease back to the bubble's own drift once the pointer has moved on.
        b.vx += (b.driftX - b.vx) * 0.045;
        b.vy += (b.driftY - b.vy) * 0.045;
        b.x += b.vx;
        b.y += b.vy;

        if (b.decay > 0) {
          b.alpha -= b.decay;
          if (b.alpha <= 0) {
            bubbles.splice(i, 1);
            continue;
          }
        } else {
          // Drifting bubbles wrap around so the field never empties.
          if (b.y < -b.r) {
            b.y = height + b.r;
            b.x = Math.random() * width;
          }
          if (b.y > height + b.r) b.y = -b.r;
          if (b.x < -b.r) b.x = width + b.r;
          if (b.x > width + b.r) b.x = -b.r;
        }
      }
      draw();
      frame = requestAnimationFrame(step);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Hard cap so rapid tapping can't grow the array without bound.
      const room = MAX_BURST_BUBBLES - bubbles.length;
      const count = Math.min(14, Math.max(0, room));
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = 2 + Math.random() * 3.5;
        bubbles.push({
          x,
          y,
          r: 5 + Math.random() * 16,
          driftX: 0,
          driftY: -0.2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: 0.55,
          decay: 0.006 + Math.random() * 0.006,
        });
      }
    };

    if (reduceMotion) {
      // Still colourful, just still: draw the field once and leave it.
      draw();
      const onResize = () => {
        resize();
        bubbles = Array.from({ length: BASE_COUNT }, () => makeBubble(width, height));
        draw();
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerleave", onPointerLeave);
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // Pointer events are read from the window, so the canvas itself must
      // never intercept clicks meant for the form.
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}

/**
 * The full backdrop for the signed-out pages: a slow colour wash with the
 * interactive bubble field above it. Both layers sit behind the content and
 * ignore pointer events, so they can be dropped onto any page.
 */
export function InteractiveBackdrop() {
  return (
    <>
      <div className="animate-aurora fixed inset-0 -z-20 bg-[linear-gradient(120deg,#e0f2fe,#ede9fe,#dbeafe,#ccfbf1,#fae8ff)] bg-[length:400%_400%]" />
      <BubbleCanvas />
    </>
  );
}
