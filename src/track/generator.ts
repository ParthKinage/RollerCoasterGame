import * as THREE from 'three';
import type { Segment, SegmentType } from '../types';
import { DEG, smoothstep } from '../utils/math';
import { FLAG_BRAKE, FLAG_CHAIN, FLAG_STATION, TrackPath, type SegmentRange } from './trackPath';

const RAW_STEP = 0.25;
export const SAMPLE_DS = 0.5;
export const STATION_HEIGHT = 1.6;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

interface RawPoint {
  p: THREE.Vector3;
  up: THREE.Vector3;
  flag: number;
  seg: number;
}

interface Turtle {
  pos: THREE.Vector3;
  yaw: number;
}

export class TrackBuildError extends Error {
  constructor(
    message: string,
    readonly segmentIndex: number,
  ) {
    super(message);
  }
}

const flagFor = (type: SegmentType) =>
  type === 'station' ? FLAG_STATION : type === 'lift' ? FLAG_CHAIN : type === 'brake' ? FLAG_BRAKE : 0;

/** Vertical profile (0..1 in, fraction of height out) for level-entry/level-exit segments. */
function heightProfile(type: SegmentType, u: number): number {
  switch (type) {
    case 'lift':
    case 'curve':
      return (1 - Math.cos(Math.PI * u)) / 2;
    case 'drop':
      return -(1 - Math.cos(Math.PI * u)) / 2;
    case 'hill':
      return Math.sin(Math.PI * u) ** 2;
    default:
      return 0;
  }
}

const forwardOf = (yaw: number, out = new THREE.Vector3()) => out.set(Math.sin(yaw), 0, Math.cos(yaw));
const rightOf = (yaw: number, out = new THREE.Vector3()) => out.set(-Math.cos(yaw), 0, Math.sin(yaw));

function emitFlat(seg: Segment, index: number, t: Turtle, out: RawPoint[]) {
  const n = Math.max(4, Math.ceil(seg.length / RAW_STEP));
  const turn = seg.turn * DEG;
  const bank = seg.bank * DEG;
  const H = seg.type === 'drop' ? Math.abs(seg.height) : seg.height;
  const dl = seg.length / n;
  const y0 = t.pos.y;
  const flag = flagFor(seg.type);
  let x = t.pos.x;
  let z = t.pos.z;
  const tanV = new THREE.Vector3();
  const upV = new THREE.Vector3();
  const cross = new THREE.Vector3();
  const rollSign = seg.turn === 0 ? 1 : Math.sign(seg.turn);
  for (let k = 1; k <= n; k++) {
    const u = k / n;
    const yawMid = t.yaw - turn * smoothstep((k - 0.5) / n);
    x += Math.sin(yawMid) * dl;
    z += Math.cos(yawMid) * dl;
    const y = y0 + heightProfile(seg.type, u) * H;
    const yaw = t.yaw - turn * smoothstep(u);
    // approximate tangent for the up-vector construction (exact tangents are recomputed later)
    const dy = (heightProfile(seg.type, Math.min(1, u + 0.001)) - heightProfile(seg.type, Math.max(0, u - 0.001))) * H / 0.002 / seg.length;
    forwardOf(yaw, tanV).addScaledVector(WORLD_UP, dy).normalize();
    upV.copy(WORLD_UP).addScaledVector(tanV, -tanV.y).normalize();
    const roll = rollSign * bank * Math.sin(Math.PI * u);
    cross.crossVectors(tanV, upV);
    const up = upV.clone().multiplyScalar(Math.cos(roll)).addScaledVector(cross, Math.sin(roll));
    out.push({ p: new THREE.Vector3(x, y, z), up, flag, seg: index });
  }
  t.pos.set(x, y0 + heightProfile(seg.type, 1) * H, z);
  t.yaw -= turn;
}

