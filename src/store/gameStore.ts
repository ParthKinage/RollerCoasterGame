import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CustomTrack, LevelProgress, RideResult, RideSource, Screen, Settings, TrainColor } from '../types';
import { createDefaultCustomTrack } from '../game/defaultTrack';
import { LEVELS } from '../game/levels';

export const DEFAULT_SETTINGS: Settings = {
  graphics: 'medium',
  sfxVolume: 0.8,
  musicVolume: 0.5,
  cameraSensitivity: 1,
  motionEffects: true,
};

const emptyProgress = (): LevelProgress => ({ completed: false, bestScore: 0, stars: 0, maxSpeed: 0, maxHeight: 0, bestTime: 0 });

interface GameState {
  screen: Screen;
  previousScreen: Screen;
  settings: Settings;
  trainColor: TrainColor;
  progress: Record<string, LevelProgress>;
  customTrack: CustomTrack;
  customBest: number;
  selectedLevelId: string;
  rideSource: RideSource;
  lastResult: RideResult | null;

  setScreen: (s: Screen) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setTrainColor: (c: TrainColor) => void;
  setCustomTrack: (t: CustomTrack) => void;
  selectLevel: (id: string) => void;
  startRide: (src: RideSource) => void;
  recordResult: (r: Omit<RideResult, 'newBest' | 'unlockedLevel'>) => RideResult;
  resetProgress: () => void;
}

export const isLevelUnlocked = (progress: Record<string, LevelProgress>, levelId: string) => {
  const idx = LEVELS.findIndex((l) => l.id === levelId);
  if (idx <= 0) return true;
  return !!progress[LEVELS[idx - 1].id]?.completed;
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      screen: 'loading',
      previousScreen: 'menu',
      settings: DEFAULT_SETTINGS,
      trainColor: 'red',
      progress: {},
      customTrack: createDefaultCustomTrack(),
      customBest: 0,
      selectedLevelId: LEVELS[0].id,
      rideSource: { kind: 'level', levelId: LEVELS[0].id },
      lastResult: null,

      setScreen: (screen) => set({ screen, previousScreen: get().screen }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setTrainColor: (trainColor) => set({ trainColor }),
      setCustomTrack: (customTrack) => set({ customTrack }),
      selectLevel: (selectedLevelId) => set({ selectedLevelId }),
      startRide: (rideSource) => set({ rideSource, lastResult: null, screen: 'ride', previousScreen: get().screen }),
      recordResult: (r) => {
        const { progress, customBest } = get();
        let newBest = false;
        let unlockedLevel: string | undefined;
        if (r.source.kind === 'level') {
          const id = r.source.levelId;
          const prev = progress[id] ?? emptyProgress();
          const completed = r.completion >= 0.999;
          newBest = completed && r.score > prev.bestScore;
          const next: LevelProgress = {
            completed: prev.completed || completed,
            bestScore: completed ? Math.max(prev.bestScore, r.score) : prev.bestScore,
            stars: completed ? Math.max(prev.stars, r.stars) : prev.stars,
            maxSpeed: Math.max(prev.maxSpeed, r.maxSpeed),
            maxHeight: Math.max(prev.maxHeight, r.maxHeight),
            bestTime: completed ? (prev.bestTime ? Math.min(prev.bestTime, r.duration) : r.duration) : prev.bestTime,
          };
          const idx = LEVELS.findIndex((l) => l.id === id);
          if (completed && !prev.completed && idx >= 0 && idx < LEVELS.length - 1) unlockedLevel = LEVELS[idx + 1].id;
          set({ progress: { ...progress, [id]: next } });
        } else if (r.completion >= 0.999 && r.score > customBest) {
          newBest = true;
          set({ customBest: r.score });
        }
        const result: RideResult = { ...r, newBest, unlockedLevel };
        set({ lastResult: result });
        return result;
      },
      resetProgress: () => set({ progress: {}, customBest: 0 }),
    }),
    {
      name: 'roller-coaster-rush-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        settings: s.settings,
        trainColor: s.trainColor,
        progress: s.progress,
        customTrack: s.customTrack,
        customBest: s.customBest,
        selectedLevelId: s.selectedLevelId,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          customTrack: p.customTrack?.segments?.length ? p.customTrack : current.customTrack,
        };
      },
    },
  ),
);
