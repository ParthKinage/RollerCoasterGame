import * as THREE from 'three';
import type { SegmentType } from '../types';

export const FLAG_STATION = 1;
export const FLAG_CHAIN = 2;
export const FLAG_BRAKE = 4;

export interface SegmentRange {
  index: number;
  type: SegmentType;
  start: number;
  end: number;
}

/**
 * A track resampled at a uniform arc-length step. Every sample stores position,
 * unit tangent, unit up vector (the rider's "head" direction, including banking
 * and inversions) and the curvature vector dT/ds used for G-force estimation.
 */
export class TrackPath {
  readonly ds: number;
  readonly count: number;
  readonly length: number;
  readonly pos: Float32Array;
  readonly tan: Float32Array;
  readonly up: Float32Array;
  readonly curv: Float32Array;
  readonly flags: Uint8Array;
  readonly seg: Int16Array;
  readonly segments: SegmentRange[];
  readonly bounds: THREE.Box3;
  readonly minHeight: number;
  readonly maxHeight: number;

  constructor(args: {
    ds: number;
    pos: Float32Array;
    tan: Float32Array;
    up: Float32Array;
    curv: Float32Array;
    flags: Uint8Array;
    seg: Int16Array;
    segments: SegmentRange[];
  }) {
    this.ds = args.ds;
    this.pos = args.pos;
    this.tan = args.tan;
    this.up = args.up;
    this.curv = args.curv;
    this.flags = args.flags;
    this.seg = args.seg;
    this.segments = args.segments;
    this.count = args.pos.length / 3;
    this.length = (this.count - 1) * this.ds;
    this.bounds = new THREE.Box3();
    let minY = Infinity;
    let maxY = -Infinity;
    const v = new THREE.Vector3();
    for (let i = 0; i < this.count; i++) {
      v.fromArray(this.pos, i * 3);
      this.bounds.expandByPoint(v);
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    this.minHeight = minY;
    this.maxHeight = maxY;
  }

  private locate(s: number): [number, number] {
    const f = Math.min(Math.max(s, 0), this.length) / this.ds;
    const i = Math.min(Math.floor(f), this.count - 2);
    return [i, f - i];
  }

  private lerpArr(arr: Float32Array, s: number, out: THREE.Vector3, normalize: boolean) {
    const [i, t] = this.locate(s);
    const a = i * 3;
    const b = a + 3;
    out.set(
      arr[a] + (arr[b] - arr[a]) * t,
      arr[a + 1] + (arr[b + 1] - arr[a + 1]) * t,
      arr[a + 2] + (arr[b + 2] - arr[a + 2]) * t,
    );
    if (normalize) out.normalize();
    return out;
  }

  getPos(s: number, out: THREE.Vector3) {
    return this.lerpArr(this.pos, s, out, false);
  }
  getTan(s: number, out: THREE.Vector3) {
    return this.lerpArr(this.tan, s, out, true);
  }
  getUp(s: number, out: THREE.Vector3) {
    return this.lerpArr(this.up, s, out, true);
  }
  getCurv(s: number, out: THREE.Vector3) {
    return this.lerpArr(this.curv, s, out, false);
  }

  /** Fills position, tangent, up and right (tangent x up) for distance s. */
  frame(s: number, pos: THREE.Vector3, tan: THREE.Vector3, up: THREE.Vector3, right: THREE.Vector3) {
    this.getPos(s, pos);
    this.getTan(s, tan);
    this.getUp(s, up);
    // Re-orthogonalise after interpolation.
    up.addScaledVector(tan, -up.dot(tan)).normalize();
    right.crossVectors(tan, up).normalize();
  }

  flagsAt(s: number) {
    const i = Math.round(Math.min(Math.max(s, 0), this.length) / this.ds);
    return this.flags[i];
  }

  segmentAt(s: number) {
    const i = Math.round(Math.min(Math.max(s, 0), this.length) / this.ds);
    return this.seg[i];
  }

  nearestIndex(p: THREE.Vector3) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.count; i++) {
      const dx = this.pos[i * 3] - p.x;
      const dy = this.pos[i * 3 + 1] - p.y;
      const dz = this.pos[i * 3 + 2] - p.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }
}
