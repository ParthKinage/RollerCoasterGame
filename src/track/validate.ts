import type { Segment } from '../types';
import { createPhysicsState, stepPhysics } from '../physics/coasterPhysics';
import { buildTrack, TrackBuildError } from './generator';
import type { TrackPath } from './trackPath';
import { SEGMENT_LABELS } from '../game/segments';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
  segmentIndex?: number;
}

export interface SimulationSummary {
  completed: boolean;
  duration: number;
  maxSpeed: number;
  maxG: number;
  minG: number;
  stallSegment: number | null;
  /** Thrill points a rider would get holding their hands up the whole ride. */
  thrillPotential: number;
}

export interface ValidationResult {
  ok: boolean;
  path: TrackPath | null;
  issues: ValidationIssue[];
  sim: SimulationSummary | null;
}

export const MIN_CLEARANCE = 0.9;
export const MAX_SEGMENTS = 40;

/** Thrill points per second for a rider with their hands up. Shared by gameplay and par estimation. */
export function thrillRate(speedMs: number, gVert: number) {
  const kmh = speedMs * 3.6;
  if (kmh < 25) return 0;
  return (kmh / 4) * (gVert < 0.35 ? 2 : 1);
}

/** Runs a passive ride (no player input) to find stalls and estimate scoring potential. */
export function simulateRide(path: TrackPath): SimulationSummary {
  const st = createPhysicsState();
  const dt = 1 / 60;
  let t = 0;
  let maxSpeed = 0;
  let maxG = 1;
  let minG = 1;
  let thrill = 0;
  let stallSegment: number | null = null;
  while (!st.finished && t < 600) {
    stepPhysics(path, st, dt, { boost: false, brake: false });
    t += dt;
    maxSpeed = Math.max(maxSpeed, st.v);
    if (!st.braking && !st.inStation) {
      maxG = Math.max(maxG, st.gVert);
      minG = Math.min(minG, st.gVert);
    }
    if (st.gVert < 4.2) thrill += thrillRate(st.v, st.gVert) * dt;
    if (st.rescueTime > 0.3 && stallSegment === null) stallSegment = path.segmentAt(st.s);
  }
  return { completed: st.finished, duration: t, maxSpeed, maxG, minG, stallSegment, thrillPotential: thrill };
}

function findSelfIntersection(path: TrackPath): [number, number] | null {
  const cell = 4;
  const grid = new Map<string, number[]>();
  const step = 2; // every metre
  const minGap = Math.ceil(14 / path.ds);
  const clearance2 = 3.0 * 3.0;
  for (let i = 0; i < path.count; i += step) {
    const x = path.pos[i * 3];
    const y = path.pos[i * 3 + 1];
    const z = path.pos[i * 3 + 2];
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const cz = Math.floor(z / cell);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const list = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!list) continue;
          for (const j of list) {
            if (i - j < minGap) continue;
            const ex = path.pos[j * 3] - x;
            const ey = path.pos[j * 3 + 1] - y;
            const ez = path.pos[j * 3 + 2] - z;
            if (ex * ex + ey * ey + ez * ez < clearance2) return [j, i];
          }
        }
    const key = `${cx},${cy},${cz}`;
    const list = grid.get(key);
    if (list) list.push(i);
    else grid.set(key, [i]);
  }
  return null;
}

const label = (segments: Segment[], i: number) => `#${i + 1} ${SEGMENT_LABELS[segments[i]?.type] ?? ''}`.trim();

/** Full validation used by the Track Builder before a test ride is allowed. */
export function validateTrack(segments: Segment[], simulate = true): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (segments.length < 3) issues.push({ level: 'error', message: 'Add at least one piece of track between the station and the brakes.' });
  if (segments.length > MAX_SEGMENTS) issues.push({ level: 'error', message: `Tracks are limited to ${MAX_SEGMENTS} segments.` });
  if (segments[0]?.type !== 'station') issues.push({ level: 'error', message: 'The track must start at the station.', segmentIndex: 0 });
  if (segments[segments.length - 1]?.type !== 'brake')
    issues.push({ level: 'error', message: 'The track must end with a brake run.', segmentIndex: segments.length - 1 });

  let path: TrackPath | null = null;
  try {
    path = buildTrack(segments);
  } catch (e) {
    const idx = e instanceof TrackBuildError ? e.segmentIndex : undefined;
    issues.push({ level: 'error', message: e instanceof Error ? e.message : 'Track could not be built.', segmentIndex: idx });
    return { ok: false, path: null, issues, sim: null };
  }

  // continuity: consecutive samples must be evenly spaced with no gaps or kinks
  for (let i = 1; i < path.count; i++) {
    const dx = path.pos[i * 3] - path.pos[(i - 1) * 3];
    const dy = path.pos[i * 3 + 1] - path.pos[(i - 1) * 3 + 1];
    const dz = path.pos[i * 3 + 2] - path.pos[(i - 1) * 3 + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const dot =
      path.tan[i * 3] * path.tan[(i - 1) * 3] +
      path.tan[i * 3 + 1] * path.tan[(i - 1) * 3 + 1] +
      path.tan[i * 3 + 2] * path.tan[(i - 1) * 3 + 2];
    if (d > path.ds * 1.6 || dot < 0.9) {
      const si = path.seg[i];
      issues.push({ level: 'error', message: `Track is disconnected at ${label(segments, si)}.`, segmentIndex: si });
      break;
    }
  }

  for (let i = 0; i < path.count; i++) {
    if (path.pos[i * 3 + 1] < MIN_CLEARANCE) {
      const si = path.seg[i];
      issues.push({ level: 'error', message: `${label(segments, si)} dips below ground level. Reduce its drop or raise the track first.`, segmentIndex: si });
      break;
    }
  }

  const hit = findSelfIntersection(path);
  if (hit) {
    const si = path.seg[hit[1]];
    issues.push({ level: 'error', message: `${label(segments, si)} collides with ${label(segments, path.seg[hit[0]])}.`, segmentIndex: si });
  }

  let sim: SimulationSummary | null = null;
  if (simulate && !issues.some((i) => i.level === 'error')) {
    sim = simulateRide(path);
    if (sim.stallSegment !== null) {
      issues.push({
        level: 'error',
        message: `The train runs out of speed on ${label(segments, sim.stallSegment)}. Add a taller lift hill or lower that element.`,
        segmentIndex: sim.stallSegment,
      });
    }
    if (sim.maxG > 6.5) issues.push({ level: 'warning', message: `Peak force of ${sim.maxG.toFixed(1)} G is very intense. Try larger loops or gentler drops.` });
    if (sim.minG < -1.8) issues.push({ level: 'warning', message: `Strong negative G (${sim.minG.toFixed(1)} G). Riders will float out of their seats!` });
  }

  return { ok: !issues.some((i) => i.level === 'error'), path, issues, sim };
}
