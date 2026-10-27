import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { RideSession } from '../game/rideSession';
import { useGameStore } from '../store/gameStore';
import { useDisposable } from './geometry';

const LINES = 140;

/** Wind streaks rushing past the camera at high speed. Lives in camera space. */
export function SpeedLines({ session }: { session: RideSession }) {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);
  const data = useMemo(() => {
    const pts = new Float32Array(LINES * 6);
    const seeds = Array.from({ length: LINES }, () => ({ a: Math.random() * Math.PI * 2, r: 2.5 + Math.random() * 6, z: -Math.random() * 60 }));
    return { pts, seeds };
  }, []);
  const geo = useDisposable(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pts, 3));
    return g;
  }, [data]);
  const mat = useDisposable(() => new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: false }), []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const effects = useGameStore.getState().settings.motionEffects;
    const v = session.phys.v;
    const target = effects ? THREE.MathUtils.clamp((v - 16) / 18, 0, 1) * 0.45 : 0;
    mat.opacity += (target - mat.opacity) * Math.min(1, dt * 4);
    g.visible = mat.opacity > 0.01;
    if (!g.visible) return;
    const len = 1 + v * 0.08;
    data.seeds.forEach((sd, i) => {
      sd.z += v * dt * 1.6;
      if (sd.z > 2) {
        sd.z = -60 - Math.random() * 10;
        sd.a = Math.random() * Math.PI * 2;
        sd.r = 2.5 + Math.random() * 6;
      }
      const x = Math.cos(sd.a) * sd.r;
      const y = Math.sin(sd.a) * sd.r;
      data.pts.set([x, y, sd.z, x, y, sd.z - len], i * 6);
    });
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });
  return (
    <group ref={group}>
      <lineSegments geometry={geo} material={mat} frustumCulled={false} />
    </group>
  );
}

/** The rider's arms, raised into view while "hands up" is held. */
export function RiderArms({ session }: { session: RideSession }) {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const raise = useRef(0);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.copy(camera.position);
    g.quaternion.copy(camera.quaternion);
    const target = session.input.handsUp && session.status === 'running' ? 1 : 0;
    raise.current += (target - raise.current) * Math.min(1, dt * 7);
    const k = raise.current;
    g.visible = k > 0.02;
    const wave = Math.sin(state.clock.elapsedTime * 3) * 0.05;
    if (left.current) {
      left.current.position.set(-0.75, -1.3 + k * 1.05, -1.5);
      left.current.rotation.set(0.2, 0, 0.45 - k * 0.1 + wave);
    }
    if (right.current) {
      right.current.position.set(0.75, -1.3 + k * 1.05, -1.5);
      right.current.rotation.set(0.2, 0, -0.45 + k * 0.1 - wave);
    }
  });
  const arm = (
    <>
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.075, 0.55, 4, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.06, 0.25, 4, 8]} />
        <meshStandardMaterial color="#e0ac80" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.62, 0]} scale={[1, 1.2, 0.6]}>
        <sphereGeometry args={[0.085, 10, 8]} />
        <meshStandardMaterial color="#e0ac80" roughness={0.7} />
      </mesh>
    </>
  );
  return (
    <group ref={group} visible={false}>
      <group ref={left} scale={0.7}>{arm}</group>
      <group ref={right} scale={0.7}>{arm}</group>
    </group>
  );
}
