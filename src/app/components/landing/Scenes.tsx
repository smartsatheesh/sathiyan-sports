"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Athlete, {
  AthleteHandle,
  HIP_HEIGHT,
  IDLE,
  CRICKET_KIT,
  Kit,
  MASCOT_KIT,
  Pose,
  blendJoints,
  lerp,
  lerpV,
  phase,
  runCycle,
  Vec3,
} from "./Athlete";

// Each scene runs on its own clock from mount; `still` freezes it on the iconic frame
// (used for reduced-motion users).
export interface SceneProps {
  still?: boolean;
  /** Freeze at this many seconds (preview/debug via ?scene=&t=) */
  freezeAt?: number;
}

function useSceneClock(still: boolean | undefined, stillAt: number, freezeAt?: number) {
  const start = useRef<number | null>(null);
  return (elapsed: number) => {
    if (freezeAt !== undefined) return freezeAt;
    if (still) return stillAt;
    if (start.current === null) start.current = elapsed;
    return elapsed - start.current;
  };
}

/** Teammate in the same club kit, with darker hair and skin so the two kids read apart. */
const TEAMMATE_KIT: Kit = { ...MASCOT_KIT, hair: "#24160d", skin: "#d39c74" };

/** Written by HeroScene: how far the hero has scrolled away (0 → 1) and the pointer (−1 → 1). */
export const heroInput = { scroll: 0, px: 0, py: 0 };

/** Night sky: a gradient dome, no textures. */
function Sky({ top, horizon }: { top: string; horizon: string }) {
  const uniforms = useMemo(() => ({ top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) } }), [top, horizon]);
  return (
    <mesh scale={40}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={"varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"}
        fragmentShader={"uniform vec3 top; uniform vec3 horizon; varying float vY; void main(){ gl_FragColor = vec4(mix(horizon, top, smoothstep(-0.05, 0.55, vY)), 1.0); }"}
      />
    </mesh>
  );
}

// ---------------- shared stadium ----------------

const SHIRTS = ["#ff3d00", "#ffd600", "#00e5ff", "#ffffff", "#76ff03", "#ff4081", "#2979ff", "#ffe11a", "#ffe11a", "#d62839"];
const SKINS = ["#f5c39e", "#e0a67e", "#c68b62", "#a8714a", "#8a5a3a"];
const HAIR = ["#1a120c", "#2a1a10", "#3a2414", "#111111"];

/** Fans on tiered stands: shirt, head, hair, and a V of raised arms for the noisiest ones. */
function Crowd({ radius = 13, rows = 4, perRow = 170 }: { radius?: number; rows?: number; perRow?: number }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const hair = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  const count = rows * perRow;
  const fans = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const row = Math.floor(i / perRow);
        const a = ((i % perRow) / perRow) * Math.PI * 2 + row * 0.018 + (Math.random() - 0.5) * 0.01;
        const r = radius + row * 0.9;
        return {
          x: Math.cos(a) * r,
          y: 0.45 + row * 0.55,
          z: Math.sin(a) * r,
          face: Math.atan2(-Math.cos(a), -Math.sin(a)), // look at the pitch
          phase: Math.random() * 10,
          cheer: Math.random() < 0.35,
          scale: 0.9 + Math.random() * 0.2,
          shirt: new THREE.Color(SHIRTS[Math.floor(Math.random() * SHIRTS.length)]),
          skin: new THREE.Color(SKINS[Math.floor(Math.random() * SKINS.length)]),
          hair: new THREE.Color(HAIR[Math.floor(Math.random() * HAIR.length)]),
        };
      }),
    [radius, rows, perRow, count]
  );
  const geo = useMemo(() => {
    const arm = (side: number) => {
      const g = new THREE.CapsuleGeometry(0.035, 0.26, 4, 8);
      g.translate(0, 0.15, 0);
      g.rotateZ(-side * 0.45);
      g.translate(side * 0.12, 0.1, 0);
      return g;
    };
    return {
      body: new THREE.CapsuleGeometry(0.13, 0.16, 4, 10),
      head: new THREE.SphereGeometry(0.105, 12, 10),
      hair: new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      arms: mergeSimple([arm(1), arm(-1)]),
    };
  }, []);

  // Colours are fixed, so set them before the first frame (the shader then knows about them)
  useLayoutEffect(() => {
    fans.forEach((f, i) => {
      bodies.current?.setColorAt(i, f.shirt);
      heads.current?.setColorAt(i, f.skin);
      hair.current?.setColorAt(i, f.hair);
      arms.current?.setColorAt(i, f.skin);
    });
    [bodies, heads, hair, arms].forEach((m) => m.current?.instanceColor && (m.current.instanceColor.needsUpdate = true));
  }, [fans]);

  // Fans bouncing in the stands; cheering ones jump higher with their arms up
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    fans.forEach((f, i) => {
      const bounce = Math.max(0, Math.sin(t * (f.cheer ? 7 : 5) + f.phase)) * (f.cheer ? 0.12 : 0.05);
      const set = (mesh: THREE.InstancedMesh | null, dy: number, hidden = false) => {
        if (!mesh) return;
        dummy.position.set(f.x, f.y + bounce + dy * f.scale, f.z);
        dummy.rotation.set(0, f.face, 0);
        dummy.scale.setScalar(hidden ? 0 : f.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      };
      set(bodies.current, 0);
      set(heads.current, 0.33);
      set(hair.current, 0.35);
      set(arms.current, 0.12, !f.cheer);
    });
    [bodies, heads, hair, arms].forEach((m) => m.current && (m.current.instanceMatrix.needsUpdate = true));
  });

  return (
    <>
      {/* stepped concrete stands */}
      {Array.from({ length: rows }, (_, row) => (
        <group key={row}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2 + row * 0.55, 0]}>
            <ringGeometry args={[radius + row * 0.9 - 0.45, radius + row * 0.9 + 0.45, 96]} />
            <meshStandardMaterial color={row % 2 ? "#2a3240" : "#323b4b"} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
          <mesh position={[0, row * 0.275 + 0.1, 0]}>
            <cylinderGeometry args={[radius + row * 0.9 - 0.45, radius + row * 0.9 - 0.45, 0.2 + row * 0.55, 96, 1, true]} />
            <meshStandardMaterial color="#1b222d" side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={bodies} args={[geo.body, undefined, count]}>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[geo.head, undefined, count]}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={hair} args={[geo.hair, undefined, count]}>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[geo.arms, undefined, count]}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </>
  );
}

