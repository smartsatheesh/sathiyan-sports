"use client";

import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, Float, Text3D, Center } from '@react-three/drei';
import { Group, Mesh } from 'three';

// Enhanced Sport Model Component with hover effects
function SportModel({ url, position, scale = 1, rotationSpeed = 0.01 }: {
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
        modelRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });

  return (
    <Float 
      speed={hovered ? 2 : 1.5} 
      rotationIntensity={hovered ? 0.4 : 0.2} 
      floatIntensity={hovered ? 0.8 : 0.5}
    >
      <group 
        ref={modelRef} 
        position={position} 
        scale={hovered ? scale * 1.1 : scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <primitive object={scene.clone()} />
        
        {/* Add a subtle glow effect when hovered */}
        {hovered && (
          <pointLight 
            position={[0, 0, 0]} 
            intensity={0.8} 
            color="#ffffff" 
            distance={5}
          />
        )}
      </group>
    </Float>
  );
}

// Main 3D Scene Component
export default function ThreeJSSportsScene() {
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 2, 10], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          {/* Enhanced Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.4} />
          <spotLight position={[0, 15, 0]} intensity={0.8} angle={0.3} penumbra={1} />

          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* Sports Equipment - Full screen optimized positioning */}
          {/* Football - Left side */}
          <SportModel 
            url="/models/football.glb" 
            position={[-4, 0, 0]} 
            scale={1.8}
            rotationSpeed={0.015}
          />
          
          {/* Badminton Racket - Right side with full visibility */}
          <SportModel 
            url="/models/badminton.glb" 
            position={[4, 0, 0]} 
            scale={2.2}
            rotationSpeed={-0.015}
          />

          {/* Center rotating sports ball - perfectly centered */}
          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
            <mesh position={[0, 0, 0]} scale={0.8}>
              <sphereGeometry args={[1, 32, 32]} />
              <meshStandardMaterial 
                color="#FF6200" 
                transparent 
                opacity={0.95}
                emissive="#FF6200"
                emissiveIntensity={0.15}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>
          </Float>

          {/* Floating elements - positioned for full screen */}
          <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.2}>
            <mesh position={[-7, 2, -4]} scale={0.3}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial color="#ff6b6b" transparent opacity={0.4} />
            </mesh>
          </Float>

          <Float speed={1.8} rotationIntensity={0.08} floatIntensity={0.3}>
            <mesh position={[7, -1, -3]} scale={0.25}>
              <boxGeometry args={[0.6, 0.6, 0.6]} />
              <meshStandardMaterial color="#4ecdc4" transparent opacity={0.3} />
            </mesh>
          </Float>

          <Float speed={2} rotationIntensity={0.1} floatIntensity={0.4}>
            <mesh position={[0, 4, -6]} scale={0.2}>
              <cylinderGeometry args={[0.4, 0.4, 0.8, 8]} />
              <meshStandardMaterial color="#45b7d1" transparent opacity={0.3} />
            </mesh>
          </Float>

          {/* Enhanced Controls for full screen */}
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.4}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3}
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
