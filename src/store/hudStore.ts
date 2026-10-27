import { create } from 'zustand';

export type RideStatus = 'countdown' | 'running' | 'paused' | 'finished';

export interface HudState {
  status: RideStatus;
  countdown: number;
  speed: number; // km/h
  height: number; // m
  time: number; // s
  gForce: number;
  progress: number; // 0..1
  boost: number; // 0..1
  score: number;
  onChain: boolean;
  handsUp: boolean;
  message: string | null;
  messageTone: 'good' | 'bad' | 'info';
}

export const initialHud: HudState = {
  status: 'countdown',
  countdown: 3,
  speed: 0,
  height: 0,
  time: 0,
  gForce: 1,
  progress: 0,
  boost: 1,
  score: 0,
  onChain: false,
  handsUp: false,
  message: null,
  messageTone: 'info',
};

export const useHudStore = create<HudState>(() => ({ ...initialHud }));