function Floodlights() {
  const spots: Vec3[] = [
    [-10, 0, -10],
    [10, 0, -10],
    [-12, 0, 6],
    [12, 0, 6],
  ];
  return (
    <>
      {spots.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 4.5, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 9, 8]} />
            <meshStandardMaterial color="#2b3440" />
          </mesh>
          <mesh position={[0, 9.2, 0]}>
            <boxGeometry args={[1.6, 0.7, 0.3]} />
            <meshStandardMaterial color="#ffffff" emissive="#fff6d5" emissiveIntensity={3} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Stadium({ ground, lines }: { ground: string; lines?: React.ReactNode }) {
  return (
    <>
      <hemisphereLight args={["#d6ecff", "#1a2a55", 0.7]} />
      <directionalLight position={[4, 8, 6]} intensity={1.25} color="#fff6e8" />
      {/* electric rim light from behind */}
      <directionalLight position={[-2, 4, -7]} intensity={1.6} color="#3ff2ff" />
      <directionalLight position={[-6, 5, -4]} intensity={0.6} color="#7fd4ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[12.5, 64]} />
        <meshStandardMaterial color={ground} roughness={0.95} />
      </mesh>
      {lines}
      <Crowd />
      <Floodlights />
      <EnergyDust />
    </>
  );
}

/** Soft fake shadow under a player (cheap — no shadow maps). */
function Shadow({ target }: { target: React.RefObject<AthleteHandle> }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const root = target.current?.root;
    if (!root || !ref.current) return;
    const lift = Math.max(0, root.position.y - HIP_HEIGHT);
    ref.current.position.set(root.position.x, 0.01, root.position.z);
    const s = 1 / (1 + lift * 1.5);
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * s;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.38, 24]} />
      <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}

/** A ball with a fading trail; `path(t)` returns its position or null when hidden. */
function TrailBall({
  clock,
  path,
  radius,
  color,
  trailColor,
  children,
}: {
  clock: (elapsed: number) => number;
  path: (t: number) => Vec3 | null;
  radius: number;
  color: string;
  trailColor: string;
  children?: React.ReactNode;
}) {
  const ball = useRef<THREE.Group>(null);
  const trail = useRef<(THREE.Mesh | null)[]>([]);
  const N = 10;
  useFrame((state) => {
    const t = clock(state.clock.elapsedTime);
    const p = path(t);
    if (ball.current) {
      ball.current.visible = Boolean(p);
      if (p) {
        ball.current.position.set(...p);
        const ahead = path(t + 0.01);
        if (ahead) ball.current.lookAt(new THREE.Vector3(...ahead));
      }
    }
    trail.current.forEach((m, i) => {
      if (!m) return;
      const q = path(t - (i + 1) * 0.025);
      m.visible = Boolean(q && p);
      if (q) m.position.set(...q);
    });
  });
  return (
    <>
      <group ref={ball}>
        {children || (
          <mesh>
            <sphereGeometry args={[radius, 16, 12]} />
            <meshStandardMaterial color={color} roughness={0.4} />
          </mesh>
        )}
      </group>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(m) => { trail.current[i] = m; }}>
          <sphereGeometry args={[radius * (1 - i / (N + 2)), 8, 6]} />
          <meshBasicMaterial color={trailColor} transparent opacity={0.7 * (1 - i / N)} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </>
  );
}

// ---------------- celebration burst ----------------

// A trophy cup: lathe profile (foot, stem, bowl), plus a medal disc and a bat with handle.
let celebrationGeos: { ball: THREE.BufferGeometry; bat: THREE.BufferGeometry; cup: THREE.BufferGeometry; medal: THREE.BufferGeometry } | null = null;
function celebrationGeometry() {
  if (celebrationGeos) return celebrationGeos;
  const cupProfile = [
    [0, 0], [0.07, 0], [0.07, 0.015], [0.022, 0.03], [0.016, 0.08], [0.03, 0.1], [0.075, 0.13], [0.085, 0.2], [0.08, 0.2], [0.065, 0.14], [0, 0.12],
  ].map(([x, y]) => new THREE.Vector2(x, y - 0.1));
  const blade = new THREE.BoxGeometry(0.055, 0.26, 0.022);
  blade.translate(0, -0.04, 0);
  const handle = new THREE.CylinderGeometry(0.012, 0.012, 0.13, 8);
  handle.translate(0, 0.15, 0);
  celebrationGeos = {
    ball: new THREE.SphereGeometry(0.06, 14, 10),
    bat: mergeSimple([blade, handle]),
    cup: new THREE.LatheGeometry(cupProfile, 16),
    medal: new THREE.CylinderGeometry(0.06, 0.06, 0.014, 20).rotateX(Math.PI / 2),
  };
  return celebrationGeos;
}

/** Joins non-indexed copies of a few geometries (enough for a bat: blade + handle). */
function mergeSimple(parts: THREE.BufferGeometry[]) {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const count = flat.reduce((n, g) => n + g.getAttribute("position").count, 0);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  let o = 0;
  flat.forEach((g) => {
    pos.set(g.getAttribute("position").array as Float32Array, o * 3);
    nor.set(g.getAttribute("normal").array as Float32Array, o * 3);
    o += g.getAttribute("position").count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return out;
}

type FlyerKind = "ball" | "bat" | "cup" | "medal";
const FLYER_COLORS: Record<FlyerKind, string[]> = {
  ball: ["#ffffff", "#c62828", "#d4e157", "#ff7043", "#fafafa"], // football, cricket ball, tennis, basketball
  bat: ["#e0b97a", "#d9a866"],
  cup: ["#ffc400", "#ffd54f"],
  medal: ["#ffc400", "#cfd8dc", "#cd7f32"], // gold, silver, bronze
};

/** One kind of flying prop: instanced, thrown from `origin` once `at` seconds have passed. */
function Flyers({ kind, clock, at, origin, count, size }: { kind: FlyerKind; clock: (e: number) => number; at: number; origin: Vec3; count: number; size: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = celebrationGeometry()[kind];
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        v: new THREE.Vector3((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 5),
        spin: (Math.random() - 0.5) * 12,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        scale: (0.8 + Math.random() * 0.5) * size,
        color: new THREE.Color(FLYER_COLORS[kind][Math.floor(Math.random() * FLYER_COLORS[kind].length)]),
      })),
    [count, kind, size]
  );
  const colored = useRef(false);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = clock(state.clock.elapsedTime) - at;
    mesh.visible = dt > 0 && dt < 3.5;
    if (!mesh.visible) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    seeds.forEach((s, i) => {
      const pos = new THREE.Vector3(
        origin[0] + s.v.x * dt,
        Math.max(0.06, origin[1] + s.v.y * dt - 4.9 * dt * dt * 0.6),
        origin[2] + s.v.z * dt
      );
      q.setFromAxisAngle(s.axis, s.spin * dt);
      m.compose(pos, q, sc.setScalar(s.scale));
      mesh.setMatrixAt(i, m);
      if (!colored.current) mesh.setColorAt(i, s.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (!colored.current && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    colored.current = true;
  });
  const shiny = kind === "cup" || kind === "medal";
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]} visible={false}>
      <meshStandardMaterial
        roughness={shiny ? 0.25 : 0.55}
        metalness={shiny ? 0.55 : 0}
        emissive={shiny ? "#5a3d00" : "#000000"}
        side={kind === "cup" ? THREE.DoubleSide : THREE.FrontSide}
      />
    </instancedMesh>
  );
}