// Normalised clothoid-style loop: curvature ~ sin^2(pi*u), so it is zero at the entry/exit
// and highest at the top, giving the classic teardrop shape. theta(u) = 2*pi*u - sin(2*pi*u).
const LOOP_TABLE_N = 1200;
const loopTable = (() => {
  const fwd = new Float64Array(LOOP_TABLE_N + 1);
  const up = new Float64Array(LOOP_TABLE_N + 1);
  const du = 1 / LOOP_TABLE_N;
  for (let k = 1; k <= LOOP_TABLE_N; k++) {
    const um = (k - 0.5) * du;
    const th = 2 * Math.PI * um - Math.sin(2 * Math.PI * um);
    fwd[k] = fwd[k - 1] + Math.cos(th) * du;
    up[k] = up[k - 1] + Math.sin(th) * du;
  }
  return { fwd, up, maxUp: up[LOOP_TABLE_N / 2] };
})();

function emitLoop(seg: Segment, index: number, t: Turtle, out: RawPoint[]) {
  const H = Math.max(8, seg.height);
  const S = H / loopTable.maxUp; // total arc length of the loop
  const side = seg.turn < 0 ? -1 : 1;
  const lateral = 5.5 * side;
  const f = forwardOf(t.yaw);
  const r = rightOf(t.yaw);
  const n = Math.ceil(S / RAW_STEP);
  const start = t.pos.clone();
  for (let k = 1; k <= n; k++) {
    const u = k / n;
    const ti = Math.min(LOOP_TABLE_N, Math.round(u * LOOP_TABLE_N));
    const th = 2 * Math.PI * u - Math.sin(2 * Math.PI * u);
    const p = start
      .clone()
      .addScaledVector(f, S * loopTable.fwd[ti])
      .addScaledVector(WORLD_UP, S * loopTable.up[ti])
      .addScaledVector(r, lateral * smoothstep(u));
    const up = f.clone().multiplyScalar(-Math.sin(th)).addScaledVector(WORLD_UP, Math.cos(th));
    out.push({ p, up, flag: 0, seg: index });
  }
  t.pos.copy(start).addScaledVector(f, S * loopTable.fwd[LOOP_TABLE_N]).addScaledVector(r, lateral);
  t.pos.y = start.y;
}

function emitCorkscrew(seg: Segment, index: number, t: Turtle, out: RawPoint[]) {
  const rc = Math.max(2, seg.height / 2);
  const L = seg.length;
  const side = seg.turn < 0 ? -1 : 1;
  const f = forwardOf(t.yaw);
  const r = rightOf(t.yaw);
  const axis = t.pos.clone().addScaledVector(WORLD_UP, rc);
  const n = Math.max(8, Math.ceil(Math.hypot(L, Math.PI * 2 * rc) / RAW_STEP));
  for (let k = 1; k <= n; k++) {
    const u = k / n;
    const phi = 2 * Math.PI * smoothstep(u);
    const p = axis
      .clone()
      .addScaledVector(f, L * u)
      .addScaledVector(WORLD_UP, -rc * Math.cos(phi))
      .addScaledVector(r, side * rc * Math.sin(phi));
    const up = WORLD_UP.clone().multiplyScalar(Math.cos(phi)).addScaledVector(r, -side * Math.sin(phi));
    out.push({ p, up, flag: 0, seg: index });
  }
  t.pos.addScaledVector(f, L);
}

export interface BuildOptions {
  start?: THREE.Vector3;
  yaw?: number;
}

