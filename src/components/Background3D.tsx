import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function DataWave() {
  const ref = useRef<THREE.Points>(null);
  
  const count = 100;
  const separation = 0.2;
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * count * 3);
    const colors = new Float32Array(count * count * 3);
    
    let i = 0;
    for (let ix = 0; ix < count; ix++) {
      for (let iy = 0; iy < count; iy++) {
        positions[i] = ix * separation - ((count * separation) / 2); // x
        positions[i + 1] = 0; // y
        positions[i + 2] = iy * separation - ((count * separation) / 2); // z
        
        // Indigo color
        colors[i] = 0.39; // r
        colors[i + 1] = 0.40; // g
        colors[i + 2] = 0.95; // b
        
        i += 3;
      }
    }
    return [positions, colors];
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    
    const time = state.clock.getElapsedTime();
    const positions = ref.current.geometry.attributes.position.array as Float32Array;
    
    let i = 0;
    for (let ix = 0; ix < count; ix++) {
      for (let iy = 0; iy < count; iy++) {
        // Create a wave effect
        positions[i + 1] = 
          (Math.sin((ix + time) * 0.3) * 0.5) + 
          (Math.sin((iy + time) * 0.5) * 0.5);
        i += 3;
      }
    }
    
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.y = time * 0.02;
  });

  return (
    <points ref={ref} rotation={[Math.PI / 6, 0, 0]} position={[0, -2, -5]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

export default function Background3D() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none opacity-30 dark:opacity-20 transition-opacity duration-1000">
      <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
        <DataWave />
      </Canvas>
    </div>
  );
}
