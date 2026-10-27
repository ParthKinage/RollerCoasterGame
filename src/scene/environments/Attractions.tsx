import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { TrackPath } from '../../track/trackPath';
import { useDisposable } from '../geometry';

const GONDOLA_COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#e9c46a', '#9b5de5', '#f15bb5', '#00bbf9'];

export function FerrisWheel({ position, rotation = 0, neon = false, radius = 22 }: { position: [number, number, number]; rotation?: number; neon?: boolean; radius?: number }) {
  const wheel = useRef<THREE.Group>(null);
  const gondolas = useRef<THREE.Group[]>([]);
  const count = 16;
  const frameMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: neon ? '#e8e8ff' : '#f2f2f2', metalness: 0.6, roughness: 0.35 }), [neon]);
  const lightMat = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: new THREE.Color(neon ? '#ff4fd8' : '#ffd36b'), emissiveIntensity: neon ? 3 : 1.2 }),
    [neon],
  );
  const gondolaMats = useMemo(
    () => GONDOLA_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.3, emissive: new THREE.Color(neon ? c : '#000'), emissiveIntensity: neon ? 0.6 : 0 })),
    [neon],
  );
  useDisposable(() => ({ dispose: () => gondolaMats.forEach((m) => m.dispose()) }), [gondolaMats]);
  const bulbs = useMemo(() => Array.from({ length: 48 }, (_, i) => (i / 48) * Math.PI * 2), []);

  useFrame((_, dt) => {
    if (!wheel.current) return;
    wheel.current.rotation.z += dt * 0.06;
    // keep gondolas hanging downwards
    gondolas.current.forEach((g) => g && (g.rotation.z = -wheel.current!.rotation.z));
  });

  const hub = radius + 4;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* A-frame legs */}
      {[-3, 3].map((z) =>
        [-1, 1].map((side) => (
          <mesh key={`${z}${side}`} material={frameMat} position={[side * hub * 0.28, hub / 2, z]} rotation={[0, 0, side * 0.29]} castShadow>
            <cylinderGeometry args={[0.45, 0.6, hub * 1.05, 8]} />
          </mesh>
        )),
      )}
      <mesh material={frameMat} position={[0, hub, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 7.5, 12]} />
      </mesh>
      <group ref={wheel} position={[0, hub, 0]}>
        {[-2, 2].map((z) => (
          <mesh key={z} material={frameMat} position={[0, 0, z]} castShadow>
            <torusGeometry args={[radius, 0.3, 8, 64]} />
          </mesh>
        ))}
        {Array.from({ length: count }, (_, i) => {
          const a = (i / count) * Math.PI * 2;
          return (
            <group key={i}>
              {[-2, 2].map((z) => (
                <mesh key={z} material={frameMat} position={[Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5, z]} rotation={[0, 0, a + Math.PI / 2]}>
                  <cylinderGeometry args={[0.12, 0.12, radius, 5]} />
                </mesh>
              ))}
              <group position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]} ref={(g) => g && (gondolas.current[i] = g)}>
                <mesh material={gondolaMats[i % gondolaMats.length]} position={[0, -1.6, 0]} castShadow>
                  <boxGeometry args={[2.2, 2.0, 2.4]} />
                </mesh>
                <mesh material={frameMat} position={[0, -0.4, 0]}>
                  <cylinderGeometry args={[0.08, 0.08, 1.2, 4]} />
                </mesh>
                <mesh material={frameMat} position={[0, -0.45, 0]} scale={[1.3, 0.3, 1.4]}>
                  <coneGeometry args={[1.0, 1, 4]} />
                </mesh>
              </group>
            </group>
          );
        })}
        {bulbs.map((a, i) => (
          <mesh key={i} material={lightMat} position={[Math.cos(a) * radius, Math.sin(a) * radius, 2.3]}>
            <sphereGeometry args={[0.22, 6, 4]} />
          </mesh>
        ))}
      </group>
      {neon && <pointLight position={[0, hub, 6]} color="#ff4fd8" intensity={600} distance={80} decay={2} />}
    </group>
  );
}

