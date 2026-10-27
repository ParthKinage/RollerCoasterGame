import type { TrackPath } from '../../track/trackPath';
import { fbm, mulberry32, smoothRange } from '../../utils/math';
import type { EnvPreset } from './presets';

const CELL = 8;
const MAX_DIST = 400;

export interface Spot {
  x: number;
  z: number;
  r: number;
}

/**
 * Procedural layout of a level: distance-to-track field (used to flatten terrain
 * and keep scenery off the track), terrain height function and placement helpers.
 */
export class WorldLayout {
  readonly cx: number;
  readonly cz: number;
  readonly trackRadius: number;
  readonly size: number;
  private readonly n: number;
  private readonly ox: number;
  private readonly oz: number;
  private readonly dist: Float32Array;
  private readonly preset: EnvPreset;
  private readonly riverAngle: number;
  private readonly riverPhase: number;
  readonly lake: Spot | null;
  readonly reserved: Spot[] = [];
  readonly rand: () => number;

  constructor(path: TrackPath | null, preset: EnvPreset, seed = 7) {
    this.preset = preset;
    this.rand = mulberry32(seed);
    const b = path?.bounds;
    this.cx = b ? (b.min.x + b.max.x) / 2 : 0;
    this.cz = b ? (b.min.z + b.max.z) / 2 : 0;
    this.trackRadius = b ? Math.max(60, Math.hypot(b.max.x - b.min.x, b.max.z - b.min.z) / 2) : 120;
    this.size = Math.max(1400, this.trackRadius * 2 + 900);
    this.n = Math.ceil(this.size / CELL) + 1;
    this.ox = this.cx - this.size / 2;
    this.oz = this.cz - this.size / 2;
    this.dist = new Float32Array(this.n * this.n).fill(MAX_DIST);
    if (path) this.stampTrack(path);
    this.riverAngle = this.rand() * Math.PI;
    this.riverPhase = this.rand() * Math.PI * 2;
    this.lake = preset.water?.lake ? this.findSpot(45, 60, 200) : null;
    if (this.lake) this.reserved.push(this.lake);
  }

  private stampTrack(path: TrackPath) {
    // stamp far enough that placement queries up to ~260 m from the track are meaningful
    const R = 280;
    const rc = Math.ceil(R / CELL);
    for (let i = 0; i < path.count; i += 10) {
      const x = path.pos[i * 3];
      const z = path.pos[i * 3 + 2];
      const gx = Math.round((x - this.ox) / CELL);
      const gz = Math.round((z - this.oz) / CELL);
      for (let dz = -rc; dz <= rc; dz++) {
        const zz = gz + dz;
        if (zz < 0 || zz >= this.n) continue;
        for (let dx = -rc; dx <= rc; dx++) {
          const xx = gx + dx;
          if (xx < 0 || xx >= this.n) continue;
          const wx = this.ox + xx * CELL - x;
          const wz = this.oz + zz * CELL - z;
          const d = Math.sqrt(wx * wx + wz * wz);
          const k = zz * this.n + xx;
          if (d < this.dist[k]) this.dist[k] = d;
        }
      }
    }
  }

  /** Horizontal distance from (x,z) to the nearest part of the track (bilinear, ~8 m accuracy). */
  trackDist(x: number, z: number) {
    const fx = (x - this.ox) / CELL;
    const fz = (z - this.oz) / CELL;
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    if (x0 < 0 || z0 < 0 || x0 >= this.n - 1 || z0 >= this.n - 1) return MAX_DIST;
    const tx = fx - x0;
    const tz = fz - z0;
    const i = z0 * this.n + x0;
    const a = this.dist[i];
    const b = this.dist[i + 1];
    const c = this.dist[i + this.n];
    const d = this.dist[i + this.n + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  riverDist(x: number, z: number) {
    if (!this.preset.water?.river) return Infinity;
    const ca = Math.cos(this.riverAngle);
    const sa = Math.sin(this.riverAngle);
    const dx = x - this.cx;
    const dz = z - this.cz;
    const u = dx * ca + dz * sa;
    const w = -dx * sa + dz * ca;
    const A = 45;
    const L = 90;
    const f = A * Math.sin(u / L + this.riverPhase) + 18 * Math.sin(u / 37);
    const fp = (A / L) * Math.cos(u / L + this.riverPhase) + (18 / 37) * Math.cos(u / 37);
    return Math.abs(w - f) / Math.sqrt(1 + fp * fp);
  }

  isWater(x: number, z: number) {
    return this.heightAt(x, z) < -0.4;
  }

  heightAt(x: number, z: number) {
    const p = this.preset;
    if (p.terrain === 'grid') return 0;
    const d = this.trackDist(x, z);
    let n = fbm(x / 160, z / 160, 4, 3) * p.hillAmp;
    if (p.terrain === 'canyon') {
      // stepped terraces
      const raw = fbm(x / 120, z / 120, 3, 9) * p.hillAmp * 1.6;
      n = Math.floor(raw / 6) * 6 + Math.max(0, (raw % 6) - 4) * 3;
    }
    n += fbm(x / 22, z / 22, 2, 5) * 1.2;
    let h = n * smoothRange(14, 90, d);
    const river = this.riverDist(x, z);
    if (river < 40) h = h * smoothRange(10, 34, river) + -2.6 * (1 - smoothRange(8, 16, river));
    if (this.lake) {
      const ld = Math.hypot(x - this.lake.x, z - this.lake.z);
      if (ld < this.lake.r + 20) h = h * smoothRange(this.lake.r - 10, this.lake.r + 20, ld) - 2.6 * (1 - smoothRange(this.lake.r - 14, this.lake.r, ld));
    }
    return h;
  }

  private clearOfReserved(x: number, z: number, r: number) {
    return this.reserved.every((s) => Math.hypot(s.x - x, s.z - z) > s.r + r);
  }

  /** Finds a random location whose distance to the track lies in [minD, maxD]. */
  findSpot(radius: number, minD: number, maxD: number, avoidWater = true, tries = 300): Spot | null {
    const R = this.trackRadius + maxD;
    for (let i = 0; i < tries; i++) {
      const a = this.rand() * Math.PI * 2;
      const r = Math.sqrt(this.rand()) * R;
      const x = this.cx + Math.cos(a) * r;
      const z = this.cz + Math.sin(a) * r;
      const d = this.trackDist(x, z);
      if (d < minD + radius || d > maxD) continue;
      if (avoidWater && this.riverDist(x, z) < radius + 14) continue;
      if (!this.clearOfReserved(x, z, radius)) continue;
      return { x, z, r: radius };
    }
    return null;
  }

  reserve(spot: Spot | null) {
    if (spot) this.reserved.push(spot);
    return spot;
  }

  /** Scatter points for small scenery (trees, rocks). */
  scatter(count: number, minTrackDist: number, maxRadius: number, minRadius = 0) {
    const out: { x: number; z: number; y: number }[] = [];
    let guard = count * 8;
    while (out.length < count && guard-- > 0) {
      const a = this.rand() * Math.PI * 2;
      const r = minRadius + Math.sqrt(this.rand()) * (maxRadius - minRadius);
      const x = this.cx + Math.cos(a) * r;
      const z = this.cz + Math.sin(a) * r;
      if (this.trackDist(x, z) < minTrackDist) continue;
      const y = this.heightAt(x, z);
      if (y < -0.2) continue;
      if (!this.clearOfReserved(x, z, 3)) continue;
      out.push({ x, z, y });
    }
    return out;
  }
}