/** Celebration burst of balls, bats, trophy cups and medals that fires once at `at` seconds. */
function Celebration({ clock, at, origin, count = 140, size = 1 }: { clock: (e: number) => number; at: number; origin: Vec3; count?: number; size?: number }) {
  const n = Math.max(8, Math.round(count / 3));
  const props = { clock, at, origin, size };
  return (
    <>
      <Flyers kind="ball" count={n} {...props} />
      <Flyers kind="bat" count={Math.round(n * 0.35)} {...props} />
      <Flyers kind="cup" count={Math.round(n * 0.35)} {...props} />
      <Flyers kind="medal" count={Math.round(n * 0.5)} {...props} />
    </>
  );
}

// ---------------- electric effects ----------------

let dotTexture: THREE.Texture | null = null;
function softDot() {
  if (dotTexture) return dotTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(160,245,255,0.6)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  dotTexture = new THREE.CanvasTexture(c);
  return dotTexture;
}

/** Glowing specks drifting up through the stadium. */
function EnergyDust({ count = 260 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const seeds = useMemo(
    () => Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 18, z: (Math.random() - 0.5) * 16 - 2, y: Math.random() * 7, v: 0.15 + Math.random() * 0.45, w: Math.random() * 6 })),
    [count]
  );
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    seeds.forEach((p, i) => {
      positions[i * 3] = p.x + Math.sin(t * 0.6 + p.w) * 0.3;
      positions[i * 3 + 1] = (p.y + t * p.v) % 7;
      positions[i * 3 + 2] = p.z + Math.cos(t * 0.5 + p.w) * 0.3;
    });
    const attr = ref.current?.geometry.getAttribute("position");
    if (attr) attr.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={softDot()} color="#9ff6ff" size={0.16} transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation fog={false} />
    </points>
  );
}

function jaggedPath(a: THREE.Vector3, b: THREE.Vector3, segments: number, jitter: number) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let prev = a.clone();
  for (let j = 1; j <= segments; j++) {
    const next = a.clone().lerp(b, j / segments);
    if (j < segments) next.add(new THREE.Vector3((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter));
    path.add(new THREE.LineCurve3(prev, next));
    prev = next;
  }
  return path;
}

/**
 * A lightning strike from the sky onto `center` at `at` seconds, then crackling arcs around it
 * that fade over `duration`. Bolts re-randomise every 50 ms; tubes are tiny so rebuilding is cheap.
 */
function Lightning({ clock, at, duration = 1.3, center, color = "#6ff7ff" }: { clock: (e: number) => number; at: number; duration?: number; center: Vec3; color?: string }) {
  const K = 7; // bolt 0 is the sky strike
  const core = useRef<(THREE.Mesh | null)[]>([]);
  const glow = useRef<(THREE.Mesh | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const last = useRef(-1);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), [color]);
  const c = useMemo(() => new THREE.Vector3(...center), [center]);

  useFrame((state) => {
    const dt = clock(state.clock.elapsedTime) - at;
    const on = dt >= 0 && dt <= duration;
    const fade = on ? 1 - dt / duration : 0;
    coreMat.opacity = fade;
    glowMat.opacity = 0.45 * fade;
    if (light.current) light.current.intensity = on ? 4 * fade * (0.6 + Math.random() * 0.4) : 0;
    for (let i = 0; i < K; i++) {
      const visible = on && (i > 0 || dt < 0.35);
      if (core.current[i]) core.current[i]!.visible = visible;
      if (glow.current[i]) glow.current[i]!.visible = visible;
    }
    if (!on) return;
    const tick = Math.floor(dt / 0.05);
    if (tick === last.current) return;
    last.current = tick;
    for (let i = 0; i < K; i++) {
      let path: THREE.CurvePath<THREE.Vector3>;
      if (i === 0) {
        path = jaggedPath(new THREE.Vector3(c.x + 1.5, 9, c.z - 3), c, 14, 0.9);
      } else {
        const a = Math.random() * Math.PI * 2;
        const dist = 0.6 + Math.random() * 0.8;
        const end = new THREE.Vector3(c.x + Math.cos(a) * dist, c.y + (Math.random() - 0.3) * 1.2, c.z + Math.sin(a) * dist);
        path = jaggedPath(c, end, 7, 0.22);
      }
      const cm = core.current[i];
      const gm = glow.current[i];
      if (cm) {
        cm.geometry.dispose();
        cm.geometry = new THREE.TubeGeometry(path, 28, i === 0 ? 0.03 : 0.012, 4, false);
      }
      if (gm) {
        gm.geometry.dispose();
        gm.geometry = new THREE.TubeGeometry(path, 28, i === 0 ? 0.11 : 0.045, 5, false);
      }
    }
  });

  return (
    <>
      {Array.from({ length: K }).map((_, i) => (
        <React.Fragment key={i}>
          <mesh ref={(m) => { core.current[i] = m; }} material={coreMat} visible={false} />
          <mesh ref={(m) => { glow.current[i] = m; }} material={glowMat} visible={false} />
        </React.Fragment>
      ))}
      <pointLight ref={light} position={center} color={color} intensity={0} distance={7} />
    </>
  );
}

/** Neon ring under a player that sends out a shockwave at `at` seconds. */
function GlowRing({ target, clock, at, color = "#45f3ff" }: { target: React.RefObject<AthleteHandle>; clock: (e: number) => number; at: number; color?: string }) {
  const base = useRef<THREE.Mesh>(null);
  const wave = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const root = target.current?.root;
    if (!root) return;
    const t = clock(state.clock.elapsedTime);
    const pulse = 0.45 + Math.sin(t * 5) * 0.15;
    if (base.current) {
      base.current.position.set(root.position.x, 0.015, root.position.z);
      (base.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
    if (wave.current) {
      const dt = t - at;
      const on = dt >= 0 && dt < 0.9;
      wave.current.visible = on;
      wave.current.position.set(root.position.x, 0.02, root.position.z);
      const k = Math.max(0, dt) / 0.9;
      wave.current.scale.setScalar(1 + k * 4);
      (wave.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
    }
  });
  return (
    <>
      <mesh ref={base} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.5, 48]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={wave} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.45, 0.52, 48]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}

const UP = new THREE.Vector3(0, 1, 0);

