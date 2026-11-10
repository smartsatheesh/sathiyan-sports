"use client";

import React, { useEffect, useState } from "react";

const GLYPHS = "-=+*#%01<>/\\";
const SR_ONLY: React.CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };

/**
 * Text that decodes from random glyphs into the real words, left to right.
 * The server renders the final text (good for SEO and no-JS); reduced-motion users skip the effect.
 */
export default function ScrambleText({ text, duration = 1100, delay = 150 }: { text: string; duration?: number; delay?: number }) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / duration));
      const revealed = Math.floor(k * text.length);
      setShown(
        text
          .split("")
          .map((ch, i) => (i < revealed || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join("")
      );
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration, delay]);

  return (
    <>
      <span style={SR_ONLY}>{text}</span>
      <span aria-hidden="true">{shown}</span>
    </>
  );
}
