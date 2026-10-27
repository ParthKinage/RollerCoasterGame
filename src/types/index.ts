export type Screen = 'loading' | 'menu' | 'settings' | 'exit' | 'levels' | 'ride' | 'builder' | 'customize';

export type SegmentType =
  | 'station'
  | 'straight'
  | 'curve'
  | 'lift'
  | 'drop'
  | 'hill'
  | 'loop'
  | 'corkscrew'
  | 'brake';

/** One piece of track. Units: metres and degrees. */
export interface Segment {
  id: string;
  type: SegmentType;
  /** Horizontal length (straight/curve/lift/drop/hill/corkscrew). */
  length: number;
  /** Height change, hill height, or loop/corkscrew diameter depending on type. */
  height: number;
  /** Turn angle in degrees; positive turns right. Loops/corkscrews use the sign for direction. */
  turn: number;
  /** Bank angle in degrees applied at the middle of the segment. */
  bank: number;
}

export type EnvironmentId = 'sunny' | 'mountain' | 'night' | 'canyon' | 'grid';
export type TrainColor = 'red' | 'blue' | 'yellow' | 'green';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type CameraMode = 'front' | 'chase';

export interface Settings {
  graphics: GraphicsQuality;
  sfxVolume: number;
  musicVolume: number;
  cameraSensitivity: number;
  motionEffects: boolean;
}

export interface LevelProgress {
  completed: boolean;
  bestScore: number;
  stars: number;
  maxSpeed: number;
  maxHeight: number;
  bestTime: number;
}

export interface CustomTrack {
  segments: Segment[];
  color: string;
  width: number;
  environment: EnvironmentId;
}

export type RideSource = { kind: 'level'; levelId: string } | { kind: 'custom' };

export interface RideResult {
  source: RideSource;
  score: number;
  stars: number;
  maxSpeed: number;
  maxHeight: number;
  maxG: number;
  minG: number;
  duration: number;
  inversions: number;
  completion: number;
  thrill: number;
  rescued: boolean;
  newBest: boolean;
  unlockedLevel?: string;
}