function useCamera(fn: (t: number) => { pos: Vec3; look: Vec3 }, clock: (e: number) => number) {
  const look = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const lean = useRef({ x: 0, y: 0 });
  useFrame((state, delta) => {
    const t = clock(state.clock.elapsedTime);
    const { pos, look: l } = fn(t);
    state.camera.position.set(...pos);
    look.set(...l);
    state.camera.lookAt(look);
    // On wide screens the headline overlays the left side, so slide the action right;
    // on a narrow stage step back so the players fit.
    const aspect = state.size.width / state.size.height;
    state.camera.updateMatrixWorld();
    if (aspect > 1.15) {
      side.setFromMatrixColumn(state.camera.matrixWorld, 0).multiplyScalar(-Math.min(2.2, (aspect - 1.1) * 2.6));
      state.camera.position.add(side);
      look.add(side);
    } else if (aspect < 0.85) {
      side.subVectors(state.camera.position, look).normalize().multiplyScalar(2.2);
      state.camera.position.add(side); // narrow stage: step back so both players fit
    }
    // Look around with the mouse / a finger, and drift up and back as the hero scrolls away
    lean.current.x = THREE.MathUtils.damp(lean.current.x, heroInput.px, 3, delta);
    lean.current.y = THREE.MathUtils.damp(lean.current.y, heroInput.py, 3, delta);
    offset.subVectors(state.camera.position, look).applyAxisAngle(UP, -lean.current.x * 0.45);
    offset.y += -lean.current.y * 0.6 + heroInput.scroll * 1.6;
    offset.multiplyScalar(1 + heroInput.scroll * 0.35);
    state.camera.position.copy(look).add(offset);
    state.camera.lookAt(look);
  });
}

// ---------------- 1. Football: dribble, score, run and "SIUUU!" ----------------

export const FOOTBALL_DURATION = 8;

/** Second teammate and the opposition (no club crest on rival kits). */
const TEAMMATE2_KIT: Kit = { ...MASCOT_KIT, hair: "#151515", skin: "#e8b48c" };
const RIVAL_KIT: Kit = { ...MASCOT_KIT, shirt: "#d62839", trim: "#ffffff", shorts: "#ffffff", socks: "#d62839", hair: "#3a2414", skin: "#c68b62", badge: "plain" };
const KEEPER_KIT: Kit = { ...MASCOT_KIT, shirt: "#39e07a", trim: "#103b22", shorts: "#103b22", socks: "#39e07a", hair: "#2a1a10", skin: "#f0bf98", badge: "plain" };

// Football timeline (seconds)
const F = { kickFrom: 1.3, contact: 1.58, turn: 1.95, runEnd: 3.35, jump: 3.47, land: 4.0 };
const F_START: Vec3 = [-2.1, HIP_HEIGHT, 1.3];
const F_KICK: Vec3 = [-0.55, HIP_HEIGHT, -1.75];
const F_SIU: Vec3 = [-0.4, HIP_HEIGHT, 0.6];
const F_TOP_CORNER: Vec3 = [1.15, 1.55, -4.75];
const TO_GOAL = Math.atan2(F_KICK[0] - F_START[0], F_KICK[2] - F_START[2]);

/** Where the scorer is while dribbling in (used by the ball too). */
const dribblePos = (t: number): Vec3 => lerpV(F_START, F_KICK, Math.min(1, Math.max(0, t) / F.kickFrom));

/** The ball: at the scorer's feet, then into the top corner and down into the net. */
function footballPath(t: number): Vec3 | null {
  if (t < F.contact) {
    const p = dribblePos(t);
    const touch = 0.3 + 0.16 * Math.abs(Math.sin(t * Math.PI * 1.6)); // knocked ahead and caught up with
    return [p[0] + Math.sin(TO_GOAL) * touch, 0.11, p[2] + Math.cos(TO_GOAL) * touch];
  }
  const kicked = footballPath(F.contact - 0.0001)!;
  const k = (t - F.contact) / 0.42;
  if (k < 1) {
    const p = lerpV(kicked, F_TOP_CORNER, k);
    p[1] += Math.sin(k * Math.PI) * 0.35;
    return p;
  }
  const drop = t - F.contact - 0.42;
  return [F_TOP_CORNER[0], Math.max(0.11, F_TOP_CORNER[1] - drop * drop * 6), -5.0];
}

