/// <reference types="@react-three/fiber" />
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function ParticleField() {
  const { scene } = useThree();
  const pointsRef = useRef<THREE.Points | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Listen to mouse on window
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Build particles imperatively to avoid JSX type issues
  useEffect(() => {
    const count = 2200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorA = new THREE.Color('#4f72f5');
    const colorB = new THREE.Color('#9c6cde');
    const colorC = new THREE.Color('#a0b4ff');

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2.6 + (Math.random() - 0.5) * 0.5;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const t = Math.random();
      const c = t < 0.5
        ? colorA.clone().lerp(colorB, t * 2)
        : colorB.clone().lerp(colorC, (t - 0.5) * 2);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const material = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    pointsRef.current = points;
    scene.add(points);

    return () => {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    };
  }, [scene]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    pointsRef.current.rotation.y = t * 0.07;
    pointsRef.current.rotation.x = THREE.MathUtils.lerp(
      pointsRef.current.rotation.x,
      mouseRef.current.y * 0.25,
      0.04
    );
    pointsRef.current.rotation.z = THREE.MathUtils.lerp(
      pointsRef.current.rotation.z,
      mouseRef.current.x * 0.1,
      0.04
    );
  });

  return null; // imperative — no JSX elements needed
}

export default function ParticleGlobe() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <Float speed={1.2} rotationIntensity={0} floatIntensity={0.4}>
        <ParticleField />
      </Float>
    </Canvas>
  );
}
