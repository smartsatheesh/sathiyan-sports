"use client";

import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";

// A stylised, faceless low-poly athlete built from primitives — no model files to download.
// Scenes drive it every frame through `applyPose`, so animation code stays declarative.

export type Vec3 = [number, number, number];

export type Joint =
  | "spine"
  | "neck"
  | "lShoulder"
  | "lElbow"
  | "rShoulder"
  | "rElbow"
  | "lHip"
  | "lKnee"
  | "rHip"
  | "rKnee";

export interface Pose {
  position?: Vec3; // hips position in world space (feet touch ground at y≈0 when hips y=0.95)
  rotationY?: number; // facing
  joints?: Partial<Record<Joint, Vec3>>; // Euler rotations (radians)
}

export interface AthleteHandle {
  applyPose: (pose: Pose) => void;
  root: THREE.Group | null;
}

export interface Kit {
  shirt: string;
  shorts: string;
  socks?: string;
  skin?: string;
  hair?: string;
  number?: string;
  numberColor?: string;
  stripes?: string; // vertical stripe colour on the shirt (e.g. sky-blue/white)
}

export const HIP_HEIGHT = 0.95;

function numberTexture(text: string, color: string, stripes?: string, base?: string) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base || "#ffffff";
  ctx.fillRect(0, 0, size, size);
  if (stripes) {
    ctx.fillStyle = stripes;
    for (let x = 0; x < size; x += 64) ctx.fillRect(x + 32, 0, 32, size);
  }
  ctx.fillStyle = color;
  ctx.font = "bold 150px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.strokeText(text, size / 2, size / 2 + 8);
  ctx.fillText(text, size / 2, size / 2 + 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface AthleteProps {
  kit: Kit;
  /** Optional prop held in the right hand (racket, bat); positioned in hand space. */
  rightHandItem?: React.ReactNode;
  scale?: number;
}

const Athlete = forwardRef<AthleteHandle, AthleteProps>(function Athlete({ kit, rightHandItem, scale = 1 }, ref) {
  const root = useRef<THREE.Group>(null);
  const joints = useRef<Partial<Record<Joint, THREE.Group | null>>>({});
  const bind = (name: Joint) => (g: THREE.Group | null) => {
    joints.current[name] = g;
  };

  useImperativeHandle(ref, () => ({
    root: root.current,
    applyPose(pose: Pose) {
      if (!root.current) return;
      if (pose.position) root.current.position.set(...pose.position);
      if (pose.rotationY !== undefined) root.current.rotation.y = pose.rotationY;
      if (pose.joints) {
        for (const [name, rot] of Object.entries(pose.joints) as [Joint, Vec3][]) {
          joints.current[name]?.rotation.set(rot[0], rot[1], rot[2]);
        }
      }
    },
  }));

  const mats = useMemo(() => {
    const skin = new THREE.MeshStandardMaterial({ color: kit.skin || "#b9825a", roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: kit.shirt, roughness: 0.55 });
    const shorts = new THREE.MeshStandardMaterial({ color: kit.shorts, roughness: 0.6 });
    const socks = new THREE.MeshStandardMaterial({ color: kit.socks || kit.shorts, roughness: 0.6 });
    const hair = new THREE.MeshStandardMaterial({ color: kit.hair || "#1b1410", roughness: 0.9 });
    const boots = new THREE.MeshStandardMaterial({ color: "#111111", roughness: 0.4 });
    const back = kit.number
      ? new THREE.MeshStandardMaterial({ map: numberTexture(kit.number, kit.numberColor || "#ffffff", kit.stripes, kit.shirt), roughness: 0.55 })
      : null;
    const front = kit.stripes
      ? new THREE.MeshStandardMaterial({ map: numberTexture("", kit.numberColor || "#fff", kit.stripes, kit.shirt), roughness: 0.55 })
      : null;
    return { skin, shirt, shorts, socks, hair, boots, back, front };
  }, [kit]);

  const limb = (len: number, r: number) => new THREE.CapsuleGeometry(r, len, 4, 10);
  const geo = useMemo(
    () => ({
      torso: limb(0.32, 0.17),
      head: new THREE.SphereGeometry(0.13, 20, 16),
      hairCap: new THREE.SphereGeometry(0.135, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.1),
      upperArm: limb(0.2, 0.055),
      foreArm: limb(0.18, 0.048),
      hand: new THREE.SphereGeometry(0.055, 12, 10),
      thigh: limb(0.3, 0.075),
      shin: limb(0.28, 0.06),
      boot: new THREE.BoxGeometry(0.11, 0.07, 0.24),
      shorts: new THREE.CylinderGeometry(0.19, 0.2, 0.2, 14),
      plate: new THREE.PlaneGeometry(0.26, 0.26),
    }),
    []
  );

  return (
    <group ref={root} scale={scale}>
      {/* hips */}
      <mesh geometry={geo.shorts} material={mats.shorts} position={[0, 0.02, 0]} />
      <group ref={bind("spine")}>
        <mesh geometry={geo.torso} material={mats.shirt} position={[0, 0.32, 0]} scale={[1.15, 1, 0.75]} />
        {mats.back && <mesh geometry={geo.plate} material={mats.back} position={[0, 0.36, -0.132]} rotation={[0, Math.PI, 0]} />}
        {mats.front && <mesh geometry={geo.plate} material={mats.front} position={[0, 0.34, 0.132]} />}
        <group ref={bind("neck")} position={[0, 0.62, 0]}>
          <mesh geometry={geo.head} material={mats.skin} position={[0, 0.1, 0]} />
          <mesh geometry={geo.hairCap} material={mats.hair} position={[0, 0.12, -0.01]} rotation={[-0.25, 0, 0]} />
        </group>

        {/* arms: pivot at shoulder, hang down -Y */}
        {(["l", "r"] as const).map((side) => (
          <group key={side} ref={bind(`${side}Shoulder` as Joint)} position={[side === "l" ? 0.24 : -0.24, 0.52, 0]}>
            <mesh geometry={geo.upperArm} material={mats.shirt} position={[0, -0.13, 0]} />
            <group ref={bind(`${side}Elbow` as Joint)} position={[0, -0.28, 0]}>
              <mesh geometry={geo.foreArm} material={mats.skin} position={[0, -0.12, 0]} />
              <group position={[0, -0.27, 0]}>
                <mesh geometry={geo.hand} material={mats.skin} />
                {side === "r" && rightHandItem}
              </group>
            </group>
          </group>
        ))}
      </group>

      {/* legs: pivot at hip */}
      {(["l", "r"] as const).map((side) => (
        <group key={side} ref={bind(`${side}Hip` as Joint)} position={[side === "l" ? 0.1 : -0.1, -0.04, 0]}>
          <mesh geometry={geo.thigh} material={mats.shorts} position={[0, -0.2, 0]} />
          <group ref={bind(`${side}Knee` as Joint)} position={[0, -0.43, 0]}>
            <mesh geometry={geo.shin} material={mats.socks} position={[0, -0.2, 0]} />
            <mesh geometry={geo.boot} material={mats.boots} position={[0, -0.44, 0.05]} />
          </group>
        </group>
      ))}
    </group>
  );
});

export default Athlete;

// ---------- small animation helpers shared by the scenes ----------

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ease = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** Progress of t through [start, end], eased. */
export const phase = (t: number, start: number, end: number) => ease((t - start) / (end - start));

/** Blend two joint maps (missing joints treated as zero rotation). */
export function blendJoints(a: Pose["joints"] = {}, b: Pose["joints"] = {}, t: number): Pose["joints"] {
  const out: Pose["joints"] = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<Joint>;
  keys.forEach((k) => {
    out[k] = lerpV(a[k] || [0, 0, 0], b[k] || [0, 0, 0], t);
  });
  return out;
}

/** Procedural running cycle; `speed` in cycles per second. */
export function runCycle(time: number, speed = 1.6, intensity = 1): Pose["joints"] {
  const s = Math.sin(time * Math.PI * 2 * speed);
  const c = Math.cos(time * Math.PI * 2 * speed);
  const k = intensity;
  return {
    spine: [0.18 * k, 0, 0],
    lHip: [-0.75 * s * k, 0, 0],
    rHip: [0.75 * s * k, 0, 0],
    lKnee: [Math.max(0, 1.1 * c) * k + 0.15, 0, 0],
    rKnee: [Math.max(0, -1.1 * c) * k + 0.15, 0, 0],
    lShoulder: [0.7 * s * k, 0, 0.12],
    rShoulder: [-0.7 * s * k, 0, -0.12],
    lElbow: [-1.1 * k, 0, 0],
    rElbow: [-1.1 * k, 0, 0],
  };
}

export const IDLE: Pose["joints"] = {
  lShoulder: [0, 0, 0.12],
  rShoulder: [0, 0, -0.12],
  lElbow: [-0.2, 0, 0],
  rElbow: [-0.2, 0, 0],
  lKnee: [0.05, 0, 0],
  rKnee: [0.05, 0, 0],
};
