import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import type { TrackPath } from '../track/trackPath';

/** useMemo for Three.js resources that disposes the previous value when deps change or on unmount. */
export function useDisposable<T extends { dispose: () => void } | null>(factory: () => T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  useEffect(() => () => value?.dispose(), [value]);
  return value;
}

export interface TubeOptions {
  offsetRight: number;
  offsetUp: number;
  radius: number;
  radial: number;
  step: number; // metres between rings
  from?: number;
  to?: number;
  /** Rotate the ring profile (e.g. PI/4 for a box-like square tube). */
  angleOffset?: number;
}

/** Sweeps a circular profile along the track using the track's own up/right frames. */
export function buildTrackTube(path: TrackPath, o: TubeOptions): THREE.BufferGeometry {
  const from = Math.max(0, o.from ?? 0);
  const to = Math.min(path.length, o.to ?? path.length);
  const rings = Math.max(2, Math.ceil((to - from) / o.step) + 1);
  const radial = o.radial;
  const positions = new Float32Array(rings * (radial + 1) * 3);
  const normals = new Float32Array(rings * (radial + 1) * 3);
  const uvs = new Float32Array(rings * (radial + 1) * 2);
  const P = new THREE.Vector3();
  const T = new THREE.Vector3();
  const U = new THREE.Vector3();
  const R = new THREE.Vector3();
  const C = new THREE.Vector3();
  const N = new THREE.Vector3();
  let vi = 0;
  for (let i = 0; i < rings; i++) {
    const s = from + ((to - from) * i) / (rings - 1);
    path.frame(s, P, T, U, R);
    C.copy(P).addScaledVector(R, o.offsetRight).addScaledVector(U, o.offsetUp);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2 + (o.angleOffset ?? 0);
      N.copy(R).multiplyScalar(Math.cos(a)).addScaledVector(U, Math.sin(a));
      positions[vi * 3] = C.x + N.x * o.radius;
      positions[vi * 3 + 1] = C.y + N.y * o.radius;
      positions[vi * 3 + 2] = C.z + N.z * o.radius;
      normals[vi * 3] = N.x;
      normals[vi * 3 + 1] = N.y;
      normals[vi * 3 + 2] = N.z;
      uvs[vi * 2] = j / radial;
      uvs[vi * 2 + 1] = s / 4;
      vi++;
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeBoundingSphere();
  return g;
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
const _u = new THREE.Vector3();
const _r = new THREE.Vector3();
const _b = new THREE.Vector3();

/** Matrix placing an object on the track: X = right, Y = up, Z = backwards (right-handed). */
export function trackMatrix(path: TrackPath, s: number, offsetUp: number, out = _m) {
  path.frame(s, _p, _t, _u, _r);
  _b.copy(_t).negate();
  out.makeBasis(_r, _u, _b);
  _p.addScaledVector(_u, offsetUp);
  out.setPosition(_p);
  return out;
}
