"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Box, Container, IconButton, Stack, Typography } from "@mui/material";
import { ArrowBack, ArrowForward } from "@mui/icons-material";

type Tag = "Turf" | "Badminton" | "Cricket nets" | "The venue" | "Community";

// Photos of the club in /public (personal party photos, solo portraits of kids and watermarked
// screenshots are left out)
// `pos` is the focal point kept in frame when the photo is cropped to fill the stage
const PHOTOS: { src: string; title: string; tag: Tag; pos?: string }[] = [
  { src: "/S1.jpeg", title: "Sunset over the club", tag: "The venue", pos: "50% 62%" },
  { src: "/S13.jpeg", title: "Floodlit turf", tag: "Turf" },
  { src: "/S21.jpeg", title: "Wooden badminton courts", tag: "Badminton", pos: "50% 62%" },
  { src: "/S23.jpeg", title: "Net practice under lights", tag: "Cricket nets", pos: "50% 62%" },
  { src: "/S5.jpeg", title: "Tournament day", tag: "Community" },
  { src: "/S14.jpeg", title: "Cricket nets · badminton · turf cricket", tag: "The venue", pos: "50% 45%" },
  { src: "/S28.jpeg", title: "Football drills on the turf", tag: "Turf" },
  { src: "/S10.jpeg", title: "Practice nets", tag: "Cricket nets", pos: "50% 58%" },
  { src: "/S11.jpeg", title: "Cricket night crew", tag: "Community" },
  { src: "/S20.jpeg", title: "Turf cricket", tag: "Turf" },
  { src: "/S4.jpeg", title: "Coaching sessions", tag: "Badminton" },
  { src: "/S29.jpeg", title: "Turf pitch nets", tag: "Cricket nets", pos: "50% 55%" },
  { src: "/S25.jpeg", title: "Champions", tag: "Community", pos: "50% 42%" },
  { src: "/S16.jpeg", title: "Under the lights", tag: "Turf" },
  { src: "/S17.jpeg", title: "Doubles practice", tag: "Badminton" },
  { src: "/S2.jpeg", title: "Nets at night", tag: "Cricket nets" },
  { src: "/S27.jpeg", title: "The academy family", tag: "Community", pos: "50% 55%" },
  { src: "/S22.jpeg", title: "Open-air turf", tag: "Turf" },
  { src: "/S9.jpeg", title: "Badminton winners", tag: "Community", pos: "50% 30%" },
  { src: "/S15.jpeg", title: "The clubhouse", tag: "The venue" },
  { src: "/S24.jpeg", title: "Football camp", tag: "Community", pos: "50% 70%" },
  { src: "/S3.jpeg", title: "Football squad", tag: "Community" },
  { src: "/S7.jpeg", title: "Workshops & seminars", tag: "The venue", pos: "50% 45%" },
  { src: "/S6.jpeg", title: "Corporate events", tag: "The venue", pos: "50% 45%" },
  { src: "/S12.jpeg", title: "Players' lounge", tag: "The venue" },
];

const FILTERS: ("All" | Tag)[] = ["All", "Turf", "Badminton", "Cricket nets", "The venue", "Community"];
const SLIDE_MS = 5000;
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const CYAN = "#3ff2ff";
const GOLD = "#ffc400";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "Explore our facilities": a dark, glowing gallery — a big tilting stage with a slow zoom,
 * glass caption, autoplay progress bar, filter chips and a thumbnail rail. Swipe on phones.
 */
