"use client";

import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";

// The club mascot — a chibi cartoon kid (big head, short chunky limbs) with toon shading and
// ink outlines, built from primitives so there are no model files to download. Scenes drive it
// every frame through `applyPose`, so animation code stays declarative.

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
  position?: Vec3; // hips position in world space (feet touch the ground when hips y = HIP_HEIGHT)
  rotationY?: number; // facing
  joints?: Partial<Record<Joint, Vec3>>; // Euler rotations (radians)
}

export interface AthleteHandle {
  applyPose: (pose: Pose) => void;
  root: THREE.Group | null;
}

export interface Kit {
  shirt: string;
  trim: string; // collar, cuffs, sock stripes and the badge ink
  panel?: string; // side panels and waist band (cricket whites)
  shorts: string;
  long?: boolean; // full-length trousers instead of shorts and socks
  socks: string;
  skin: string;
  hair: string;
  cap?: string;
  shoes: string;
  laces: string;
  wristbands?: string;
  badge: "club" | "star";
  number?: string; // printed on the back
}

/** Football / badminton: the yellow Sathiyan Multisport Club kit. */
export const MASCOT_KIT: Kit = {
  shirt: "#ffe11a",
  trim: "#1c1c1c",
  shorts: "#1c1c1c",
  socks: "#f4f1ea",
  skin: "#f5c39e",
  hair: "#5a3416",
  shoes: "#1a1a1a",
  laces: "#ffffff",
  badge: "club",
};

/** Cricket: sky-blue coloured clothing with white panels, cap and wristbands. */
export const CRICKET_KIT: Kit = {
  shirt: "#4fb0e6",
  trim: "#2b7fc4",
  panel: "#ffffff",
  shorts: "#4fb0e6",
  long: true,
  socks: "#4fb0e6",
  skin: "#f2ab84",
  hair: "#4a2a14",
  cap: "#3b8fd8",
  shoes: "#22296b",
  laces: "#e0313b",
  wristbands: "#ffffff",
  badge: "star",
};

export const HIP_HEIGHT = 0.77;

const INK = "#1d1426";

// Three-band toon ramp shared by every material
const TOON_RAMP = (() => {
  if (typeof document === "undefined") return null;
  const tex = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

const toon = (color: string, extra: THREE.MeshToonMaterialParameters = {}) =>
  new THREE.MeshToonMaterial({ color, gradientMap: TOON_RAMP, ...extra });

/** Inverted-hull outline: the back faces pushed out along their normals, drawn in ink. */
const OUTLINE = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: { color: { value: new THREE.Color(INK) }, thickness: { value: 0.011 } },
  vertexShader:
    "uniform float thickness; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * thickness, 1.0); }",
  fragmentShader: "uniform vec3 color; void main(){ gl_FragColor = vec4(color, 1.0); }",
});

type PartProps = Omit<React.ComponentProps<"mesh">, "geometry" | "material"> & {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  outline?: boolean;
};

