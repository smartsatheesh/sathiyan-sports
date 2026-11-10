"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  BadmintonScene,
  BADMINTON_DURATION,
  CricketScene,
  CRICKET_DURATION,
  FootballScene,
  FOOTBALL_DURATION,
  heroInput,
} from "./Scenes";

export const HERO_SCENES = [
  { key: "football", caption: "SIUUU! ⚽", Scene: FootballScene, duration: FOOTBALL_DURATION },
  { key: "badminton", caption: "Jump smash! 🏸", Scene: BadmintonScene, duration: BADMINTON_DURATION },
  { key: "cricket", caption: "That's a SIX! 🏏", Scene: CricketScene, duration: CRICKET_DURATION },
] as const;

interface HeroSceneProps {
  index: number;
  onFinished: () => void;
  still: boolean;
  freezeAt?: number;
}

// Renders the active 3D scene; pauses rendering when off-screen or the tab is hidden.
export default function HeroScene({ index, onFinished, still, freezeAt }: HeroSceneProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const scene = HERO_SCENES[index];

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const running = visible && pageVisible && !still && freezeAt === undefined;

  // Feed scroll and pointer into the camera (look-around + scroll dolly)
  useEffect(() => {
    if (!running) return;
    const onScroll = () => {
      const h = wrapper.current?.offsetHeight || window.innerHeight;
      heroInput.scroll = Math.min(1, Math.max(0, window.scrollY / h));
    };
    const onPointer = (e: PointerEvent) => {
      heroInput.px = (e.clientX / window.innerWidth) * 2 - 1;
      heroInput.py = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [running]);

  // Advance to the next scene when this one ends (only while actually playing)
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(onFinished, scene.duration * 1000);
    return () => window.clearTimeout(id);
  }, [running, index, scene.duration, onFinished]);

  const { Scene } = scene;
  return (
    <div ref={wrapper} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
      <Canvas
        key={`${scene.key}-${running ? "run" : "pause"}`}
        frameloop={running || freezeAt !== undefined ? "always" : "demand"}
        dpr={[1, 1.75]}
        camera={{ fov: 45, near: 0.1, far: 60, position: [0, 1.7, 5.5] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Scene still={still} freezeAt={freezeAt} />
      </Canvas>
    </div>
  );
}
