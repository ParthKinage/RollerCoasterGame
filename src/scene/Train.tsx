import * as THREE from 'three';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import type { TrackPath } from '../track/trackPath';
import type { TrainColor } from '../types';
import { CAR_SPACING, NUM_CARS } from '../physics/coasterPhysics';
import { useDisposable } from './geometry';

export const TRAIN_COLORS: Record<TrainColor, { body: string; accent: string; label: string }> = {
  red: { body: '#d81e1e', accent: '#ffcf33', label: 'Red Rocket' },
  blue: { body: '#1d63d8', accent: '#e8f1ff', label: 'Blue Comet' },
  yellow: { body: '#f2b705', accent: '#202020', label: 'Yellow Flash' },
  green: { body: '#1fae4b', accent: '#f4f4f4', label: 'Green Viper' },
};

export interface TrainHandle {
  update: (path: TrackPath, frontS: number) => void;
}

interface CarProps {
  color: TrainColor;
  front: boolean;
  materials: ReturnType<typeof useTrainMaterials>;
}

function useTrainMaterials(color: TrainColor) {
  const c = TRAIN_COLORS[color];
  const body = useDisposable(() => new THREE.MeshPhysicalMaterial({ color: c.body, metalness: 0.55, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }), [c.body]);
  const accent = useDisposable(() => new THREE.MeshStandardMaterial({ color: c.accent, metalness: 0.4, roughness: 0.35 }), [c.accent]);
  const seat = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#1b1d22', roughness: 0.65 }), []);
  const metal = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#8d939c', metalness: 0.9, roughness: 0.3 }), []);
  const dark = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#2a2d33', metalness: 0.6, roughness: 0.5 }), []);
  const light = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#fff7d6', emissive: new THREE.Color('#fff2b0'), emissiveIntensity: 2 }), []);
  return { body, accent, seat, metal, dark, light };
}

function Car({ front, materials: m }: CarProps) {
  const wheel = useMemo(() => new THREE.CylinderGeometry(0.17, 0.17, 0.14, 14).rotateZ(Math.PI / 2), []);
  const bar = useMemo(() => new THREE.TorusGeometry(0.2, 0.03, 6, 16, Math.PI), []);
  return (
    <group>
      {/* chassis */}
      <mesh position={[0, 0.25, 0]} material={m.dark} castShadow>
        <boxGeometry args={[1.3, 0.16, 2.5]} />
      </mesh>
      {/* body shell */}
      <RoundedBox args={[1.75, 0.6, 2.5]} radius={0.18} smoothness={3} position={[0, 0.62, 0]} material={m.body} castShadow />
      {/* side trim stripe */}
      <mesh position={[0, 0.7, 0]} material={m.accent}>
        <boxGeometry args={[1.79, 0.07, 2.3]} />
      </mesh>
      {/* two rows of seats */}
      {[-0.45, 0.6].map((z) => (
        <group key={z} position={[0, 0.85, z]}>
          {[-0.4, 0.4].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <RoundedBox args={[0.62, 0.16, 0.6]} radius={0.06} smoothness={2} position={[0, 0.02, 0]} material={m.seat} />
              <RoundedBox args={[0.62, 0.75, 0.16]} radius={0.06} smoothness={2} position={[0, 0.38, -0.3]} material={m.seat} castShadow />
              <mesh geometry={bar} material={m.accent} position={[0, 0.2, 0.22]} rotation={[0.5, 0, 0]} />
            </group>
          ))}
        </group>
      ))}
      {/* wheels on each rail: road, side and up-stop wheels */}
      {[-1, 1].map((side) =>
        [-0.85, 0.85].map((z) => (
          <group key={`${side}${z}`} position={[side * 0.6, 0.05, z]}>
            <mesh geometry={wheel} material={m.metal} position={[0, 0.12, 0]} />
            <mesh geometry={wheel} material={m.metal} position={[0, -0.22, 0]} />
          </group>
        )),
      )}
      {front && (
        <group position={[0, 0.55, 1.35]}>
          <mesh material={m.body} scale={[0.88, 0.32, 0.6]} castShadow>
            <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={m.body} scale={[0.88, 0.3, 0.6]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} material={m.light} position={[x, 0.08, 0.42]}>
              <sphereGeometry args={[0.1, 12, 8]} />
            </mesh>
          ))}
          <mesh material={m.dark} position={[0, 0.3, 0.05]} rotation={[-0.6, 0, 0]}>
            <boxGeometry args={[1.0, 0.04, 0.28]} />
          </mesh>
        </group>
      )}
      {/* coupling */}
      {!front && (
        <mesh position={[0, 0.25, 1.35]} material={m.metal}>
          <boxGeometry args={[0.2, 0.12, 0.4]} />
        </mesh>
      )}
    </group>
  );
}

interface TrainProps {
  color: TrainColor;
  cars?: number;
}

/** The coaster train. Each car is placed on the track every frame via the imperative `update` handle. */
export const Train = forwardRef<TrainHandle, TrainProps>(function Train({ color, cars = NUM_CARS }, ref) {
  const materials = useTrainMaterials(color);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const tmp = useMemo(
    () => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), u: new THREE.Vector3(), r: new THREE.Vector3(), l: new THREE.Vector3(), m: new THREE.Matrix4() }),
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      update(path, frontS) {
        groups.current.forEach((g, i) => {
          if (!g) return;
          const s = frontS - i * CAR_SPACING;
          path.frame(s, tmp.p, tmp.t, tmp.u, tmp.r);
          // model: +Z forward, +X left (right-handed basis)
          tmp.l.copy(tmp.r).negate();
          tmp.m.makeBasis(tmp.l, tmp.u, tmp.t);
          g.quaternion.setFromRotationMatrix(tmp.m);
          g.position.copy(tmp.p).addScaledVector(tmp.u, -0.12);
        });
      },
    }),
    [tmp],
  );

  return (
    <group>
      {Array.from({ length: cars }, (_, i) => (
        <group key={i} ref={(g) => (groups.current[i] = g)}>
          <Car color={color} front={i === 0} materials={materials} />
        </group>
      ))}
    </group>
  );
});

/** Static train model for previews (customisation screen). */
export function TrainModel({ color, cars = NUM_CARS }: TrainProps) {
  const materials = useTrainMaterials(color);
  return (
    <group>
      {Array.from({ length: cars }, (_, i) => (
        <group key={i} position={[0, 0, -i * CAR_SPACING]}>
          <Car color={color} front={i === 0} materials={materials} />
        </group>
      ))}
    </group>
  );
}
