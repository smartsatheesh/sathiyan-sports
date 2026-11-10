"use client";

import React, { useEffect, useState } from "react";
import { Box, SxProps, Theme } from "@mui/material";

// Sport balls, bats and trophies stand in for letters until they're revealed
const GLYPHS = ["⚽", "🏏", "🏸", "🏀", "🎾", "🏐", "🏆", "🏅"];
const GLYPH_STYLE: React.CSSProperties = { fontSize: "0.62em", verticalAlign: "0.18em", letterSpacing: 0 };
const SR_ONLY: React.CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };

/**
 * Text that decodes from spinning sport emoji into the real words, left to right.
 * The server renders the final text (good for SEO and no-JS); reduced-motion users skip the effect.
 * `textSx` styles only the revealed letters, so a gradient text fill doesn't swallow the emoji.
 */
export default function ScrambleText({ text, duration = 1100, delay = 150, textSx }: { text: string; duration?: number; delay?: number; textSx?: SxProps<Theme> }) {
  // How many letters are revealed; the rest show random sport emoji
  const [revealed, setRevealed] = useState(text.length);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / duration));
      setRevealed(Math.floor(k * text.length));
      setTick((t) => t + 1);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration, delay]);

  return (
    <>
      <span style={SR_ONLY}>{text}</span>
      <span aria-hidden="true">
        {revealed > 0 && (
          <Box component="span" sx={textSx}>
            {text.slice(0, revealed)}
          </Box>
        )}
        {text
          .slice(revealed)
          .split("")
          .map((ch, i) =>
            ch === " " ? (
              " "
            ) : (
              <span key={i} style={GLYPH_STYLE}>
                {GLYPHS[Math.floor(Math.random() * GLYPHS.length)]}
              </span>
            )
          )}
      </span>
    </>
  );
}
