"use client";

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, Float } from '@react-three/drei';
import { Group } from 'three';

// Minimal Sport Model for Carousel Background
function MinimalSportModel({ url, position, scale = 0.5, rotationSpeed = 0.005 }: {
  url: string;
  position: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
}) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<Group>(null);

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={modelRef} position={position} scale={scale}>
        <primitive object={scene.clone()} />
      </group>
    </Float>
  );
}

// Carousel Background 3D Scene Component
export default function CarouselBackground3D() {
  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      pointerEvents: 'none',
      opacity: 0.3,
      zIndex: 1
    }}>
      <Canvas
        camera={{ position: [0, 3, 8], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          {/* Subtle Lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={0.5} />

          {/* Environment for reflections - with fallback */}
          <Environment background={false} preset="dawn" />
          
          {/* Fallback lighting if environment fails */}
          <hemisphereLight intensity={0.2} />
          <pointLight position={[0, 10, 0]} intensity={0.3} />

          {/* Subtle Sports Models in Background */}
          <MinimalSportModel 
            url="/models/football.glb" 
            position={[-10, 0, -5]} 
            scale={0.8}
            rotationSpeed={0.003}
          />
          
          <MinimalSportModel 
            url="/models/badminton.glb" 
            position={[10, 1, -6]} 
            scale={0.6}
            rotationSpeed={-0.004}
          />

          {/* Floating particles for atmosphere */}
          <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.2}>
            <mesh position={[-12, 2, -8]} scale={0.2}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.4} />
            </mesh>
          </Float>

          <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.3}>
            <mesh position={[12, -1, -7]} scale={0.15}>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
            </mesh>
          </Float>

          {/* Very slow auto-rotation */}
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            enableRotate={false}
            autoRotate
            autoRotateSpeed={0.1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload models
useGLTF.preload('/models/football.glb');
useGLTF.preload('/models/badminton.glb');