/** A body part with its ink outline. */
function Part({ geometry, material, outline = true, children, ...rest }: PartProps) {
  return (
    <mesh geometry={geometry} material={material} {...rest}>
      {outline && <mesh geometry={geometry} material={OUTLINE} />}
      {children}
    </mesh>
  );
}

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Chest badge, drawn on a transparent canvas so the shirt shows through. */
function badgeTexture(kit: Kit) {
  return canvasTexture((ctx, size) => {
    const cx = size / 2;
    if (kit.badge === "star") {
      // yellow star on the left chest (viewer's right)
      ctx.fillStyle = "#ffe14d";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 16 : 36;
        ctx.lineTo(186 + Math.cos(a) * r, 70 + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    const cy = 82;
    ctx.fillStyle = "#f7f3e8";
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = kit.trim;
    ctx.stroke();
    ctx.fillStyle = kit.trim;
    const pentagon = (x: number, y: number, rad: number) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.fill();
    };
    pentagon(cx, cy, 15);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      pentagon(cx + Math.cos(a) * 38, cy + Math.sin(a) * 38, 10);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 44px 'Arial Black', Arial, sans-serif";
    ctx.fillText("SATHIYAN", cx, 168);
    ctx.font = "800 22px Arial, sans-serif";
    ctx.fillText("MULTISPORT CLUB", cx, 204);
  });
}

function numberTexture(kit: Kit) {
  return canvasTexture((ctx, size) => {
    ctx.fillStyle = kit.trim;
    ctx.font = "900 150px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(kit.number || "", size / 2, size / 2 + 8);
  });
}

interface AthleteProps {
  kit?: Kit;
  /** Optional prop held in the right hand (racket, bat); positioned in hand space. */
  rightHandItem?: React.ReactNode;
  scale?: number;
}

const Athlete = forwardRef<AthleteHandle, AthleteProps>(function Athlete({ kit = MASCOT_KIT, rightHandItem, scale = 1 }, ref) {
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

  const mats = useMemo(
    () => ({
      skin: toon(kit.skin),
      shirt: toon(kit.shirt),
      trim: toon(kit.trim),
      panel: toon(kit.panel || kit.shirt),
      shorts: toon(kit.shorts),
      socks: toon(kit.socks),
      hair: toon(kit.hair),
      cap: toon(kit.cap || kit.shirt),
      shoes: toon(kit.shoes),
      laces: toon(kit.laces),
      bands: toon(kit.wristbands || kit.skin),
      white: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
      iris: new THREE.MeshBasicMaterial({ color: "#3a2a22" }),
      pupil: new THREE.MeshBasicMaterial({ color: "#0d0a0a" }),
      mouth: new THREE.MeshBasicMaterial({ color: "#6e1d1d", side: THREE.DoubleSide }),
      tongue: new THREE.MeshBasicMaterial({ color: "#e0565b", side: THREE.DoubleSide }),
      brow: new THREE.MeshBasicMaterial({ color: "#2a1a10" }),
      cheek: new THREE.MeshBasicMaterial({ color: "#ff7b6b", transparent: true, opacity: 0.4, depthWrite: false }),
      badge: new THREE.MeshToonMaterial({ map: badgeTexture(kit), gradientMap: TOON_RAMP, transparent: true }),
      back: kit.number ? new THREE.MeshToonMaterial({ map: numberTexture(kit), gradientMap: TOON_RAMP, transparent: true }) : null,
    }),
    [kit]
  );

  const limb = (len: number, r: number) => new THREE.CapsuleGeometry(r, len, 6, 14);
  const geo = useMemo(
    () => ({
      torso: limb(0.24, 0.2),
      collar: new THREE.TorusGeometry(0.09, 0.022, 8, 22),
      band: new THREE.TorusGeometry(0.215, 0.03, 8, 30),
      sidePanel: limb(0.26, 0.032),
      head: new THREE.SphereGeometry(0.22, 36, 28),
      hairCap: new THREE.SphereGeometry(0.236, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
      lock: new THREE.SphereGeometry(0.085, 14, 10),
      tuft: new THREE.ConeGeometry(0.045, 0.16, 10),
      capDome: new THREE.SphereGeometry(0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      capBrim: new THREE.CylinderGeometry(0.31, 0.31, 0.022, 32, 1, false, -Math.PI / 2, Math.PI),
      capButton: new THREE.SphereGeometry(0.026, 10, 8),
      eye: new THREE.SphereGeometry(0.06, 20, 16),
      iris: new THREE.CircleGeometry(0.036, 24),
      pupil: new THREE.CircleGeometry(0.019, 18),
      glint: new THREE.CircleGeometry(0.012, 10),
      brow: limb(0.06, 0.014),
      nose: new THREE.SphereGeometry(0.028, 12, 10),
      mouth: new THREE.CircleGeometry(0.07, 24, Math.PI, Math.PI),
      teeth: new THREE.PlaneGeometry(0.11, 0.02),
      tongue: new THREE.CircleGeometry(0.032, 16, Math.PI, Math.PI),
      ear: new THREE.SphereGeometry(0.052, 12, 10),
      cheek: new THREE.CircleGeometry(0.032, 14),
      sleeve: new THREE.CylinderGeometry(0.082, 0.09, 0.13, 16),
      cuff: new THREE.TorusGeometry(0.088, 0.015, 8, 18),
      upperArm: limb(0.14, 0.064),
      foreArm: limb(0.13, 0.058),
      wristband: new THREE.CylinderGeometry(0.066, 0.066, 0.06, 16),
      hand: new THREE.SphereGeometry(0.078, 16, 12),
      thigh: limb(0.2, 0.086),
      shortsLeg: new THREE.CylinderGeometry(0.115, 0.125, 0.2, 16),
      trouserLeg: limb(0.2, 0.1),
      shin: limb(0.19, 0.074),
      trouserShin: limb(0.19, 0.088),
      sockStripe: new THREE.TorusGeometry(0.076, 0.013, 8, 18),
      shoe: limb(0.12, 0.078),
      lace: new THREE.BoxGeometry(0.07, 0.012, 0.016),
      shorts: new THREE.CylinderGeometry(0.21, 0.225, 0.2, 18),
      plate: new THREE.PlaneGeometry(0.32, 0.32),
    }),
    []
  );

  return (
    <group ref={root} scale={scale}>
      {/* hips */}
      <Part geometry={geo.shorts} material={mats.shorts} position={[0, 0.02, 0]} />
      <group ref={bind("spine")}>
        <Part geometry={geo.torso} material={mats.shirt} position={[0, 0.3, 0]} scale={[1.1, 1, 0.84]} />
        <Part geometry={geo.plate} material={mats.badge} position={[0, 0.34, 0.172]} outline={false} />
        {mats.back && <Part geometry={geo.plate} material={mats.back} position={[0, 0.34, -0.172]} rotation={[0, Math.PI, 0]} outline={false} />}
        <Part geometry={geo.collar} material={mats.trim} position={[0, 0.555, 0.012]} rotation={[Math.PI / 2 - 0.15, 0, 0]} />
        {kit.panel && (
          <>
            <Part geometry={geo.band} material={mats.panel} position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.1, 0.84, 1]} />
            {[-1, 1].map((s) => (
              <Part key={s} geometry={geo.sidePanel} material={mats.panel} position={[0.205 * s, 0.33, 0]} />
            ))}
          </>
        )}

        {/* big cartoon head; the face looks along +Z */}
        <group ref={bind("neck")} position={[0, 0.56, 0]}>
          <group position={[0, 0.27, 0.01]} scale={1.25}>
            <Part geometry={geo.head} material={mats.skin} scale={[1, 0.97, 0.94]} />
            {/* hair: a cap tipped back, a fringe of locks and the signature tuft */}
            <Part geometry={geo.hairCap} material={mats.hair} rotation={[-0.5, 0, 0]} position={[0, 0.02, -0.012]} scale={[1.04, 1, 1.02]} />
            {[-0.15, -0.075, 0, 0.075, 0.15].map((x, i) => (
              <Part
                key={x}
                geometry={geo.lock}
                material={mats.hair}
                outline={false}
                position={[x, 0.135 - Math.abs(x) * 0.3 + (i % 2) * 0.014, 0.165 - Math.abs(x) * 0.4]}
                scale={[1, 0.6, 0.72]}
                rotation={[0.55, 0, -x * 2.5]}
              />
            ))}
            {[-1, 1].map((s) => (
              <Part key={s} geometry={geo.lock} material={mats.hair} outline={false} position={[0.19 * s, 0.08, -0.05]} scale={[0.6, 0.95, 1.15]} rotation={[0, 0, 0.3 * s]} />
            ))}
            {kit.cap ? (
              <group rotation={[-0.22, 0, 0]} position={[0, 0.03, 0]}>
                <Part geometry={geo.capDome} material={mats.cap} />
                <Part geometry={geo.capBrim} material={mats.cap} position={[0, 0.0, 0.07]} rotation={[0.14, 0, 0]} scale={[0.72, 1, 1]} />
                <Part geometry={geo.capButton} material={mats.cap} position={[0, 0.25, 0]} />
              </group>
            ) : (
              <>
                <Part geometry={geo.tuft} material={mats.hair} position={[0.035, 0.25, -0.03]} rotation={[-0.35, 0, -0.45]} />
                <Part geometry={geo.tuft} material={mats.hair} position={[-0.015, 0.255, -0.06]} rotation={[-0.6, 0, 0.25]} scale={0.85} />
              </>
            )}
            {[-1, 1].map((s) => (
              <group key={s}>
                <Part geometry={geo.ear} material={mats.skin} position={[0.214 * s, -0.01, 0]} scale={[0.5, 0.95, 0.75]} />
                {/* big round eye: white ball, dark iris and pupil decals, a catch-light */}
                <Part geometry={geo.eye} material={mats.white} position={[0.08 * s, 0.0, 0.17]} scale={[0.95, 1.12, 0.62]} />
                <group position={[0.078 * s, -0.004, 0.209]}>
                  <mesh geometry={geo.iris} material={mats.iris} scale={[1, 1.1, 1]} />
                  <mesh geometry={geo.pupil} material={mats.pupil} position={[0, 0, 0.001]} />
                  <mesh geometry={geo.glint} material={mats.white} position={[-0.012, 0.016, 0.002]} />
                </group>
                <mesh geometry={geo.brow} material={mats.brow} position={[0.082 * s, 0.088, 0.196]} rotation={[0, 0, Math.PI / 2 - 0.22 * s]} />
                <mesh geometry={geo.cheek} material={mats.cheek} position={[0.135 * s, -0.065, 0.166]} rotation={[0, 0.65 * s, 0]} />
              </group>
            ))}
            <Part geometry={geo.nose} material={mats.skin} position={[0, -0.036, 0.208]} outline={false} />
            {/* big open smile with teeth and tongue */}
            <group position={[0, -0.078, 0.201]} rotation={[-0.28, 0, 0]}>
              <mesh geometry={geo.mouth} material={mats.mouth} />
              <mesh geometry={geo.teeth} material={mats.white} position={[0, -0.009, 0.001]} />
              <mesh geometry={geo.tongue} material={mats.tongue} position={[0, -0.04, 0.001]} rotation={[0, 0, Math.PI]} scale={[1, 0.6, 1]} />
            </group>
          </group>
        </group>

        {/* arms: pivot at shoulder, hang down -Y; short sleeves with cuffs */}
        {(["l", "r"] as const).map((side) => (
          <group key={side} ref={bind(`${side}Shoulder` as Joint)} position={[side === "l" ? 0.25 : -0.25, 0.46, 0]}>
            <Part geometry={geo.sleeve} material={mats.shirt} position={[0, -0.04, 0]} />
            <Part geometry={geo.cuff} material={kit.panel ? mats.panel : mats.trim} position={[0, -0.105, 0]} rotation={[Math.PI / 2, 0, 0]} outline={false} />
            <Part geometry={geo.upperArm} material={mats.skin} position={[0, -0.11, 0]} />
            <group ref={bind(`${side}Elbow` as Joint)} position={[0, -0.24, 0]}>
              <Part geometry={geo.foreArm} material={mats.skin} position={[0, -0.1, 0]} />
              {kit.wristbands && <Part geometry={geo.wristband} material={mats.bands} position={[0, -0.18, 0]} />}
              <group position={[0, -0.235, 0]}>
                <Part geometry={geo.hand} material={mats.skin} scale={[0.9, 1, 1]} />
                {side === "r" && rightHandItem}
              </group>
            </group>
          </group>
        ))}
      </group>

      {/* legs: pivot at hip */}
      {(["l", "r"] as const).map((side) => (
        <group key={side} ref={bind(`${side}Hip` as Joint)} position={[side === "l" ? 0.11 : -0.11, -0.04, 0]}>
          {kit.long ? (
            <Part geometry={geo.trouserLeg} material={mats.shorts} position={[0, -0.15, 0]} />
          ) : (
            <>
              <Part geometry={geo.shortsLeg} material={mats.shorts} position={[0, -0.07, 0]} />
              <Part geometry={geo.thigh} material={mats.skin} position={[0, -0.16, 0]} />
            </>
          )}
          <group ref={bind(`${side}Knee` as Joint)} position={[0, -0.33, 0]}>
            {kit.long ? (
              <Part geometry={geo.trouserShin} material={mats.shorts} position={[0, -0.14, 0]} />
            ) : (
              <>
                <Part geometry={geo.shin} material={mats.socks} position={[0, -0.15, 0]} />
                <Part geometry={geo.sockStripe} material={mats.trim} position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]} outline={false} />
                <Part geometry={geo.sockStripe} material={mats.trim} position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]} outline={false} />
              </>
            )}
            <group position={[0, -0.33, 0.05]}>
              <Part geometry={geo.shoe} material={mats.shoes} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.72]} />
              {[0, 0.035].map((z) => (
                <mesh key={z} geometry={geo.lace} material={mats.laces} position={[0, 0.05, 0.03 + z]} rotation={[0.3, 0, 0]} />
              ))}
            </group>
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