/** Converts a list of segments into a uniformly sampled TrackPath. */
export function buildTrack(segments: Segment[], opts: BuildOptions = {}): TrackPath {
  if (segments.length === 0) throw new TrackBuildError('Track has no segments', 0);
  const turtle: Turtle = {
    pos: (opts.start ?? new THREE.Vector3(0, STATION_HEIGHT, 0)).clone(),
    yaw: opts.yaw ?? 0,
  };
  const raw: RawPoint[] = [
    { p: turtle.pos.clone(), up: WORLD_UP.clone(), flag: flagFor(segments[0].type), seg: 0 },
  ];
  segments.forEach((seg, i) => {
    if ((seg.type !== 'loop' && !(seg.length > 0)) || !Number.isFinite(seg.height) || !Number.isFinite(seg.turn)) {
      throw new TrackBuildError(`Segment ${i + 1} has invalid parameters`, i);
    }
    if (seg.type === 'loop') emitLoop(seg, i, turtle, raw);
    else if (seg.type === 'corkscrew') emitCorkscrew(seg, i, turtle, raw);
    else emitFlat(seg, i, turtle, raw);
  });

  // cumulative arc length of the raw polyline
  const cum = new Float64Array(raw.length);
  for (let i = 1; i < raw.length; i++) cum[i] = cum[i - 1] + raw[i].p.distanceTo(raw[i - 1].p);
  const total = cum[raw.length - 1];
  const count = Math.max(2, Math.floor(total / SAMPLE_DS) + 1);
  const pos = new Float32Array(count * 3);
  const up = new Float32Array(count * 3);
  const tan = new Float32Array(count * 3);
  const curv = new Float32Array(count * 3);
  const flags = new Uint8Array(count);
  const segIdx = new Int16Array(count);

  const tmpP = new THREE.Vector3();
  const tmpU = new THREE.Vector3();
  let j = 0;
  for (let i = 0; i < count; i++) {
    const s = i * SAMPLE_DS;
    while (j < raw.length - 2 && cum[j + 1] < s) j++;
    const span = cum[j + 1] - cum[j] || 1;
    const t = Math.min(1, Math.max(0, (s - cum[j]) / span));
    tmpP.lerpVectors(raw[j].p, raw[j + 1].p, t);
    tmpU.lerpVectors(raw[j].up, raw[j + 1].up, t).normalize();
    tmpP.toArray(pos, i * 3);
    tmpU.toArray(up, i * 3);
    const src = t < 0.5 ? raw[j] : raw[j + 1];
    flags[i] = src.flag;
    segIdx[i] = src.seg;
  }

  // tangents by central differences, then orthogonalise up against tangent
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const T = new THREE.Vector3();
  const U = new THREE.Vector3();
  const prevUp = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < count; i++) {
    a.fromArray(pos, Math.max(0, i - 1) * 3);
    b.fromArray(pos, Math.min(count - 1, i + 1) * 3);
    T.subVectors(b, a).normalize();
    T.toArray(tan, i * 3);
    U.fromArray(up, i * 3);
    U.addScaledVector(T, -U.dot(T));
    if (U.lengthSq() < 1e-6) U.copy(prevUp);
    U.normalize();
    prevUp.copy(U);
    U.toArray(up, i * 3);
  }
  for (let i = 0; i < count; i++) {
    // wide stencil (+/-1.5 m) keeps G-force estimates free of sampling noise
    const lo = Math.max(0, i - 3);
    const hi = Math.min(count - 1, i + 3);
    a.fromArray(tan, lo * 3);
    b.fromArray(tan, hi * 3);
    const span = Math.max(1, hi - lo) * SAMPLE_DS;
    T.subVectors(b, a).divideScalar(span);
    T.toArray(curv, i * 3);
  }

  const ranges: SegmentRange[] = segments.map((sg, index) => ({ index, type: sg.type, start: Infinity, end: -Infinity }));
  for (let i = 0; i < count; i++) {
    const r = ranges[segIdx[i]];
    const s = i * SAMPLE_DS;
    if (s < r.start) r.start = s;
    if (s > r.end) r.end = s;
  }
  for (const r of ranges) {
    if (!Number.isFinite(r.start)) {
      r.start = 0;
      r.end = 0;
    }
  }

  return new TrackPath({ ds: SAMPLE_DS, pos, tan, up, curv, flags, seg: segIdx, segments: ranges });
}
