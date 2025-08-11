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
      // Continuous rotation - more visible
      modelRef.current.rotation.y += rotationSpeed;
      
      // Enhanced action animation - especially for football
      if (url.includes('football')) {
        // Football action: smaller, more subtle movements
        modelRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.8) * 0.15;
        modelRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 0.6) * 0.2;
        modelRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.2) * 0.15;
        modelRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 1.0) * 0.1;
      } else {
        // Other models: subtle bounce animation
        modelRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
        modelRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
      }
      
      // Add gentle scale breathing effect
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      modelRef.current.scale.setScalar((hovered ? scale * 1.1 : scale) * breathe);
    }
  });

  return (
    <Float 
      speed={hovered ? 3 : (url.includes('football') ? 2.0 : 2)} 
      rotationIntensity={hovered ? 0.6 : (url.includes('football') ? 0.3 : 0.3)} 
      floatIntensity={hovered ? 1.2 : (url.includes('football') ? 0.6 : 0.8)}
    >
      <group 
        ref={modelRef} 
        position={position} 
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <primitive object={scene.clone()} />
        
        {/* Add a subtle glow effect when hovered */}
        {hovered && (
          <pointLight 
            position={[0, 0, 0]} 
            intensity={1.2} 
            color="#ffffff" 
            distance={8}
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
        camera={{ position: [-1, 1, 10], fov: 75 }}
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

          {/* Sports Equipment - Repositioned for better animations */}
          {/* Football - Moved further left with smaller, subtle animation */}
          <SportModel 
            url="/models/football.glb" 
            position={[-7, -0.5, 0]} 
            scale={1.6}
            rotationSpeed={0.02}
          />
          
          {/* Badminton Racket - Right side, brought down for better visibility */}
          <SportModel 
            url="/models/badminton.glb" 
            position={[4, -1.5, 0]} 
            scale={2.5}
            rotationSpeed={-0.02}
          />

          {/* Center rotating sports ball - moved to upper right background */}
          <Float speed={2.5} rotationIntensity={0.3} floatIntensity={0.6}>
            <mesh position={[2, 2.5, -3]} scale={0.6}>
              <sphereGeometry args={[1, 32, 32]} />
              <meshStandardMaterial 
                color="#FF6200" 
                transparent 
                opacity={0.7}
                emissive="#FF6200"
                emissiveIntensity={0.2}
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
