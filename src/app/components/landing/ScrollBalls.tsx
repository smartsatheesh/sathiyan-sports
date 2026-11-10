"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// Sports balls that rise and spin as the page scrolls down (and sink back when scrolling up).
// Movement is tied to the scroll position, not a timer, so nothing moves while the reader is
// still. It sits behind the page content (sections need position: relative + zIndex: 1) and
// writes transforms directly in a rAF — no React re-renders while scrolling.

const BALLS = ["⚽", "🏸", "🏏", "🏀", "🎾", "⚽", "🏸", "🏐", "🏏", "⚽", "🎾", "🏸", "🏀", "⚽"];

interface Ball {
  emoji: string;
  x: number; // vw
  start: number; // fraction of the travel loop
  speed: number; // px of rise per px scrolled
  size: number; // px
  spin: number; // degrees per px scrolled
  sway: number; // px
  phase: number;
}

export default function ScrollBalls() {
  const [enabled, setEnabled] = useState(false);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const layer = useRef<HTMLDivElement>(null);

  // Fixed layout (seeded, not random) so balls spread evenly across the width
  const balls = useMemo<Ball[]>(
    () =>
      BALLS.map((emoji, i) => ({
        emoji,
        x: ((i * 37) % 100) * 0.92 + 4,
        start: (i * 0.618) % 1,
        speed: 0.35 + ((i * 13) % 10) / 12,
        size: 22 + ((i * 7) % 5) * 9,
        spin: (i % 2 ? 1 : -1) * (0.15 + (i % 4) * 0.08),
        sway: 12 + (i % 3) * 10,
        phase: i * 1.3,
      })),
    []
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const h = window.innerHeight;
      const travel = h + 160; // each ball loops from just below the screen to just above it
      // fade in once the hero starts scrolling away
      if (layer.current) layer.current.style.opacity = String(Math.min(1, Math.max(0, (y - 120) / 380)));
      balls.forEach((b, i) => {
        const el = refs.current[i];
        if (!el) return;
        const pos = (((b.start * travel - y * b.speed) % travel) + travel) % travel; // 0..travel
        const top = pos - 80;
        const dx = Math.sin(y * 0.004 + b.phase) * b.sway;
        el.style.transform = `translate3d(${dx}px, ${top}px, 0) rotate(${y * b.spin}deg)`;
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled, balls]);

  if (!enabled) return null;
  return (
    <div ref={layer} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden", opacity: 0 }}>
      {balls.map((b, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          style={{
            position: "absolute",
            left: `${b.x}vw`,
            top: 0,
            fontSize: b.size,
            lineHeight: 1,
            willChange: "transform",
            filter: "drop-shadow(0 6px 10px rgba(7,26,46,0.18))",
          }}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
}
