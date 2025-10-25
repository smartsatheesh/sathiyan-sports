"use client";

import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, Float } from '@react-three/drei';
import { Group } from 'three';

// Simple 3D Loading component for use inside Canvas
function ThreeLoader() {
  return (
    <group>
      <ambientLight intensity={0.4} />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#2196F3" wireframe />
      </mesh>
    </group>
  );
}

// Optimized Sport Model for centered display
function CenteredSportModel({ url, position, scale = 1, rotationSpeed = 0.01 }: {
  url: string;
  position: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
}) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (modelRef.current) {
      // Continuous rotation
      modelRef.current.rotation.y += rotationSpeed;
      
      // Add subtle hover animation
      if (hovered) {
        modelRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      }
    }
  });

  return (
    <Float 
      speed={hovered ? 2.5 : 1.8} 
      rotationIntensity={hovered ? 0.5 : 0.3} 
      floatIntensity={hovered ? 1.0 : 0.6}
    >
      <group 
        ref={modelRef} 
        position={position} 
        scale={hovered ? scale * 1.15 : scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <primitive object={scene.clone()} />
        
        {/* Enhanced glow effect when hovered */}
        {hovered && (
          <>
            <pointLight 
              position={[0, 0, 0]} 
              intensity={1.2} 
              color="#ffffff" 
              distance={8}
            />
            <pointLight 
              position={[0, 2, 0]} 
              intensity={0.6} 
              color="#2196F3" 
              distance={5}
            />
          </>
        )}
      </group>
    </Float>
  );
}

// Centered 3D Sports Scene Component
export default function CenteredSportsScene() {
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [-1, 1, 10], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={<ThreeLoader />}>
          {/* Enhanced Lighting for centered display */}
          <ambientLight intensity={0.7} />
          <directionalLight position={[8, 8, 5]} intensity={1.4} castShadow />
          <pointLight position={[-8, -8, -8]} intensity={0.5} />
          <spotLight 
            position={[0, 12, 0]} 
            intensity={1.0} 
            angle={0.4} 
            penumbra={1} 
            castShadow
          />

          {/* Environment for reflections - with fallback */}
          <Environment background={false} preset="sunset" />
          
          {/* Fallback lighting if environment fails */}
          <hemisphereLight intensity={0.15} />
          <pointLight position={[0, 8, 0]} intensity={0.25} />

          {/* Sports Equipment - Better positioning for bat visibility */}
          {/* Football - Left side */}
          <CenteredSportModel 
            url="/models/football.glb" 
            position={[-3, -0.5, 0]} 
            scale={1.4}
            rotationSpeed={0.02}
          />
          
          {/* Badminton Racket - Right side, brought down for visibility */}
          <CenteredSportModel 
            url="/models/badminton.glb" 
            position={[3, -1.2, 0]} 
            scale={1.8}
            rotationSpeed={-0.02}
          />

          {/* Center rotating sports ball - slightly left */}
          <Float speed={2.5} rotationIntensity={0.3} floatIntensity={0.6}>
            <mesh position={[-0.5, 0.5, 0]} scale={0.6}>
              <sphereGeometry args={[1, 24, 24]} />
              <meshStandardMaterial 
                color="#FF9800" 
                transparent 
                opacity={0.9}
                emissive="#FF9800"
                emissiveIntensity={0.2}
                roughness={0.3}
                metalness={0.7}
              />
            </mesh>
          </Float>

          {/* Floating decorative elements - repositioned */}
          <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
            <mesh position={[-6, 2, -3]} scale={0.2}>
              <sphereGeometry args={[0.3, 12, 12]} />
              <meshStandardMaterial 
                color="#ff6b6b" 
                transparent 
                opacity={0.4}
                emissive="#ff6b6b"
                emissiveIntensity={0.1}
              />
            </mesh>
          </Float>

          <Float speed={1.8} rotationIntensity={0.1} floatIntensity={0.2}>
            <mesh position={[6, 1.5, -3]} scale={0.15}>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshStandardMaterial 
                color="#4ecdc4" 
                transparent 
                opacity={0.3}
                emissive="#4ecdc4"
                emissiveIntensity={0.05}
              />
            </mesh>
          </Float>

          <Float speed={2.2} rotationIntensity={0.2} floatIntensity={0.4}>
            <mesh position={[0, 3, -4]} scale={0.12}>
              <cylinderGeometry args={[0.15, 0.15, 0.6, 6]} />
              <meshStandardMaterial 
                color="#45b7d1" 
                transparent 
                opacity={0.3}
                emissive="#45b7d1"
                emissiveIntensity={0.1}
              />
            </mesh>
          </Float>

          {/* Enhanced Controls for better viewing */}
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 1.4}
            minPolarAngle={Math.PI / 4}
            maxAzimuthAngle={Math.PI / 2}
            minAzimuthAngle={-Math.PI / 2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload models
useGLTF.preload('/models/football.glb');
useGLTF.preload('/models/badminton.glb');