export function Carousel({ position, neon = false }: { position: [number, number, number]; neon?: boolean }) {
  const top = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (top.current) top.current.rotation.y += dt * 0.4;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <cylinderGeometry args={[9, 9.5, 0.8, 32]} />
        <meshStandardMaterial color="#f1e3c6" roughness={0.6} />
      </mesh>
      <group ref={top}>
        <mesh position={[0, 7.5, 0]} castShadow>
          <coneGeometry args={[10, 4, 16]} />
          <meshStandardMaterial color="#d62839" roughness={0.5} emissive={neon ? '#d62839' : '#000'} emissiveIntensity={neon ? 0.5 : 0} />
        </mesh>
        <mesh position={[0, 5.2, 0]}>
          <cylinderGeometry args={[9.6, 9.6, 1, 16, 1, true]} />
          <meshStandardMaterial color="#ffd166" emissive={neon ? '#ffd166' : '#000'} emissiveIntensity={neon ? 1.2 : 0} side={THREE.DoubleSide} />
        </mesh>
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 6.5, 0, Math.sin(a) * 6.5]}>
              <mesh position={[0, 3, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 4.6, 5]} />
                <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, 2.2, 0]} castShadow>
                <boxGeometry args={[0.6, 1.0, 1.8]} />
                <meshStandardMaterial color={GONDOLA_COLORS[i % GONDOLA_COLORS.length]} />
              </mesh>
            </group>
          );
        })}
      </group>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 6, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export function DropTower({ position, neon = false }: { position: [number, number, number]; neon?: boolean }) {
  const car = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!car.current) return;
    const t = clock.elapsedTime % 12;
    // slow rise, pause, sudden drop
    const y = t < 7 ? 4 + (t / 7) * 46 : t < 9 ? 50 : Math.max(4, 50 - ((t - 9) * (t - 9) * 9.81) / 2);
    car.current.position.y = y;
  });
  return (
    <group position={position}>
      <mesh position={[0, 30, 0]} castShadow>
        <cylinderGeometry args={[1.4, 1.8, 60, 12]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 61, 0]}>
        <coneGeometry args={[2.5, 4, 12]} />
        <meshStandardMaterial color="#1d4ed8" emissive={neon ? '#3b82f6' : '#000'} emissiveIntensity={neon ? 2 : 0} />
      </mesh>
      <group ref={car}>
        <mesh>
          <torusGeometry args={[3, 0.8, 8, 24]} />
          <meshStandardMaterial color="#f59e0b" emissive={neon ? '#f59e0b' : '#000'} emissiveIntensity={neon ? 1.5 : 0} />
        </mesh>
      </group>
    </group>
  );
}

