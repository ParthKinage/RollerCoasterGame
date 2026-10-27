import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { TrackPath } from '../track/trackPath';
import { FLAG_CHAIN, FLAG_STATION } from '../track/trackPath';
import { buildTrackTube, trackMatrix, useDisposable } from './geometry';

interface Props {
  path: TrackPath;
  color: string;
  supportColor?: string;
  width?: number;
  neon?: boolean;
  castShadow?: boolean;
  highlight?: { from: number; to: number } | null;
  onPick?: (s: number) => void;
  /** Ground height for supports (track-relative terrain is flattened to 0). */
  groundY?: number;
}

const TIE_SPACING = 1.25;
const SUPPORT_SPACING = 9;

export function TrackMesh({ path, color, supportColor = '#e6e6e8', width = 1.2, neon = false, castShadow = true, highlight, onPick, groundY = 0 }: Props) {
  const half = width / 2;

  const leftRail = useDisposable(() => buildTrackTube(path, { offsetRight: -half, offsetUp: 0, radius: 0.1, radial: 8, step: 0.5 }), [path, half]);
  const rightRail = useDisposable(() => buildTrackTube(path, { offsetRight: half, offsetUp: 0, radius: 0.1, radial: 8, step: 0.5 }), [path, half]);
  const spine = useDisposable(
    () => buildTrackTube(path, { offsetRight: 0, offsetUp: -0.5, radius: 0.28, radial: 4, step: 0.5, angleOffset: Math.PI / 4 }),
    [path],
  );
  const highlightGeo = useDisposable(
    () => (highlight && highlight.to > highlight.from ? buildTrackTube(path, { offsetRight: 0, offsetUp: -0.25, radius: half + 0.35, radial: 12, step: 0.5, from: highlight.from, to: highlight.to }) : null),
    [path, highlight?.from, highlight?.to, half],
  );

  const railMat = useDisposable(
    () => new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.28, emissive: neon ? new THREE.Color(color) : new THREE.Color(0), emissiveIntensity: neon ? 0.9 : 0 }),
    [color, neon],
  );
  const spineMat = useDisposable(() => new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.38, emissive: new THREE.Color(color), emissiveIntensity: neon ? 0.15 : 0 }), [color, neon]);
  const tieMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.7), metalness: 0.5, roughness: 0.45 }), [color]);
  const supportMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: supportColor, metalness: 0.5, roughness: 0.45 }), [supportColor]);
  const chainMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.9, roughness: 0.4 }), []);
  const footMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#9a9a9a', roughness: 0.9 }), []);
  const hlMat = useDisposable(
    () => new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.35, depthWrite: false }),
    [],
  );

  const tieGeo = useDisposable(() => new THREE.BoxGeometry(width + 0.25, 0.12, 0.2), [width]);
  const tieLegGeo = useDisposable(() => new THREE.BoxGeometry(0.12, 0.5, 0.12), []);
  const supportGeo = useDisposable(() => new THREE.CylinderGeometry(0.3, 0.38, 1, 10).translate(0, 0.5, 0), []);
  const footGeo = useDisposable(() => new THREE.CylinderGeometry(0.75, 0.9, 0.4, 10).translate(0, 0.2, 0), []);
  const chainGeo = useDisposable(() => new THREE.BoxGeometry(0.22, 0.08, 0.35), []);

  const ties = useRef<THREE.InstancedMesh>(null);
  const tieLegs = useRef<THREE.InstancedMesh>(null);
  const supports = useRef<THREE.InstancedMesh>(null);
  const feet = useRef<THREE.InstancedMesh>(null);
  const chain = useRef<THREE.InstancedMesh>(null);

  const tieCount = Math.floor(path.length / TIE_SPACING);

  // Supports: a column from the ground up to the underside of the track every few metres.
  const supportData = useMemo(() => {
    const list: { x: number; z: number; top: number }[] = [];
    const P = new THREE.Vector3();
    const T = new THREE.Vector3();
    const U = new THREE.Vector3();
    const R = new THREE.Vector3();
    for (let s = SUPPORT_SPACING / 2; s < path.length; s += SUPPORT_SPACING) {
      if (path.flagsAt(s) & FLAG_STATION) continue;
      path.frame(s, P, T, U, R);
      // attach to the spine; for inverted track attach on the outside (top) of the track
      const attach = P.clone().addScaledVector(U, U.y >= 0 ? -0.6 : 0.6);
      const top = U.y >= 0 ? attach.y : attach.y;
      if (top - groundY < 1.2) continue;
      list.push({ x: attach.x, z: attach.z, top });
    }
    return list;
  }, [path, groundY]);

  const chainSamples = useMemo(() => {
    const list: number[] = [];
    for (let s = 0; s < path.length; s += 0.45) if (path.flagsAt(s) & FLAG_CHAIN) list.push(s);
    return list;
  }, [path]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const leg = new THREE.Matrix4();
    if (ties.current && tieLegs.current) {
      for (let i = 0; i < tieCount; i++) {
        trackMatrix(path, i * TIE_SPACING, -0.05, m);
        ties.current.setMatrixAt(i, m);
        leg.makeTranslation(0, -0.25, 0);
        tieLegs.current.setMatrixAt(i, m.clone().multiply(leg));
      }
      ties.current.count = tieCount;
      tieLegs.current.count = tieCount;
      ties.current.instanceMatrix.needsUpdate = true;
      tieLegs.current.instanceMatrix.needsUpdate = true;
      ties.current.computeBoundingSphere();
      tieLegs.current.computeBoundingSphere();
    }
    if (supports.current && feet.current) {
      supportData.forEach((d, i) => {
        const h = d.top - groundY;
        m.makeScale(1 + h * 0.012, h, 1 + h * 0.012).setPosition(d.x, groundY, d.z);
        supports.current!.setMatrixAt(i, m);
        m.makeTranslation(d.x, groundY - 0.1, d.z);
        feet.current!.setMatrixAt(i, m);
      });
      supports.current.count = supportData.length;
      feet.current.count = supportData.length;
      supports.current.instanceMatrix.needsUpdate = true;
      feet.current.instanceMatrix.needsUpdate = true;
      supports.current.computeBoundingSphere();
      feet.current.computeBoundingSphere();
    }
    if (chain.current) {
      chainSamples.forEach((s, i) => {
        trackMatrix(path, s, 0.02, m);
        chain.current!.setMatrixAt(i, m);
      });
      chain.current.count = chainSamples.length;
      chain.current.instanceMatrix.needsUpdate = true;
      chain.current.computeBoundingSphere();
    }
  }, [path, tieCount, supportData, chainSamples, groundY]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!onPick || e.delta > 6) return;
    e.stopPropagation();
    onPick(path.nearestIndex(e.point) * path.ds);
  };

  return (
    <group>
      <mesh geometry={leftRail} material={railMat} castShadow={castShadow} onClick={onPick ? handleClick : undefined} />
      <mesh geometry={rightRail} material={railMat} castShadow={castShadow} onClick={onPick ? handleClick : undefined} />
      <mesh geometry={spine} material={spineMat} castShadow={castShadow} receiveShadow onClick={onPick ? handleClick : undefined} />
      <instancedMesh ref={ties} args={[tieGeo, tieMat, Math.max(1, tieCount)]} castShadow={castShadow} />
      <instancedMesh ref={tieLegs} args={[tieLegGeo, tieMat, Math.max(1, tieCount)]} />
      <instancedMesh ref={supports} args={[supportGeo, supportMat, Math.max(1, supportData.length)]} castShadow={castShadow} receiveShadow />
      <instancedMesh ref={feet} args={[footGeo, footMat, Math.max(1, supportData.length)]} receiveShadow />
      <instancedMesh ref={chain} args={[chainGeo, chainMat, Math.max(1, chainSamples.length)]} />
      {highlightGeo && <mesh geometry={highlightGeo} material={hlMat} renderOrder={2} />}
    </group>
  );
}
