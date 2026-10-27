import type { Segment, SegmentType } from '../types';
import { uid } from '../utils/math';

export const SEGMENT_DEFAULTS: Record<SegmentType, Omit<Segment, 'id' | 'type'>> = {
  station: { length: 30, height: 0, turn: 0, bank: 0 },
  straight: { length: 20, height: 0, turn: 0, bank: 0 },
  curve: { length: 40, height: 0, turn: 90, bank: 35 },
  lift: { length: 45, height: 25, turn: 0, bank: 0 },
  drop: { length: 40, height: 22, turn: 0, bank: 0 },
  hill: { length: 40, height: 12, turn: 0, bank: 0 },
  loop: { length: 30, height: 16, turn: 1, bank: 0 },
  corkscrew: { length: 32, height: 8, turn: 1, bank: 0 },
  brake: { length: 40, height: 0, turn: 0, bank: 0 },
};

export interface ParamLimits {
  length?: [number, number];
  height?: [number, number];
  turn?: [number, number];
  bank?: [number, number];
}

/** Which parameters are editable for each segment type, and their ranges. */
export const SEGMENT_LIMITS: Record<SegmentType, ParamLimits> = {
  station: {},
  brake: {},
  straight: { length: [5, 80], bank: [-60, 60] },
  curve: { length: [15, 90], height: [-25, 25], turn: [-270, 270], bank: [0, 80] },
  lift: { length: [15, 90], height: [5, 60], turn: [-90, 90], bank: [0, 30] },
  drop: { length: [15, 90], height: [5, 60], turn: [-180, 180], bank: [0, 70] },
  hill: { length: [15, 80], height: [3, 35], turn: [-120, 120], bank: [0, 60] },
  loop: { height: [10, 30], turn: [-1, 1] },
  corkscrew: { length: [20, 60], height: [5, 14], turn: [-1, 1] },
};

export const SEGMENT_LABELS: Record<SegmentType, string> = {
  station: 'Station',
  straight: 'Straight',
  curve: 'Curve',
  lift: 'Lift Hill',
  drop: 'Drop',
  hill: 'Hill',
  loop: 'Loop',
  corkscrew: 'Corkscrew',
  brake: 'Brake Run',
};

export function makeSegment(type: SegmentType, overrides: Partial<Omit<Segment, 'id' | 'type'>> = {}): Segment {
  return { id: uid(), type, ...SEGMENT_DEFAULTS[type], ...overrides };
}

/** Shorthand used by level definitions: s('curve', length, height, turn, bank). */
export function s(type: SegmentType, length?: number, height?: number, turn?: number, bank?: number): Segment {
  const d = SEGMENT_DEFAULTS[type];
  return {
    id: uid(),
    type,
    length: length ?? d.length,
    height: height ?? d.height,
    turn: turn ?? d.turn,
    bank: bank ?? d.bank,
  };
}
