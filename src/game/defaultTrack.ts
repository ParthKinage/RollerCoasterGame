import type { CustomTrack } from '../types';
import { s } from './segments';

export function createDefaultCustomTrack(): CustomTrack {
  return {
    segments: [
      s('station', 30),
      s('lift', 45, 26),
      s('drop', 46, 23),
      s('curve', 50, 0, 120, 55),
      s('hill', 55, 10),
      s('loop', 0, 18, 1),
      s('curve', 50, 0, -150, 55),
      s('hill', 35, 5),
      s('brake', 40),
    ],
    color: '#d62020',
    width: 1.2,
    environment: 'grid',
  };
}
