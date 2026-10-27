import * as THREE from 'three';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm } from '../../utils/math';
import { useDisposable } from '../geometry';
import type { EnvPreset, TreeKind } from './presets';
import type { WorldLayout } from './worldLayout';

/** Ring of procedurally displaced mountains (or flat-topped mesas) merged into one mesh. */
export function Mountains({ layout, preset }: { layout: WorldLayout; preset: EnvPreset }) {
  const geometry = useDisposable(() => {
    const m = preset.mountains;
    const parts: THREE.BufferGeometry[] = [];
    const rand = layout.rand;
    const snow = new THREE.Color('#f4f7fb');
    const rock = new THREE.Color(m.color);
    const rockDark = rock.clone().multiplyScalar(0.7);
    const tmp = new THREE.Color();
    const place = (count: number, rMin: number, rMax: number, scale: number) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rand() * 0.4;
        const r = rMin + rand() * (rMax - rMin);
        const x = layout.cx + Math.cos(a) * r;
        const z = layout.cz + Math.sin(a) * r;
        const height = (m.height[0] + rand() * (m.height[1] - m.height[0])) * scale;
        const base = height * (m.plateau ? 0.7 : 1.1 + rand() * 0.5);
        if (layout.trackDist(x, z) < base + 25) continue;
        // radial heightfield: rings from the peak (r=0) out to the base (r=1)
        const RINGS = 14;
        const SEGS = 36;
        const seed = i * 13 + 1;
        const positions = new Float32Array((RINGS + 1) * SEGS * 3);
        const colors = new Float32Array((RINGS + 1) * SEGS * 3);
        for (let ri = 0; ri <= RINGS; ri++) {
          const rr = ri / RINGS;
          for (let si = 0; si < SEGS; si++) {
            const ang = (si / SEGS) * Math.PI * 2;
            const ridge = fbm(Math.cos(ang) * 1.3 + seed, Math.sin(ang) * 1.3 + rr * 0.8, 3, seed);
            const radius = base * rr * (0.75 + ridge * 0.5);
            let h: number;
            if (m.plateau) {
              const edge = 0.55 + ridge * 0.15;
              h = rr < edge ? height * 0.62 : height * 0.62 * Math.max(0, 1 - ((rr - edge) / (1 - edge)) ** 0.6);
            } else {
              h = height * Math.pow(1 - rr, 1.35) * (0.8 + ridge * 0.4);
            }
            if (ri === RINGS) h = 0;
            const k = ri * SEGS + si;
            positions.set([Math.cos(ang) * radius, h, Math.sin(ang) * radius], k * 3);
            const hNorm = h / height;
            if (m.plateau) {
              const band = (Math.sin(h * 0.35 + seed) + 1) / 2;
              tmp.copy(rock).lerp(rockDark, band * 0.6);
              if (rr < 0.5) tmp.lerp(new THREE.Color('#d98c4a'), 0.35);
            } else {
              tmp.copy(rockDark).lerp(rock, 0.3 + hNorm * 0.7);
              tmp.lerp(snow, THREE.MathUtils.smoothstep(hNorm + (ridge - 0.5) * 0.15, m.snowLine, m.snowLine + 0.1));
            }
            tmp.toArray(colors, k * 3);
          }
        }
        const indices: number[] = [];
        for (let ri = 0; ri < RINGS; ri++) {
          for (let si = 0; si < SEGS; si++) {
            const a0 = ri * SEGS + si;
            const a1 = ri * SEGS + ((si + 1) % SEGS);
            const b0 = a0 + SEGS;
            const b1 = a1 + SEGS;
            indices.push(a0, a1, b0, a1, b1, b0);
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        g.setIndex(indices);
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        g.translate(x, -2, z);
        parts.push(g);
      }
    };
    const R = layout.trackRadius;
    place(m.count, R + 380, R + 620, 1);
    if (m.near) place(Math.round(m.count * 0.6), R + 90, R + 260, 0.6);
    if (!parts.length) return new THREE.BufferGeometry();
    const merged = mergeGeometries(parts, false) ?? new THREE.BufferGeometry();
    parts.forEach((p) => p.dispose());
    merged.computeVertexNormals();
    return merged;
  }, [layout, preset]);
  const mat = useDisposable(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), []);
  return <mesh geometry={geometry} material={mat} />;
}

