/// <reference types="@react-three/fiber" />
import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function CivicGlobe() {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    const radius = 3.0;

    // 1. Soft Glowing Core
    const coreGeo = new THREE.SphereGeometry(radius * 0.65, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x01757A, // Deep Teal
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // 2. Dense Particle Cloud
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const colorTeal = new THREE.Color(0x01757A); // Deep Teal
    const colorOrange = new THREE.Color(0xE57734); // Vibrant Orange

    for (let i = 0; i < particleCount; i++) {
      // Random distribution in a spherical shell (between 60% and 100% of radius)
      const r = radius * (0.6 + Math.random() * 0.4); 
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Mix colors: 70% Teal, 30% Orange
      const color = Math.random() > 0.3 ? colorTeal : colorOrange;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom circle texture for soft dots
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    if (context) {
      context.beginPath();
      context.arc(8, 8, 8, 0, Math.PI * 2);
      context.fillStyle = 'white';
      context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);

    const particlesMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      map: texture,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    group.add(particleSystem);

    return () => {
      scene.remove(group);
      coreGeo.dispose();
      coreMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      texture.dispose();
    };
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    
    // Slow, premium rotation
    groupRef.current.rotation.y = t * 0.04;
    
    // Smooth interactive tilt
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      mouseRef.current.y * 0.2 + (t * 0.02),
      0.05
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      mouseRef.current.x * 0.1,
      0.05
    );
  });

  return null;
}

export default function ParticleGlobe() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8.5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <Float speed={1.0} rotationIntensity={0.1} floatIntensity={0.3}>
        <CivicGlobe />
      </Float>
    </Canvas>
  );
}
