'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF } from '@react-three/drei';
import { Suspense } from 'react';
import styles from './page.module.css';
import Layout from './components/Layout';
import { Divider } from '@mui/material';
import Link from 'next/link';


function BadmintonModel() {
  const { scene } = useGLTF('/models/badminton.glb');
  return <primitive object={scene} scale={1.5} position={[-2, 0, 0]} />;
}

function FootballModel() {
  const { scene } = useGLTF('/models/football.glb');
  return <primitive object={scene} scale={1.5} position={[2, 0, 0]} />;
}

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set a flag once we know we're on the client side
    setIsClient(true);
  }, []);

  return (
    
    <div className={styles.page}>
      <main className={styles.main}>
        <div>
          <h1 className={styles.heading}>WELCOME TO SATHIYAN SPORTS</h1>
        <p className={styles.subtext}>
          Experience our dynamic multisport environment  <br /> Now in Madurai Perungudi!
        </p>
        </div>
        <div>
          <div className='registerpagenavbarr'>
          <Link
            href="/register"
            className="ml-4 px-4 py-2 rounded bg-white text-blue-700 text-sm font-medium hover:bg-blue-100 border border-blue-500"
          >
            REGISTER NOW
          </Link>
        </div>
        </div>

        {/* <div className={styles.canvasContainer}>
          {isClient && (
            <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[2, 5, 5]} intensity={1} />
              <Suspense fallback={null}>
                <Stage environment="city" intensity={0.6}>
                  <BadmintonModel />
                
                  <FootballModel />
                </Stage>
                <OrbitControls enableZoom={false} />
              </Suspense>
            </Canvas>
          )}
        </div> */}
      </main>
    </div>
  
  );
}