function treeGeometries(kind: TreeKind): [THREE.BufferGeometry, THREE.BufferGeometry] {
  if (kind === 'pine') {
    const trunk = new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6).translate(0, 1.2, 0);
    const a = new THREE.ConeGeometry(2.6, 4.5, 8).translate(0, 4, 0);
    const b = new THREE.ConeGeometry(2.0, 3.8, 8).translate(0, 6.2, 0);
    const c = new THREE.ConeGeometry(1.3, 3.0, 8).translate(0, 8.2, 0);
    const leaves = mergeGeometries([a, b, c])!;
    [a, b, c].forEach((g) => g.dispose());
    return [trunk, leaves];
  }
  if (kind === 'cactus') {
    const trunk = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 4);
    const main = new THREE.CapsuleGeometry(0.45, 4, 4, 8).translate(0, 2.4, 0);
    const arm1 = new THREE.CapsuleGeometry(0.3, 1.4, 4, 8).translate(0.9, 3.0, 0);
    const arm2 = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8).translate(-0.85, 2.4, 0);
    const link1 = new THREE.CylinderGeometry(0.28, 0.28, 0.9, 6).rotateZ(Math.PI / 2).translate(0.45, 2.3, 0);
    const link2 = new THREE.CylinderGeometry(0.28, 0.28, 0.8, 6).rotateZ(Math.PI / 2).translate(-0.4, 1.9, 0);
    const leaves = mergeGeometries([main, arm1, arm2, link1, link2].map((g) => g.toNonIndexed()))!;
    [main, arm1, arm2, link1, link2].forEach((g) => g.dispose());
    return [trunk, leaves];
  }
  const trunk = new THREE.CylinderGeometry(0.25, 0.4, 3, 6).translate(0, 1.5, 0);
  const leaves = new THREE.IcosahedronGeometry(2.4, 1).translate(0, 4.3, 0);
  return [trunk, leaves];
}

const TREE_COUNTS = { low: 260, medium: 700, high: 1400 };

/** Instanced trees scattered around the park, avoiding track and water. */
export function Trees({ layout, preset, quality }: { layout: WorldLayout; preset: EnvPreset; quality: 'low' | 'medium' | 'high' }) {
  const t = preset.trees!;
  const geos = useDisposable(() => {
    const [trunk, leaves] = treeGeometries(t.kind);
    return { trunk, leaves, dispose: () => (trunk.dispose(), leaves.dispose()) };
  }, [t.kind]);
  const trunkMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#5a3d25', roughness: 0.9 }), []);
  const leafMat = useDisposable(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: t.kind !== 'cactus' }), [t.kind]);
  const points = useMemo(
    // the builder grid has no fixed track, so keep its trees out of the building area
    () =>
      preset.terrain === 'grid'
        ? layout.scatter(Math.round(TREE_COUNTS[quality] * t.density), 0, 650, 330)
        : layout.scatter(Math.round(TREE_COUNTS[quality] * t.density), 9, layout.trackRadius + 330),
    [layout, quality, t.density, preset.terrain],
  );
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    const rand = layout.rand;
    points.forEach((p, i) => {
      const s = 0.7 + rand() * 0.8;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
      m.compose(new THREE.Vector3(p.x, p.y - 0.1, p.z), q, new THREE.Vector3(s, s * (0.85 + rand() * 0.4), s));
      trunkRef.current?.setMatrixAt(i, m);
      leafRef.current?.setMatrixAt(i, m);
      col.set(t.colors[Math.floor(rand() * t.colors.length)]);
      leafRef.current?.setColorAt(i, col);
    });
    for (const r of [trunkRef.current, leafRef.current]) {
      if (!r) continue;
      r.count = points.length;
      r.instanceMatrix.needsUpdate = true;
      if (r.instanceColor) r.instanceColor.needsUpdate = true;
      r.computeBoundingSphere();
    }
  }, [points, layout, t.colors]);
  const n = Math.max(1, points.length);
  return (
    <group>
      {t.kind !== 'cactus' && <instancedMesh ref={trunkRef} args={[geos.trunk, trunkMat, n]} castShadow />}
      <instancedMesh ref={leafRef} args={[geos.leaves, leafMat, n]} castShadow receiveShadow />
    </group>
  );
}

export function Rocks({ layout, color, count = 160 }: { layout: WorldLayout; color: string; count?: number }) {
  const geo = useDisposable(() => new THREE.DodecahedronGeometry(1.5, 0), []);
  const mat = useDisposable(() => new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true }), [color]);
  const pts = useMemo(() => layout.scatter(count, 8, layout.trackRadius + 260), [layout, count]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const rand = layout.rand;
    pts.forEach((p, i) => {
      const s = 0.5 + rand() * 2.2;
      q.setFromEuler(e.set(rand() * 3, rand() * 3, rand() * 3));
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(s, s * 0.7, s));
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) {
      ref.current.count = pts.length;
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [pts, layout]);
  return <instancedMesh ref={ref} args={[geo, mat, Math.max(1, pts.length)]} castShadow receiveShadow />;
}
