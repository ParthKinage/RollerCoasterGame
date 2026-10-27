import type { EnvironmentId, Segment } from '../types';
import { s } from './segments';

export interface LevelDef {
  id: string;
  index: number;
  name: string;
  tagline: string;
  environment: EnvironmentId;
  difficulty: 1 | 2 | 3 | 4;
  difficultyLabel: string;
  trackColor: string;
  supportColor: string;
  /** Initial heading of the station in radians. */
  yaw: number;
  segments: () => Segment[];
}

export const LEVELS: LevelDef[] = [
  {
    id: 'sunny-park',
    index: 0,
    name: 'Sunny Park',
    tagline: 'A family classic winding over the river past the Ferris wheel.',
    environment: 'sunny',
    difficulty: 1,
    difficultyLabel: 'Easy',
    trackColor: '#d62020',
    supportColor: '#e8e8ea',
    yaw: 0,
    segments: () => [
      s('station', 30),
      s('lift', 50, 30),
      s('straight', 6),
      s('drop', 52, 27),
      s('curve', 55, 0, 140, 55),
      s('hill', 65, 13),
      s('curve', 50, 0, -120, 55),
      s('loop', 0, 20, 1),
      s('straight', 8),
      s('hill', 45, 7),
      s('curve', 50, 0, 150, 55),
      s('hill', 35, 4),
      s('curve', 30, 0, 50, 25),
      s('brake', 40),
    ],
  },
  {
    id: 'mountain-rush',
    index: 1,
    name: 'Mountain Rush',
    tagline: 'High-altitude thrills between snowy peaks with a corkscrew finale.',
    environment: 'mountain',
    difficulty: 2,
    difficultyLabel: 'Medium',
    trackColor: '#1f6fd6',
    supportColor: '#d9dde4',
    yaw: 0.6,
    segments: () => [
      s('station', 30),
      s('lift', 60, 40),
      s('curve', 30, 0, -90, 10),
      s('drop', 72, 37),
      s('hill', 80, 17),
      s('curve', 60, 0, 160, 60),
      s('loop', 0, 24, -1),
      s('curve', 55, 0, -130, 60),
      s('corkscrew', 44, 8, 1),
      s('hill', 50, 8),
      s('curve', 55, 0, 160, 60),
      s('corkscrew', 42, 7, -1),
      s('curve', 30, 0, -40, 20),
      s('brake', 45),
    ],
  },
  {
    id: 'night-thrill',
    index: 2,
    name: 'Night Thrill',
    tagline: 'Neon-lit inversions under the stars. Keep your hands up!',
    environment: 'night',
    difficulty: 3,
    difficultyLabel: 'Hard',
    trackColor: '#a020f0',
    supportColor: '#3a3f55',
    yaw: -0.4,
    segments: () => [
      s('station', 30),
      s('lift', 55, 38),
      s('straight', 5),
      s('drop', 68, 35, 30, 20),
      s('loop', 0, 24, 1),
      s('curve', 55, 6, 150, 55),
      s('drop', 35, 8),
      s('corkscrew', 44, 8, 1),
      s('curve', 50, 0, -150, 60),
      s('loop', 0, 20, -1),
      s('hill', 45, 8),
      s('curve', 55, 0, 140, 60),
      s('corkscrew', 42, 7, -1),
      s('curve', 30, 0, 60, 25),
      s('brake', 45),
    ],
  },
  {
    id: 'canyon-fall',
    index: 3,
    name: 'Canyon Fall',
    tagline: 'A towering lift and a near-vertical plunge into the canyon.',
    environment: 'canyon',
    difficulty: 4,
    difficultyLabel: 'Extreme',
    trackColor: '#f08a12',
    supportColor: '#5b4636',
    yaw: 1.2,
    segments: () => [
      s('station', 30),
      s('lift', 75, 55),
      s('curve', 26, 0, 90, 10),
      s('drop', 80, 52),
      s('loop', 0, 28, 1),
      s('hill', 90, 20),
      s('curve', 65, 0, -180, 65),
      s('corkscrew', 46, 9, 1),
      s('hill', 72, 12),
      s('curve', 55, 0, 160, 60),
      s('loop', 0, 22, -1),
      s('corkscrew', 42, 7, -1),
      s('curve', 40, 0, -70, 30),
      s('brake', 50),
    ],
  },
];

export const getLevel = (id: string) => LEVELS.find((l) => l.id === id);