export function FootballScene({ still, freezeAt }: SceneProps) {
  const clock = useSceneClock(still, 4.6, freezeAt);
  const p7 = useRef<AthleteHandle>(null);
  const p10 = useRef<AthleteHandle>(null);
  const p11 = useRef<AthleteHandle>(null);
  const rival = useRef<AthleteHandle>(null);
  const keeper = useRef<AthleteHandle>(null);

  const siuPose: Pose["joints"] = {
    spine: [-0.2, 0, 0],
    neck: [-0.35, 0, 0],
    lShoulder: [0.15, 0, 0.75],
    rShoulder: [0.15, 0, -0.75],
    lElbow: [0, 0, 0],
    rElbow: [0, 0, 0],
    lHip: [0, 0, 0.32],
    rHip: [0, 0, -0.32],
    lKnee: [0.35, 0, 0],
    rKnee: [0.35, 0, 0],
  };
  const windUp: Pose["joints"] = { spine: [0.25, 0, 0], lHip: [-0.25, 0, 0], rHip: [0.85, 0, 0], lKnee: [0.35, 0, 0], rKnee: [1.5, 0, 0], lShoulder: [-0.5, 0, 0.7], rShoulder: [0.5, 0, -0.6], lElbow: [-0.4, 0, 0], rElbow: [-0.4, 0, 0] };
  const strike: Pose["joints"] = { spine: [-0.05, 0, 0], lHip: [0.1, 0, 0], rHip: [-1.35, 0, 0], lKnee: [0.3, 0, 0], rKnee: [0.1, 0, 0], lShoulder: [0.5, 0, 0.8], rShoulder: [-0.7, 0, -0.7], lElbow: [-0.3, 0, 0], rElbow: [-0.3, 0, 0] };
  const skyPoint: Pose["joints"] = { spine: [-0.12, 0, 0], neck: [-0.55, 0, 0], lShoulder: [-2.85, 0, 0.18], rShoulder: [-2.85, 0, -0.18], lElbow: [-0.1, 0, 0], rElbow: [-0.1, 0, 0] };
  const handsOnHead: Pose["joints"] = { spine: [0.1, 0, 0], neck: [0.25, 0, 0], lShoulder: [-2.5, 0, 0.75], rShoulder: [-2.5, 0, -0.75], lElbow: [-2.1, 0, 0], rElbow: [-2.1, 0, 0] };
  const keeperReady: Pose["joints"] = { spine: [0.35, 0, 0], lHip: [-0.6, 0, 0.25], rHip: [-0.6, 0, -0.25], lKnee: [1.0, 0, 0], rKnee: [1.0, 0, 0], lShoulder: [-0.6, 0, 0.6], rShoulder: [-0.6, 0, -0.6], lElbow: [-0.6, 0, 0], rElbow: [-0.6, 0, 0] };
  const keeperDive: Pose["joints"] = { spine: [0, 0, 0], neck: [0, 0, 0.3], lShoulder: [-3.0, 0, 0.1], rShoulder: [-3.0, 0, -0.1], lElbow: [0, 0, 0], rElbow: [0, 0, 0], lHip: [0, 0, 0.15], rHip: [0, 0, -0.35], lKnee: [0.3, 0, 0], rKnee: [0.6, 0, 0] };

  useFrame((state) => {
    const t = clock(state.clock.elapsedTime);

    // Scorer — dribble in, strike it into the top corner, turn and sprint to the fans, leap, spin, land: SIUUU!
    let pose: Pose;
    if (t < F.kickFrom) {
      pose = { position: dribblePos(t), rotationY: TO_GOAL, joints: runCycle(t, 1.9) };
    } else if (t < F.contact) {
      const k = phase(t, F.kickFrom, F.contact - 0.1);
      const hit = phase(t, F.contact - 0.1, F.contact);
      pose = { position: F_KICK, rotationY: TO_GOAL, joints: blendJoints(blendJoints(runCycle(F.kickFrom, 1.9), windUp, k), strike, hit) };
    } else if (t < F.turn) {
      const k = phase(t, F.contact, F.turn);
      pose = { position: lerpV(F_KICK, [F_KICK[0] + 0.15, HIP_HEIGHT, F_KICK[2] - 0.25], k), rotationY: TO_GOAL, joints: blendJoints(strike, IDLE, k) };
    } else if (t < F.runEnd) {
      const k = (t - F.turn) / (F.runEnd - F.turn);
      const run = runCycle(t, 2.0);
      const aeroplane: Pose["joints"] = { ...run, spine: [0.1, 0, 0], lShoulder: [0.15, 0, 1.25], rShoulder: [0.15, 0, -1.25], lElbow: [-0.15, 0, 0], rElbow: [-0.15, 0, 0] };
      pose = { position: lerpV(F_KICK, F_SIU, k), rotationY: lerp(TO_GOAL, 0.05, phase(t, F.turn, F.turn + 0.3)), joints: aeroplane };
    } else if (t < F.jump) {
      const k = phase(t, F.runEnd, F.jump);
      const crouch: Pose["joints"] = { spine: [0.35, 0, 0], lHip: [-0.9, 0, 0], rHip: [-0.9, 0, 0], lKnee: [1.4, 0, 0], rKnee: [1.4, 0, 0], lShoulder: [0.6, 0, 0.2], rShoulder: [0.6, 0, -0.2] };
      pose = { position: [F_SIU[0], HIP_HEIGHT - 0.22 * k, F_SIU[2]], rotationY: 0.05 * (1 - k), joints: blendJoints(runCycle(F.runEnd, 2.0), crouch, k) };
    } else if (t < F.land) {
      const k = (t - F.jump) / (F.land - F.jump);
      const tuck: Pose["joints"] = { spine: [-0.1, 0, 0], lHip: [-0.5, 0, 0.2], rHip: [-0.5, 0, -0.2], lKnee: [1.2, 0, 0], rKnee: [1.2, 0, 0], lShoulder: [-0.4, 0, 1.4], rShoulder: [-0.4, 0, -1.4] };
      pose = { position: [F_SIU[0], HIP_HEIGHT + Math.sin(k * Math.PI) * 0.75, F_SIU[2]], rotationY: Math.PI * 2 * phase(k, 0, 1), joints: tuck }; // full spin, lands facing the camera
    } else {
      const k = phase(t, F.land, F.land + 0.18);
      pose = { position: [F_SIU[0], HIP_HEIGHT - 0.12 * k + Math.sin(t * 3) * 0.02, F_SIU[2]], rotationY: 0, joints: siuPose };
    }
    p7.current?.applyPose(pose);

    // Defender — chases the dribble a step behind, then hands on head
    const chase = Math.min(t, F.contact + 0.2);
    const behind = dribblePos(chase - 0.45);
    const stop = phase(t, F.contact, F.contact + 0.5);
    rival.current?.applyPose({
      position: [behind[0] + 0.55, HIP_HEIGHT, behind[2] + 0.2],
      rotationY: TO_GOAL,
      joints: blendJoints(runCycle(t, 1.9), handsOnHead, stop),
    });

    // Keeper — shuffles on the line, dives the wrong way and stays down
    const dive = phase(t, F.contact, F.contact + 0.35);
    const k = keeper.current;
    k?.applyPose({
      position: [lerp(Math.sin(t * 2.2) * 0.3, -1.25, dive), lerp(HIP_HEIGHT - 0.12, 0.32, dive), -4.05],
      rotationY: 0,
      joints: blendJoints(keeperReady, keeperDive, dive),
    });
    if (k?.root) k.root.rotation.z = dive * 1.35;

    // Teammates — celebrate the goal, then run over to the scorer
    const goal = phase(t, F.contact + 0.45, F.contact + 0.8);
    const join = (t - 3.0) / 1.1;
    const mate = (ref: React.RefObject<AthleteHandle>, from: Vec3, to: Vec3, cheer: number) => {
      const running = join > 0 && join < 1;
      const arrived = join >= 1;
      ref.current?.applyPose({
        position: lerpV(from, to, Math.min(1, Math.max(0, join))),
        rotationY: running ? Math.atan2(to[0] - from[0], to[2] - from[2]) : arrived ? -0.4 * Math.sign(to[0] - F_SIU[0]) : -0.35,
        joints: running
          ? runCycle(t, 1.9)
          : arrived
          ? { ...skyPoint, spine: [-0.12, 0, 0] }
          : blendJoints(runCycle(t, 1.2, 0.35), skyPoint, goal * cheer),
      });
      if (ref.current?.root && arrived) ref.current.root.position.y = HIP_HEIGHT + Math.abs(Math.sin(t * 5)) * 0.1;
    };
    mate(p10, [1.3, HIP_HEIGHT, -2.3], [0.75, HIP_HEIGHT, 0.15], 1);
    mate(p11, [2.5, HIP_HEIGHT, -3.3], [1.55, HIP_HEIGHT, -0.6], 0.8);
  });

  useCamera((t) => {
    // behind the attack for the goal, then round to the front for the celebration
    const k = phase(t, 2.0, 3.3);
    return {
      pos: lerpV([-0.6, 3.1, 4.6], [0.6 + Math.sin(t * 0.18) * 0.8, 1.75, 4.9], k),
      look: lerpV([-0.6, 0.7, -2.4], [0.3, 1.05, -0.2], k),
    };
  }, clock);

  const lines = (
    <>
      {/* penalty box lines and goal */}
      {[[-3, -4.5, 6, 0.06], [-3, -4.5, 0.06, 2.5], [3, -4.5, 0.06, 2.5], [-3, -2, 6, 0.06]].map(([x, z, w, d], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x + w / 2, 0.012, z + d / 2]}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color="#e8f5e9" />
        </mesh>
      ))}
      <group position={[0, 0, -4.6]}>
        {[-1.8, 1.8].map((x) => (
          <mesh key={x} position={[x, 1.1, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 2.2, 10]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
        <mesh position={[0, 2.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 3.7, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 1.1, -0.6]}>
          <boxGeometry args={[3.6, 2.2, 0.02]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.18} />
        </mesh>
      </group>
    </>
  );

  return (
    <>
      <Sky top="#02040f" horizon="#0f3a7a" />
      <fog attach="fog" args={["#0a2250", 14, 30]} />
      <Stadium ground="#1f8f3a" lines={lines} />
      <Athlete ref={p7} />
      <Athlete ref={p10} kit={TEAMMATE_KIT} />
      <Athlete ref={p11} kit={TEAMMATE2_KIT} />
      <Athlete ref={rival} kit={RIVAL_KIT} />
      <Athlete ref={keeper} kit={KEEPER_KIT} />
      {[p7, p10, p11, rival, keeper].map((r, i) => (
        <Shadow key={i} target={r} />
      ))}
      <TrailBall clock={clock} radius={0.11} color="#ffffff" trailColor="#7df9ff" path={footballPath} />
      <Lightning clock={clock} at={F.contact + 0.42} duration={0.8} center={F_TOP_CORNER} color="#ffe14d" />
      <Celebration clock={clock} at={F.land} origin={[F_SIU[0], 1.4, F_SIU[2] - 0.2]} />
      <Lightning clock={clock} at={F.land - 0.03} center={[F_SIU[0], 0.9, F_SIU[2]]} />
      <GlowRing target={p7} clock={clock} at={F.land} />
    </>
  );
}

// ---------------- 2. Badminton: jump smash ----------------

export const BADMINTON_DURATION = 5.5;

function Racket() {
  return (
    <group rotation={[0, 0, 0]}>
      <mesh position={[0, -0.13, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.26, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, -0.33, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.16, 6]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
      </mesh>
      <group position={[0, -0.52, 0]} scale={[0.85, 1.15, 1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.012, 8, 28]} />
          <meshStandardMaterial color="#ff1744" metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.115, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function Shuttle() {
  // Cork points forward (+Z after lookAt), feathers trail behind
  return (
    <group>
      <mesh position={[0, 0, 0.03]}>
        <sphereGeometry args={[0.035, 12, 10]} />
        <meshStandardMaterial color="#fafafa" />
      </mesh>
      <mesh position={[0, 0, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.07, 0.12, 14, 1, true]} />
        <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

export function BadmintonScene({ still, freezeAt }: SceneProps) {
  const clock = useSceneClock(still, 1.5, freezeAt);
  const player = useRef<AthleteHandle>(null);
  const rival = useRef<AthleteHandle>(null);

  const ready: Pose["joints"] = { ...IDLE, spine: [0.15, 0, 0], lHip: [-0.3, 0, 0.15], rHip: [-0.3, 0, -0.15], lKnee: [0.5, 0, 0], rKnee: [0.5, 0, 0], rShoulder: [-0.8, 0, -0.3], rElbow: [-1.2, 0, 0] };
  const cocked: Pose["joints"] = { spine: [-0.3, 0.35, 0], neck: [-0.5, 0, 0], lShoulder: [-2.6, 0, 0.2], lElbow: [-0.1, 0, 0], rShoulder: [-2.5, 0, -0.55], rElbow: [-2.3, 0, 0], lHip: [-0.7, 0, 0.1], rHip: [0.4, 0, -0.1], lKnee: [1.1, 0, 0], rKnee: [0.9, 0, 0] };
  const smash: Pose["joints"] = { spine: [0.45, -0.3, 0], neck: [0.1, 0, 0], lShoulder: [-0.3, 0, 0.5], lElbow: [-1.2, 0, 0], rShoulder: [-1.1, 0, -0.1], rElbow: [-0.1, 0, 0], lHip: [0.3, 0, 0.1], rHip: [-0.7, 0, -0.1], lKnee: [0.9, 0, 0], rKnee: [1.0, 0, 0] };
  const landed: Pose["joints"] = { ...smash, lHip: [-0.4, 0, 0.25], rHip: [-0.2, 0, -0.25], lKnee: [0.8, 0, 0], rKnee: [0.6, 0, 0], spine: [0.3, -0.2, 0] };

  const CONTACT = 1.5;

  useFrame((state) => {
    const t = clock(state.clock.elapsedTime);
    const base: Vec3 = [0, HIP_HEIGHT, 0.6];
    let pose: Pose;
    if (t < 0.85) {
      pose = { position: [base[0], HIP_HEIGHT - 0.12 + Math.sin(t * 8) * 0.015, base[2]], joints: ready };
    } else if (t < 1.25) {
      const k = phase(t, 0.85, 1.1);
      pose = { position: [0, HIP_HEIGHT - 0.12 - 0.12 * k, base[2]], joints: blendJoints(ready, cocked, k) };
    } else if (t < 1.95) {
      const air = (t - 1.25) / 0.7;
      const height = Math.sin(air * Math.PI) * 0.7;
      const k = phase(t, CONTACT - 0.06, CONTACT + 0.08);
      pose = { position: [0, HIP_HEIGHT - 0.1 + height, base[2] - air * 0.2], joints: blendJoints(cocked, smash, k) };
    } else {
      const k = phase(t, 1.95, 2.15);
      pose = { position: [0, HIP_HEIGHT - 0.18 * k, base[2] - 0.2], joints: blendJoints(smash, landed, k) };
    }
    pose.rotationY = Math.PI; // facing the net (−Z)
    player.current?.applyPose(pose);

    // Opponent — lifts the shuttle high, waits for it, lunges at the smash and can only watch it land
    const lift: Pose["joints"] = { ...ready, rShoulder: [lerp(0.7, -2.2, phase(t, 0, 0.25)), 0, -0.3], rElbow: [-0.2, 0, 0], lShoulder: [-0.6, 0, 0.4] };
    const lunge: Pose["joints"] = { spine: [0.45, 0, 0.15], neck: [-0.2, 0, 0], lHip: [0.5, 0, 0.2], rHip: [-1.3, 0, -0.35], lKnee: [1.2, 0, 0], rKnee: [0.9, 0, 0], rShoulder: [-1.4, 0, -0.9], rElbow: [-0.1, 0, 0], lShoulder: [0.4, 0, 0.6] };
    const dismay: Pose["joints"] = { spine: [0.15, 0, 0], neck: [0.3, 0, 0], lShoulder: [-2.5, 0, 0.75], rShoulder: [-0.4, 0, -0.3], lElbow: [-2.1, 0, 0], rElbow: [-0.5, 0, 0] };
    const reach = phase(t, CONTACT + 0.02, CONTACT + 0.3);
    const giveUp = phase(t, CONTACT + 0.9, CONTACT + 1.3);
    const rivalBase: Vec3 = [lerp(-0.75, -0.2, phase(t, 0.3, 1.2)), HIP_HEIGHT - 0.1, lerp(-7.0, -6.3, phase(t, 0.3, 1.2))];
    rival.current?.applyPose({
      position: [lerp(rivalBase[0], 0.75, reach), rivalBase[1] - 0.25 * reach * (1 - giveUp) + Math.sin(t * 7) * 0.012 * (1 - reach), lerp(rivalBase[2], -5.4, reach)],
      rotationY: 0.4 * reach * (1 - giveUp),
      joints: t < 0.4 ? lift : blendJoints(blendJoints(ready, lunge, reach), dismay, giveUp),
    });
  });

  useCamera((t) => ({ pos: [4.0 + Math.sin(t * 0.25) * 0.4, 1.9, 4.6], look: [0, 1.45, -0.9] }), clock);

  const contactPoint: Vec3 = [-0.2, 2.55, 0.25];
  const lines = (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -1.5]}>
        <planeGeometry args={[6.1, 13.4]} />
        <meshStandardMaterial color="#0f7a5c" roughness={0.9} />
      </mesh>
      {[[-3.0, 0.05, 13.4], [3.0, 0.05, 13.4], [-2.55, 0.04, 13.4], [2.55, 0.04, 13.4]].map(([x, w, d], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, -1.5]}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {[-1.5 + 1.98, -1.5 - 1.98, -1.5 + 6.68, -1.5 - 6.68].map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, z]}>
          <planeGeometry args={[6.1, 0.05]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* net */}
      <group position={[0, 0, -1.5]}>
        {[-3.05, 3.05].map((x) => (
          <mesh key={x} position={[x, 0.78, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.56, 8]} />
            <meshStandardMaterial color="#e0e0e0" />
          </mesh>
        ))}
        <mesh position={[0, 1.22, 0]}>
          <boxGeometry args={[6.1, 0.7, 0.01]} />
          <meshStandardMaterial color="#111" transparent opacity={0.45} />
        </mesh>
        <mesh position={[0, 1.56, 0]}>
          <boxGeometry args={[6.1, 0.05, 0.02]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
    </>
  );

  return (
    <>
      <Sky top="#05020f" horizon="#3a1a7a" />
      <fog attach="fog" args={["#22104d", 13, 28]} />
      <Stadium ground="#7a4a24" lines={lines} />
      <Athlete ref={player} rightHandItem={<Racket />} />
      <Athlete ref={rival} kit={RIVAL_KIT} rightHandItem={<Racket />} />
      <Shadow target={player} />
      <Shadow target={rival} />
      <TrailBall
        clock={clock}
        radius={0.04}
        color="#fff"
        trailColor="#d1b3ff"
        path={(t) => {
          if (t < CONTACT) {
            // high lob from the far court
            const k = Math.max(0, t / CONTACT);
            const start: Vec3 = [-1.0, 1.25, -6.9]; // off the opponent's racket
            const p = lerpV(start, contactPoint, k);
            p[1] += Math.sin(k * Math.PI) * 2.6;
            return p;
          }
          const k = (t - CONTACT) / 0.32; // the smash — very fast and steep
          if (k > 1.6) return null;
          return lerpV(contactPoint, [0.4, 0.05, -4.6], Math.min(k, 1));
        }}
      >
        <Shuttle />
      </TrailBall>
      <Celebration clock={clock} at={CONTACT + 0.35} origin={[0.4, 0.3, -4.6]} count={90} size={1.5} />
      <Lightning clock={clock} at={CONTACT} duration={1.1} center={contactPoint} color="#b388ff" />
      <Lightning clock={clock} at={CONTACT + 0.32} duration={0.9} center={[0.4, 0.1, -4.6]} color="#b388ff" />
      <GlowRing target={player} clock={clock} at={1.95} color="#b388ff" />
    </>
  );
}

// ---------------- 3. Cricket: lofted "helicopter" six ----------------

export const CRICKET_DURATION = 6;

function Bat({ clock }: { clock: (e: number) => number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = clock(state.clock.elapsedTime);
    // the helicopter twirl after contact
    if (ref.current) ref.current.rotation.y = t > 1.4 ? Math.min((t - 1.4) * 14, Math.PI * 2) : 0;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.26, 8]} />
        <meshStandardMaterial color="#1b1b1b" />
      </mesh>
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[0.11, 0.6, 0.045]} />
        <meshStandardMaterial color="#e9c98b" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** The fielding side: green with gold panels, no club crest. */
const FIELDING_KIT: Kit = { ...CRICKET_KIT, shirt: "#1f8a4c", trim: "#0f4d2a", panel: "#ffd23f", shorts: "#1f8a4c", socks: "#1f8a4c", cap: "#14663a", skin: "#c98d64", hair: "#1b120b", wristbands: undefined, badge: "plain" };

export function CricketScene({ still, freezeAt }: SceneProps) {
  const clock = useSceneClock(still, 1.6, freezeAt);
  const batter = useRef<AthleteHandle>(null);
  const bowler = useRef<AthleteHandle>(null);
  const keeper = useRef<AthleteHandle>(null);
  const fielder = useRef<AthleteHandle>(null);
  const CONTACT = 1.42;
  const RELEASE = 0.5;

  const stance: Pose["joints"] = { spine: [0.3, 0.5, 0], neck: [0, -0.6, 0], lHip: [-0.15, 0, 0.12], rHip: [-0.15, 0, -0.12], lKnee: [0.4, 0, 0], rKnee: [0.4, 0, 0], lShoulder: [-0.6, 0, -0.5], rShoulder: [-0.6, 0, 0.2], lElbow: [-0.5, 0, 0], rElbow: [-0.6, 0, 0] };
  const backlift: Pose["joints"] = { ...stance, spine: [0.15, 0.85, 0], lShoulder: [-2.0, 0, -0.9], rShoulder: [-2.4, 0, -0.2], lElbow: [-1.0, 0, 0], rElbow: [-1.4, 0, 0], lKnee: [0.55, 0, 0], rKnee: [0.3, 0, 0] };
  const impact: Pose["joints"] = { ...stance, spine: [0.2, -0.2, 0], lShoulder: [-1.0, 0, 0.1], rShoulder: [-0.9, 0, 0.3], lElbow: [-0.1, 0, 0], rElbow: [-0.1, 0, 0], lHip: [-0.4, 0, 0.15], rHip: [0.2, 0, -0.15] };
  const finish: Pose["joints"] = { ...impact, spine: [-0.15, -0.7, 0], neck: [-0.6, -0.3, 0], lShoulder: [-2.9, 0, 0.3], rShoulder: [-3.0, 0, -0.2], lElbow: [-0.6, 0, 0], rElbow: [-0.4, 0, 0], rHip: [0.35, 0, -0.2], rKnee: [0.6, 0, 0] };

  useFrame((state) => {
    const t = clock(state.clock.elapsedTime);
    let joints: Pose["joints"];
    if (t < 0.95) joints = blendJoints(stance, stance, 0);
    else if (t < 1.28) joints = blendJoints(stance, backlift, phase(t, 0.95, 1.28));
    else if (t < CONTACT) joints = blendJoints(backlift, impact, phase(t, 1.28, CONTACT));
    else joints = blendJoints(impact, finish, phase(t, CONTACT, CONTACT + 0.35));
    batter.current?.applyPose({ position: [0, HIP_HEIGHT - 0.1, 0], rotationY: Math.PI / 2, joints });

    // Bowler — short run-up, windmill arm over the top at release, follow through, then hands on head
    const runIn = Math.min(t, RELEASE);
    const swing = phase(t, RELEASE - 0.25, RELEASE + 0.15);
    const bowl: Pose["joints"] = { spine: [0.25, 0, 0], lShoulder: [-2.6, 0, 0.3], rShoulder: [lerp(0.4, -5.6, swing), 0, -0.15], lElbow: [-0.3, 0, 0], rElbow: [0, 0, 0], lHip: [-0.6, 0, 0], rHip: [0.4, 0, 0], lKnee: [0.2, 0, 0], rKnee: [0.6, 0, 0] };
    const despair: Pose["joints"] = { spine: [0.05, 0, 0], neck: [-0.4, 0, 0], lShoulder: [-2.5, 0, 0.75], rShoulder: [-2.5, 0, -0.75], lElbow: [-2.1, 0, 0], rElbow: [-2.1, 0, 0] };
    bowler.current?.applyPose({
      position: [0.1, HIP_HEIGHT, -12.5 + runIn * 6.4 + Math.max(0, Math.min(t - RELEASE, 0.6)) * 1.2],
      rotationY: 0,
      joints:
        t < RELEASE - 0.25
          ? runCycle(t, 2.2)
          : t < RELEASE + 0.4
          ? blendJoints(runCycle(RELEASE - 0.25, 2.2), bowl, phase(t, RELEASE - 0.25, RELEASE - 0.1))
          : blendJoints(bowl, despair, phase(t, CONTACT + 0.4, CONTACT + 0.9)),
    });

    // Wicketkeeper — crouched behind the stumps, springs up to watch it go
    const up = phase(t, CONTACT + 0.1, CONTACT + 0.5);
    const crouch: Pose["joints"] = { spine: [0.5, 0, 0], neck: [-0.4, 0, 0], lHip: [-1.3, 0, 0.35], rHip: [-1.3, 0, -0.35], lKnee: [2.1, 0, 0], rKnee: [2.1, 0, 0], lShoulder: [-1.1, 0, -0.25], rShoulder: [-1.1, 0, 0.25], lElbow: [-0.3, 0, 0], rElbow: [-0.3, 0, 0] };
    const watch: Pose["joints"] = { spine: [-0.1, 0, 0], neck: [-0.7, 0, 0], lShoulder: [-0.3, 0, 0.3], rShoulder: [-0.3, 0, -0.3], lElbow: [-0.4, 0, 0], rElbow: [-0.4, 0, 0] };
    keeper.current?.applyPose({ position: [-0.75, lerp(HIP_HEIGHT - 0.4, HIP_HEIGHT, up), 1.9], rotationY: Math.PI + 0.6 * up, joints: blendJoints(crouch, watch, up) });

    // Deep fielder — backpedals towards the rope and leaps, but it sails over
    const chase = phase(t, CONTACT + 0.2, CONTACT + 0.95);
    const leap = Math.max(0, Math.sin(Math.min(1, Math.max(0, (t - CONTACT - 0.95) / 0.5)) * Math.PI));
    const reach: Pose["joints"] = { spine: [-0.25, 0, 0], neck: [-0.6, 0, 0], lShoulder: [-3.0, 0, 0.25], rShoulder: [-3.0, 0, -0.25], lElbow: [-0.1, 0, 0], rElbow: [-0.1, 0, 0], lHip: [-0.3, 0, 0], rHip: [0.3, 0, 0], lKnee: [0.6, 0, 0], rKnee: [0.9, 0, 0] };
    fielder.current?.applyPose({
      position: [lerp(3.2, 3.9, chase), HIP_HEIGHT + leap * 0.55, lerp(-7.2, -9.6, chase)],
      rotationY: lerp(-2.6, -2.9, chase),
      joints: t < CONTACT + 0.2 ? { ...IDLE, spine: [0.3, 0, 0], lKnee: [0.4, 0, 0], rKnee: [0.4, 0, 0] } : t < CONTACT + 0.95 ? runCycle(t, 2.2) : blendJoints(runCycle(t, 2.2), reach, Math.min(1, (t - CONTACT - 0.95) / 0.15)),
    });
  });

  useCamera(
    (t) => {
      const follow = phase(t, CONTACT, CONTACT + 1.2);
      return { pos: [lerp(3.6, 4.4, follow), lerp(1.6, 2.1, follow), lerp(3.0, 4.2, follow)], look: [lerp(0, 1.4, follow), lerp(1.1, 2.3, follow), lerp(-0.6, -3.5, follow)] };
    },
    clock
  );

  const contactPoint: Vec3 = [0.55, 0.7, -0.15];
  const lines = (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -6]}>
        <planeGeometry args={[3, 22]} />
        <meshStandardMaterial color="#c9b27c" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -1.2]}>
        <planeGeometry args={[2.64, 0.04]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* stumps & bails */}
      <group position={[0, 0, 0.5]}>
        {[-0.11, 0, 0.11].map((x) => (
          <mesh key={x} position={[x, 0.36, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.72, 8]} />
            <meshStandardMaterial color="#f5e6c8" />
          </mesh>
        ))}
        <mesh position={[0, 0.73, 0]}>
          <boxGeometry args={[0.24, 0.02, 0.02]} />
          <meshStandardMaterial color="#ff6f00" />
        </mesh>
      </group>
    </>
  );

  return (
    <>
      <Sky top="#010812" horizon="#0b4a6e" />
      <fog attach="fog" args={["#082e47", 15, 32]} />
      <Stadium ground="#2e9e48" lines={lines} />
      <Athlete
        ref={batter}
        kit={CRICKET_KIT}
        rightHandItem={<Bat clock={clock} />}
      />
      <Athlete ref={bowler} kit={FIELDING_KIT} />
      <Athlete ref={keeper} kit={FIELDING_KIT} />
      <Athlete ref={fielder} kit={FIELDING_KIT} />
      {[batter, bowler, keeper, fielder].map((r, i) => (
        <Shadow key={i} target={r} />
      ))}
      <TrailBall
        clock={clock}
        radius={0.05}
        color="#d50000"
        trailColor="#ffe14d"
        path={(t) => {
          if (t < 0.5) return null;
          if (t < 1.18) {
            // delivery: down to the bounce
            return lerpV([0, 2.1, -9], [0.25, 0.04, -2.2], (t - 0.5) / 0.68);
          }
          if (t < CONTACT) return lerpV([0.25, 0.04, -2.2], contactPoint, (t - 1.18) / (CONTACT - 1.18));
          const k = (t - CONTACT) / 1.4; // lofted over the ropes
          if (k > 1.3) return null;
          const p = lerpV(contactPoint, [4.5, 0, -12], k);
          p[1] = contactPoint[1] + Math.sin(Math.min(k, 1) * Math.PI * 0.85) * 5.5;
          return p;
        }}
      />
      <Celebration clock={clock} at={CONTACT + 0.9} origin={[3.5, 5, -8]} count={110} size={2.4} />
      <Lightning clock={clock} at={CONTACT} duration={1.2} center={contactPoint} color="#ffe14d" />
      <GlowRing target={batter} clock={clock} at={CONTACT} color="#ffe14d" />
    </>
  );
}