export default function FacilitiesShowcase() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const photos = useMemo(() => (filter === "All" ? PHOTOS : PHOTOS.filter((p) => p.tag === filter)), [filter]);
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const section = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const swipe = useRef<number | null>(null);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = useCallback(
    (to: number) => {
      const next = (to + photos.length) % photos.length;
      if (next === index) return;
      setPrev(index);
      setIndex(next);
    },
    [index, photos.length]
  );

  // Keep the active thumbnail in view without scrolling the page
  useEffect(() => {
    const r = rail.current;
    const thumb = r?.children[index] as HTMLElement | undefined;
    if (r && thumb) r.scrollTo({ left: thumb.offsetLeft - r.clientWidth / 2 + thumb.clientWidth / 2, behavior: reduced ? "auto" : "smooth" });
  }, [index, reduced]);

  const pickFilter = (f: (typeof FILTERS)[number]) => {
    setFilter(f);
    setIndex(0);
    setPrev(null);
  };

  // 3D tilt towards the pointer
  const onMove = (e: React.PointerEvent) => {
    const el = stage.current;
    if (!el || reduced || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1400px) rotateY(${x * 7}deg) rotateX(${-y * 6}deg)`;
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  };
  const onLeave = () => {
    setHover(false);
    if (stage.current) stage.current.style.transform = "perspective(1400px) rotateY(0deg) rotateX(0deg)";
  };

  const playing = inView && !hover && !reduced;
  const photo = photos[index];

  return (
    <Box
      ref={section}
      component="section"
      aria-label="Explore our facilities"
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#04060c",
        color: "#fff",
        py: { xs: 7, md: 11 },
        // faint grid, fading out at the edges
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 40%, #000 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, #000 20%, transparent 75%)",
          pointerEvents: "none",
        },
      }}
    >
      {/* drifting glow blobs */}
      {[
        { c: CYAN, top: "-10%", left: "-8%", d: "0s" },
        { c: "#7c4dff", top: "30%", left: "70%", d: "-6s" },
        { c: GOLD, top: "75%", left: "10%", d: "-12s" },
      ].map((b) => (
        <Box
          key={b.c}
          aria-hidden
          sx={{
            position: "absolute",
            top: b.top,
            left: b.left,
            width: { xs: 320, md: 560 },
            height: { xs: 320, md: 560 },
            borderRadius: "50%",
            background: b.c,
            opacity: 0.16,
            filter: "blur(110px)",
            animation: `facBlob 18s ease-in-out ${b.d} infinite alternate`,
            "@keyframes facBlob": { from: { transform: "translate(0,0) scale(1)" }, to: { transform: "translate(60px,-40px) scale(1.2)" } },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            pointerEvents: "none",
          }}
        />
      ))}

      <Container maxWidth="lg" sx={{ position: "relative" }}>
        {/* heading */}
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={2} sx={{ mb: { xs: 3, md: 4 } }}>
          <Box>
            <Typography sx={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase", color: CYAN, mb: 1.5 }}>
              {"// The grounds"}
            </Typography>
            <Typography component="h2" sx={{ fontWeight: 900, fontSize: { xs: "2.3rem", sm: "3rem", md: "4rem" }, lineHeight: 0.95, letterSpacing: "-0.03em", textTransform: "uppercase" }}>
              Explore our{" "}
              <Box
                component="span"
                sx={{
                  background: `linear-gradient(90deg, ${CYAN}, #8fb8ff 45%, ${GOLD})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                facilities
              </Box>
            </Typography>
          </Box>
          <Typography sx={{ maxWidth: 380, color: "rgba(255,255,255,0.65)", fontSize: { xs: "0.98rem", md: "1.05rem" } }}>
            Floodlit turf, wooden badminton courts, cricket nets and a hall for your events — all in Perungudi, Madurai.
          </Typography>
        </Stack>

        {/* filters */}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, mx: -1.5, px: 1.5, py: 1.5, overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
          {FILTERS.map((f) => {
            const on = f === filter;
            return (
              <Box
                key={f}
                component="button"
                onClick={() => pickFilter(f)}
                aria-pressed={on}
                sx={{
                  flexShrink: 0,
                  cursor: "pointer",
                  fontFamily: MONO,
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  px: 1.8,
                  py: 0.9,
                  borderRadius: 99,
                  border: `1px solid ${on ? CYAN : "rgba(255,255,255,0.18)"}`,
                  color: on ? "#04060c" : "rgba(255,255,255,0.8)",
                  background: on ? CYAN : "rgba(255,255,255,0.04)",
                  boxShadow: on ? `0 0 14px ${CYAN}55` : "none",
                  backdropFilter: "blur(8px)",
                  transition: "all .25s",
                  "&:hover": { borderColor: CYAN, color: on ? "#04060c" : "#fff" },
                  "&:focus-visible": { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
                }}
              >
                {f}
              </Box>
            );
          })}
        </Stack>

        {/* stage, framed by a slowly rotating glow border */}
        <Box
          sx={{
            position: "relative",
            borderRadius: { xs: 4, md: 6 },
            p: "2px",
            overflow: "hidden",
            boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${CYAN}22`,
            "&::before": {
              content: '""',
              position: "absolute",
              inset: "-60%",
              background: `conic-gradient(from 0deg, transparent 0 40%, ${CYAN} 50%, transparent 60% 85%, ${GOLD} 92%, transparent 100%)`,
              animation: "facSpin 7s linear infinite",
              "@keyframes facSpin": { to: { transform: "rotate(360deg)" } },
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            },
          }}
        >
          <Box
            ref={stage}
            onPointerEnter={() => setHover(true)}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            onPointerDown={(e) => (swipe.current = e.clientX)}
            onPointerUp={(e) => {
              if (swipe.current === null) return;
              const dx = e.clientX - swipe.current;
              swipe.current = null;
              if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
            }}
            sx={{
              position: "relative",
              aspectRatio: { xs: "4 / 5", sm: "4 / 3", md: "16 / 9", lg: "2 / 1" },
              borderRadius: { xs: "14px", md: "22px" },
              overflow: "hidden",
              bgcolor: "#0b1020",
              transition: "transform .4s cubic-bezier(.2,.8,.2,1)",
              touchAction: "pan-y",
              // pointer-following sheen
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                background: "radial-gradient(600px circle at var(--gx, 50%) var(--gy, 30%), rgba(255,255,255,0.12), transparent 45%)",
                pointerEvents: "none",
                zIndex: 3,
              },
            }}
          >
            {photos.map((p, i) => {
              const active = i === index;
              if (!active && i !== prev && i !== (index + 1) % photos.length) return null; // current, outgoing and the next one (preload)
              return (
                <Box
                  key={`${filter}-${p.src}`}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    opacity: active ? 1 : 0,
                    transition: "opacity 0.9s ease",
                    zIndex: active ? 2 : 1,
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      animation: active && !reduced ? `facZoom ${SLIDE_MS + 1500}ms ease-out both` : "none",
                      "@keyframes facZoom": { from: { transform: "scale(1.06)" }, to: { transform: "scale(1)" } },
                    }}
                  >
                    <Image
                      src={p.src}
                      alt={p.title}
                      fill
                      quality={90}
                      sizes="(max-width: 1232px) 100vw, 1200px"
                      priority={i === 0}
                      style={{ objectFit: "cover", objectPosition: p.pos || "50% 50%" }}
                    />
                  </Box>
                </Box>
              );
            })}

            {/* shade for the caption */}
            <Box sx={{ position: "absolute", inset: 0, zIndex: 2, background: "linear-gradient(180deg, rgba(4,6,12,0) 50%, rgba(4,6,12,0.85) 100%)", pointerEvents: "none" }} />

            {/* counter */}
            <Typography
              sx={{
                position: "absolute",
                top: { xs: 12, md: 20 },
                left: { xs: 12, md: 24 },
                zIndex: 4,
                px: 1.4,
                py: 0.6,
                borderRadius: 99,
                background: "rgba(10,16,32,0.55)",
                border: "1px solid rgba(255,255,255,0.16)",
                backdropFilter: "blur(10px)",
                fontFamily: MONO,
                fontSize: { xs: 12, md: 13 },
                letterSpacing: "0.2em",
              }}
            >
              <Box component="span" sx={{ color: CYAN }}>{pad(index + 1)}</Box>
              <Box component="span" sx={{ opacity: 0.5 }}> / {pad(photos.length)}</Box>
            </Typography>

            {/* glass caption */}
            <Box
              key={`cap-${filter}-${index}`}
              sx={{
                position: "absolute",
                left: { xs: 12, md: 24 },
                right: { xs: 12, md: "auto" },
                bottom: { xs: 12, md: 24 },
                zIndex: 4,
                maxWidth: { md: 520 },
                px: { xs: 2, md: 2.5 },
                py: { xs: 1.5, md: 2 },
                borderRadius: 3,
                background: "rgba(10,16,32,0.45)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(14px) saturate(1.4)",
                animation: reduced ? "none" : "facCap .7s cubic-bezier(.2,.8,.2,1) both",
                "@keyframes facCap": { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "none" } },
              }}
            >
              <Typography sx={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD, mb: 0.5 }}>{photo.tag}</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.25rem", md: "1.7rem" }, lineHeight: 1.15 }}>{photo.title}</Typography>
            </Box>

            {/* arrows */}
            <Stack direction="row" spacing={1} sx={{ position: "absolute", right: { xs: 12, md: 24 }, top: { xs: 8, md: "auto" }, bottom: { md: 24 }, zIndex: 4 }}>
              {[
                { label: "Previous photo", icon: <ArrowBack />, to: index - 1 },
                { label: "Next photo", icon: <ArrowForward />, to: index + 1 },
              ].map((b) => (
                <IconButton
                  key={b.label}
                  aria-label={b.label}
                  onClick={() => go(b.to)}
                  sx={{
                    color: "#fff",
                    width: { xs: 40, md: 52 },
                    height: { xs: 40, md: 52 },
                    background: "rgba(10,16,32,0.45)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    backdropFilter: "blur(10px)",
                    transition: "all .2s",
                    "&:hover": { background: CYAN, color: "#04060c", boxShadow: `0 0 24px ${CYAN}` },
                  }}
                >
                  {b.icon}
                </IconButton>
              ))}
            </Stack>

            {/* autoplay progress; finishing the bar moves to the next photo */}
            <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, zIndex: 5, background: "rgba(255,255,255,0.1)" }}>
              {!reduced && (
                <Box
                  key={`bar-${filter}-${index}`}
                  onAnimationEnd={() => go(index + 1)}
                  sx={{
                    height: "100%",
                    background: `linear-gradient(90deg, ${CYAN}, ${GOLD})`,
                    boxShadow: `0 0 12px ${CYAN}`,
                    transformOrigin: "left",
                    animation: `facBar ${SLIDE_MS}ms linear both`,
                    animationPlayState: playing ? "running" : "paused",
                    "@keyframes facBar": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* thumbnail rail */}
        <Box
          ref={rail}
          sx={{
            display: "flex",
            gap: 1.25,
            mt: 2,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            pb: 1,
            px: 0.5,
            pt: 0.5,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            maskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)",
            WebkitMaskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)",
          }}
        >
          {photos.map((p, i) => {
            const on = i === index;
            return (
              <Box
                key={`${filter}-${p.src}`}
                component="button"
                aria-label={`Show ${p.title}`}
                aria-current={on}
                onClick={() => go(i)}
                sx={{
                  position: "relative",
                  flexShrink: 0,
                  scrollSnapAlign: "center",
                  width: { xs: 92, md: 128 },
                  height: { xs: 62, md: 80 },
                  p: 0,
                  borderRadius: 2,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: `2px solid ${on ? CYAN : "transparent"}`,
                  boxShadow: on ? `0 0 18px ${CYAN}88` : "none",
                  opacity: on ? 1 : 0.5,
                  transform: on ? "translateY(-3px)" : "none",
                  transition: "all .3s",
                  background: "#0b1020",
                  "&:hover": { opacity: 1, transform: "translateY(-3px)" },
                  "&:focus-visible": { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
                }}
              >
                <Image src={p.src} alt="" fill sizes="132px" style={{ objectFit: "cover", objectPosition: p.pos || "50% 50%" }} />
              </Box>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}
