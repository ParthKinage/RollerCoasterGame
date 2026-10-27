export type TerrainStyle = 'park' | 'snow' | 'canyon' | 'night' | 'grid';
export type TreeKind = 'round' | 'pine' | 'cactus';

export interface EnvPreset {
  id: string;
  label: string;
  sky: { top: string; horizon: string; bottom: string; sunGlow: string };
  sunDir: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  hemi: { sky: string; ground: string; intensity: number };
  ambient: number;
  fog: { color: string; near: number; far: number };
  terrain: TerrainStyle;
  groundColors: [string, string, string];
  hillAmp: number;
  trees: { kind: TreeKind; density: number; colors: string[] } | null;
  mountains: { count: number; color: string; snowLine: number; height: [number, number]; plateau?: boolean; near?: boolean };
  water: { color: string; river: boolean; lake: boolean } | null;
  ferrisWheel: boolean;
  parkRides: boolean;
  chalets: boolean;
  neon: boolean;
  stars: boolean;
  clouds: { count: number; color: string; opacity: number };
  rocks: boolean;
  exposure: number;
}

export const PRESETS: Record<string, EnvPreset> = {
  sunny: {
    id: 'sunny',
    label: 'Sunny Park',
    sky: { top: '#2f7fe0', horizon: '#bfe3ff', bottom: '#cfe7f7', sunGlow: '#fff4cf' },
    sunDir: [0.5, 0.75, 0.35],
    sunColor: '#fff3dc',
    sunIntensity: 2.6,
    hemi: { sky: '#bfe0ff', ground: '#4d6b2e', intensity: 0.9 },
    ambient: 0.25,
    fog: { color: '#cfe6f5', near: 220, far: 1100 },
    terrain: 'park',
    groundColors: ['#4f8f2f', '#6aa83a', '#8d7a4a'],
    hillAmp: 26,
    trees: { kind: 'round', density: 1, colors: ['#2f6b1e', '#3d7f25', '#4f8f2b', '#2a5c1a'] },
    mountains: { count: 22, color: '#6f7d6a', snowLine: 0.85, height: [90, 200] },
    water: { color: '#2a8fb8', river: true, lake: false },
    ferrisWheel: true,
    parkRides: true,
    chalets: false,
    neon: false,
    stars: false,
    clouds: { count: 26, color: '#ffffff', opacity: 0.85 },
    rocks: false,
    exposure: 1.0,
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset Park',
    sky: { top: '#2a3d7a', horizon: '#ff9a4a', bottom: '#5a3a3a', sunGlow: '#ffd27a' },
    sunDir: [-0.2, 0.12, 0.98],
    sunColor: '#ffb066',
    sunIntensity: 2.4,
    hemi: { sky: '#ffbe8a', ground: '#3a3020', intensity: 0.75 },
    ambient: 0.22,
    fog: { color: '#d9946a', near: 200, far: 1000 },
    terrain: 'park',
    groundColors: ['#3f6f25', '#5b8a30', '#7a6440'],
    hillAmp: 26,
    trees: { kind: 'round', density: 1, colors: ['#2a5a1a', '#36691f', '#456f22', '#24501a'] },
    mountains: { count: 22, color: '#5d5a66', snowLine: 0.9, height: [100, 220] },
    water: { color: '#3a6f9a', river: true, lake: false },
    ferrisWheel: true,
    parkRides: true,
    chalets: false,
    neon: false,
    stars: false,
    clouds: { count: 30, color: '#ffc29a', opacity: 0.9 },
    rocks: false,
    exposure: 1.05,
  },
  mountain: {
    id: 'mountain',
    label: 'Mountain Rush',
    sky: { top: '#3d7fd0', horizon: '#d6ecff', bottom: '#e6f2fb', sunGlow: '#ffffff' },
    sunDir: [-0.4, 0.6, 0.55],
    sunColor: '#ffffff',
    sunIntensity: 2.8,
    hemi: { sky: '#d8ecff', ground: '#9aa4ad', intensity: 1.0 },
    ambient: 0.3,
    fog: { color: '#dceaf5', near: 250, far: 1300 },
    terrain: 'snow',
    groundColors: ['#e9eef3', '#cfd8df', '#7d8a78'],
    hillAmp: 40,
    trees: { kind: 'pine', density: 1, colors: ['#1f4d32', '#24573a', '#1a4029', '#2c5e40'] },
    mountains: { count: 26, color: '#6b7380', snowLine: 0.45, height: [180, 360], near: true },
    water: { color: '#3aa0c8', river: false, lake: true },
    ferrisWheel: false,
    parkRides: false,
    chalets: true,
    neon: false,
    stars: false,
    clouds: { count: 22, color: '#ffffff', opacity: 0.9 },
    rocks: true,
    exposure: 0.95,
  },
  night: {
    id: 'night',
    label: 'Night Thrill',
    sky: { top: '#03040e', horizon: '#251a4a', bottom: '#0b0b1a', sunGlow: '#9fb4ff' },
    sunDir: [0.3, 0.5, -0.6],
    sunColor: '#8fa4ff',
    sunIntensity: 0.6,
    hemi: { sky: '#5a60b8', ground: '#2a2148', intensity: 1.0 },
    ambient: 0.3,
    fog: { color: '#1a1433', near: 120, far: 800 },
    terrain: 'night',
    groundColors: ['#2a4a38', '#33573f', '#3a3a52'],
    hillAmp: 20,
    trees: { kind: 'round', density: 0.6, colors: ['#123020', '#173826', '#0f2a1b'] },
    mountains: { count: 18, color: '#1c1b2e', snowLine: 2, height: [80, 160] },
    water: { color: '#1b2550', river: true, lake: false },
    ferrisWheel: true,
    parkRides: true,
    chalets: false,
    neon: true,
    stars: true,
    clouds: { count: 0, color: '#333', opacity: 0 },
    rocks: false,
    exposure: 1.15,
  },
  canyon: {
    id: 'canyon',
    label: 'Canyon Fall',
    sky: { top: '#3b7fc4', horizon: '#f6cf9a', bottom: '#d29b6a', sunGlow: '#fff0c0' },
    sunDir: [0.7, 0.45, -0.2],
    sunColor: '#ffe2b8',
    sunIntensity: 2.9,
    hemi: { sky: '#ffd9a8', ground: '#8a4a28', intensity: 0.85 },
    ambient: 0.25,
    fog: { color: '#e8b98a', near: 220, far: 1200 },
    terrain: 'canyon',
    groundColors: ['#c46a32', '#d98c4a', '#9c4a24'],
    hillAmp: 18,
    trees: { kind: 'cactus', density: 0.35, colors: ['#4f7a3a', '#5c8a42', '#3f6a30'] },
    mountains: { count: 30, color: '#b0552a', snowLine: 2, height: [90, 200], plateau: true, near: true },
    water: { color: '#3f8a8f', river: true, lake: false },
    ferrisWheel: false,
    parkRides: false,
    chalets: false,
    neon: false,
    stars: false,
    clouds: { count: 10, color: '#fff5e6', opacity: 0.7 },
    rocks: true,
    exposure: 1.0,
  },
  grid: {
    id: 'grid',
    label: 'Builder Grid',
    sky: { top: '#3a86e0', horizon: '#cde7ff', bottom: '#dcefff', sunGlow: '#ffffff' },
    sunDir: [0.45, 0.8, 0.3],
    sunColor: '#ffffff',
    sunIntensity: 2.5,
    hemi: { sky: '#cfe6ff', ground: '#4a7a2a', intensity: 1.0 },
    ambient: 0.3,
    fog: { color: '#d2e8f8', near: 300, far: 1400 },
    terrain: 'grid',
    groundColors: ['#4f8f2f', '#5b9a35', '#6aa83a'],
    hillAmp: 0,
    trees: { kind: 'round', density: 0.35, colors: ['#2f6b1e', '#3d7f25', '#4f8f2b'] },
    mountains: { count: 20, color: '#6b7a6a', snowLine: 0.8, height: [100, 220] },
    water: null,
    ferrisWheel: false,
    parkRides: false,
    chalets: false,
    neon: false,
    stars: false,
    clouds: { count: 18, color: '#ffffff', opacity: 0.85 },
    rocks: false,
    exposure: 1.0,
  },
};

export const ENVIRONMENT_OPTIONS: { id: 'grid' | 'sunny' | 'mountain' | 'night' | 'canyon'; label: string }[] = [
  { id: 'grid', label: 'Builder Grid' },
  { id: 'sunny', label: 'Sunny Park' },
  { id: 'mountain', label: 'Mountain' },
  { id: 'night', label: 'Night' },
  { id: 'canyon', label: 'Canyon' },
];