export function Tents({ position, neon = false }: { position: [number, number, number]; neon?: boolean }) {
  const items = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        x: Math.cos(i * 0.9) * (8 + (i % 3) * 7),
        z: Math.sin(i * 0.9) * (8 + (i % 3) * 7),
        color: GONDOLA_COLORS[(i * 3) % GONDOLA_COLORS.length],
        s: 0.8 + (i % 3) * 0.3,
      })),
    [],
  );
  return (
    <group position={position}>
      {items.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[4, 3.2, 4]} />
            <meshStandardMaterial color="#f8f4ea" roughness={0.7} />
          </mesh>
          <mesh position={[0, 4.4, 0]} castShadow>
            <coneGeometry args={[3.4, 2.6, 8]} />
            <meshStandardMaterial color={t.color} roughness={0.6} emissive={neon ? t.color : '#000'} emissiveIntensity={neon ? 0.8 : 0} />
          </mesh>
          {neon && (
            <mesh position={[0, 3.25, 2.05]}>
              <boxGeometry args={[3.6, 0.25, 0.05]} />
              <meshBasicMaterial color={GONDOLA_COLORS[(i + 2) % GONDOLA_COLORS.length]} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

export function Chalets({ position }: { position: [number, number, number] }) {
  const items = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ x: (i % 3) * 12 - 12, z: Math.floor(i / 3) * 14 - 7, r: i * 0.7 })), []);
  return (
    <group position={position}>
      {items.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, c.r, 0]}>
          <mesh position={[0, 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[6, 4, 5]} />
            <meshStandardMaterial color="#7a4b2a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 5, 0]} rotation={[0, 0, 0]} castShadow>
            <coneGeometry args={[4.6, 3, 4]} />
            <meshStandardMaterial color="#f4f7fb" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Covered loading station placed beside the start of the track. */
export function Station({ path, at, length, color, neon = false }: { path: TrackPath; at: number; length: number; color: string; neon?: boolean }) {
  const matrix = useMemo(() => {
    const p = new THREE.Vector3();
    const t = new THREE.Vector3();
    const u = new THREE.Vector3();
    const r = new THREE.Vector3();
    path.frame(Math.min(path.length, at + length / 2), p, t, u, r);
    t.y = 0;
    t.normalize();
    r.crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
    const m = new THREE.Matrix4().makeBasis(r, new THREE.Vector3(0, 1, 0), t.clone().negate());
    m.setPosition(p.x, 0, p.z);
    return m;
  }, [path, at, length]);
  const pos = useMemo(() => new THREE.Vector3().setFromMatrixPosition(matrix), [matrix]);
  const quat = useMemo(() => new THREE.Quaternion().setFromRotationMatrix(matrix), [matrix]);
  return (
    <group position={pos} quaternion={quat}>
      {/* platform on both sides */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 2.9, 0.7, 0]} receiveShadow castShadow>
          <boxGeometry args={[3, 1.4, length]} />
          <meshStandardMaterial color="#8c8f96" roughness={0.8} />
        </mesh>
      ))}
      {/* pillars */}
      {[-1, 1].map((side) =>
        [-0.45, -0.15, 0.15, 0.45].map((f) => (
          <mesh key={`${side}${f}`} position={[side * 4.1, 3.6, f * length]} castShadow>
            <boxGeometry args={[0.35, 4.6, 0.35]} />
            <meshStandardMaterial color="#e5e5e5" />
          </mesh>
        )),
      )}
      {/* roof */}
      <mesh position={[0, 6.2, 0]} castShadow>
        <boxGeometry args={[10.5, 0.45, length + 2]} />
        <meshStandardMaterial color="#f2f2f2" roughness={0.6} />
      </mesh>
      <mesh position={[0, 6.7, 0]} castShadow>
        <boxGeometry args={[9.5, 0.55, length + 1]} />
        <meshStandardMaterial color={color} roughness={0.5} emissive={neon ? color : '#000'} emissiveIntensity={neon ? 0.4 : 0} />
      </mesh>
      {neon && <pointLight position={[0, 5, 0]} color="#7cf" intensity={200} distance={40} decay={2} />}
    </group>
  );
}

/** Glowing hoops around the track for the night level. */
export function NeonHoops({ path, every = 45 }: { path: TrackPath; every?: number }) {
  const hoops = useMemo(() => {
    const list: { pos: THREE.Vector3; quat: THREE.Quaternion; color: string }[] = [];
    const p = new THREE.Vector3();
    const t = new THREE.Vector3();
    const u = new THREE.Vector3();
    const r = new THREE.Vector3();
    const colors = ['#ff2bd6', '#2bf3ff', '#ffe600', '#7c3aed'];
    let k = 0;
    for (let s = 60; s < path.length - 40; s += every) {
      path.frame(s, p, t, u, r);
      const m = new THREE.Matrix4().makeBasis(r, u, t.clone().negate());
      list.push({ pos: p.clone().addScaledVector(u, 0.7), quat: new THREE.Quaternion().setFromRotationMatrix(m), color: colors[k++ % colors.length] });
    }
    return list;
  }, [path, every]);
  return (
    <group>
      {hoops.map((h, i) => (
        <mesh key={i} position={h.pos} quaternion={h.quat}>
          <torusGeometry args={[3.2, 0.09, 8, 40]} />
          <meshBasicMaterial color={h.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function LampPosts({ points }: { points: { x: number; y: number; z: number }[] }) {
  return (
    <group>
      {points.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]}>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 5, 5]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0, 5.1, 0]}>
            <sphereGeometry args={[0.35, 8, 6]} />
            <meshBasicMaterial color={i % 2 ? '#ffd27a' : '#9fe8ff'} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
