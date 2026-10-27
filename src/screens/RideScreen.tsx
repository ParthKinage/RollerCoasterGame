import { useCallback, useEffect, useMemo, useState } from 'react';
import { Home, Play, RotateCcw, Wrench, ChevronRight, Trophy } from 'lucide-react';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { useHudStore } from '../store/hudStore';
import { getLevel, LEVELS } from '../game/levels';
import { buildTrack } from '../track/generator';
import { simulateRide, validateTrack } from '../track/validate';
import { RideSession, type RideInput } from '../game/rideSession';
import { GameCanvas } from '../scene/GameCanvas';
import { CoasterScene } from '../scene/CoasterScene';
import { HUD } from '../ui/hud/HUD';
import { StarRow } from '../ui/Stars';
import { audio } from '../audio/audioEngine';
import type { RideResult } from '../types';

interface RideSetup {
  session: RideSession;
  envId: string;
  trackColor: string;
  supportColor?: string;
  trackWidth: number;
  title: string;
}

function useRideSetup(): RideSetup | { error: string } {
  const source = useGameStore((s) => s.rideSource);
  const custom = useGameStore((s) => s.customTrack);
  return useMemo(() => {
    try {
      if (source.kind === 'level') {
        const level = getLevel(source.levelId) ?? LEVELS[0];
        const path = buildTrack(level.segments(), { yaw: level.yaw, start: new THREE.Vector3(0, 1.6, 0) });
        const sim = simulateRide(path);
        return {
          session: new RideSession(path, source, sim.thrillPotential),
          envId: level.environment,
          trackColor: level.trackColor,
          supportColor: level.supportColor,
          trackWidth: 1.2,
          title: level.name,
        };
      }
      const v = validateTrack(custom.segments);
      if (!v.ok || !v.path || !v.sim) {
        return { error: v.issues.find((i) => i.level === 'error')?.message ?? 'This track cannot be ridden yet.' };
      }
      return {
        session: new RideSession(v.path, source, v.sim.thrillPotential),
        envId: custom.environment,
        trackColor: custom.color,
        trackWidth: custom.width,
        title: 'Custom Coaster',
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Track failed to build.' };
    }
    // the session is created once per ride request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;

function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 1.5, dur: 2.5 + Math.random() * 2, color: ['#facc15', '#ef4444', '#3b82f6', '#22c55e', '#f97316'][i % 5] })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <div key={i} className="confetti" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
      ))}
    </div>
  );
}

function Results({ result, onRetry, onExit, onNext, isCustom }: { result: RideResult; onRetry: () => void; onExit: () => void; onNext?: () => void; isCustom: boolean }) {
  const rows: [string, string][] = [
    ['Max speed', `${Math.round(result.maxSpeed)} km/h`],
    ['Max height', `${Math.round(result.maxHeight)} m`],
    ['Ride time', fmt(result.duration)],
    ['Peak G-force', `${result.maxG.toFixed(1)} G / ${result.minG.toFixed(1)} G`],
    ['Inversions', `${result.inversions}`],
    ['Track completed', `${Math.round(result.completion * 100)}%`],
  ];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      {result.stars > 0 && <Confetti />}
      <div className="panel animate-fade-up relative w-full max-w-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="label">{result.completion >= 1 ? 'Ride complete' : 'Ride ended'}</div>
            <div className="font-display text-3xl text-white">Score {result.score.toLocaleString()}</div>
          </div>
          <StarRow count={result.stars} size={26} />
        </div>
        {result.newBest && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-yellow-500/15 px-3 py-2 text-sm font-semibold text-yellow-300">
            <Trophy size={16} /> New personal best!
          </div>
        )}
        {result.unlockedLevel && (
          <div className="mt-2 rounded-lg bg-green-500/15 px-3 py-2 text-sm font-semibold text-green-300">Unlocked: {getLevel(result.unlockedLevel)?.name}</div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="panel-soft px-3 py-2">
              <div className="text-[11px] text-slate-400">{k}</div>
              <div className="font-bold text-white">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-400">
          Thrill points {result.thrill} · Stars: 1 for finishing, more for holding your hands up on fast sections without overdoing the heavy-G parts.
          {result.rescued && ' Safety tyres had to push the train.'}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-dark flex-1" onClick={onRetry}>
            <RotateCcw size={18} /> Ride again
          </button>
          {onNext && (
            <button className="btn-green flex-1" onClick={onNext}>
              Next level <ChevronRight size={18} />
            </button>
          )}
          <button className="btn-primary flex-1" onClick={onExit}>
            {isCustom ? <Wrench size={18} /> : <Home size={18} />} {isCustom ? 'Back to builder' : 'Levels'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RideScreen() {
  const setup = useRideSetup();
  const setScreen = useGameStore((s) => s.setScreen);
  const startRide = useGameStore((s) => s.startRide);
  const recordResult = useGameStore((s) => s.recordResult);
  const trainColor = useGameStore((s) => s.trainColor);
  const progress = useGameStore((s) => s.progress);
  const status = useHudStore((s) => s.status);
  const [cameraMode, setCameraMode] = useState<'front' | 'chase'>('front');
  const [result, setResult] = useState<RideResult | null>(null);
  const session = 'session' in setup ? setup.session : null;
  const isCustom = session?.source.kind === 'custom';

  const exit = useCallback(() => {
    audio.click();
    setScreen(isCustom ? 'builder' : 'levels');
  }, [isCustom, setScreen]);

  // ride lifecycle: audio + finish handling
  useEffect(() => {
    if (!session) return;
    // dev-only hook so automated tests can fast-forward a ride
    if (import.meta.env.DEV) (window as unknown as { __rcrSession?: RideSession }).__rcrSession = session;
    audio.unlock();
    audio.setMusic('ride');
    audio.startRide();
    session.onFinish = (s) => {
      const r = recordResult(s.buildResult());
      audio.complete(r.stars);
      setTimeout(() => setResult(r), 900);
    };
    return () => {
      session.onFinish = undefined;
      audio.stopRide();
    };
  }, [session, recordResult]);

  const setInput = useCallback(
    (patch: Partial<RideInput>) => {
      if (session) Object.assign(session.input, patch);
    },
    [session],
  );

  const pause = useCallback(() => {
    session?.pause();
    audio.click();
  }, [session]);

  const restart = useCallback(() => {
    setResult(null);
    session?.restart();
    audio.click();
  }, [session]);

  // keyboard controls
  useEffect(() => {
    if (!session) return;
    const map = (e: KeyboardEvent, down: boolean) => {
      switch (e.code) {
        case 'Space':
          session.input.handsUp = down;
          e.preventDefault();
          break;
        case 'KeyW':
        case 'ArrowUp':
        case 'ShiftLeft':
          session.input.boost = down;
          break;
        case 'KeyS':
        case 'ArrowDown':
          session.input.brake = down;
          break;
        case 'KeyC':
          if (down) setCameraMode((m) => (m === 'front' ? 'chase' : 'front'));
          break;
        case 'Escape':
        case 'KeyP':
          if (down) {
            if (session.status === 'paused') session.resume();
            else session.pause();
          }
          break;
        case 'KeyR':
          if (down && session.status === 'paused') restart();
          break;
      }
    };
    const kd = (e: KeyboardEvent) => !e.repeat && map(e, true);
    const ku = (e: KeyboardEvent) => map(e, false);
    const blur = () => Object.assign(session.input, { boost: false, brake: false, handsUp: false });
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
    };
  }, [session, restart]);

  // auto-pause when the tab is hidden
  useEffect(() => {
    const vis = () => document.hidden && session?.pause();
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [session]);

  if ('error' in setup) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="panel max-w-md p-6 text-center">
          <div className="font-display text-2xl text-orange-400">Track not ready</div>
          <p className="mt-2 text-sm text-slate-300">{setup.error}</p>
          <button className="btn-primary mt-4" onClick={() => setScreen('builder')}>
            <Wrench size={18} /> Open Track Builder
          </button>
        </div>
      </div>
    );
  }

  const levelIdx = session!.source.kind === 'level' ? LEVELS.findIndex((l) => l.id === (session!.source as { levelId: string }).levelId) : -1;
  const nextLevel = levelIdx >= 0 && levelIdx < LEVELS.length - 1 ? LEVELS[levelIdx + 1] : null;
  const nextUnlocked = nextLevel && (progress[LEVELS[levelIdx].id]?.completed ?? false);

  return (
    <div className="relative h-full w-full">
      <GameCanvas label={`Loading ${setup.title}`}>
        <CoasterScene
          session={setup.session}
          envId={setup.envId}
          trackColor={setup.trackColor}
          supportColor={setup.supportColor}
          trackWidth={setup.trackWidth}
          trainColor={trainColor}
          cameraMode={cameraMode}
        />
      </GameCanvas>
      {!result && (
        <HUD onPause={pause} cameraMode={cameraMode} onToggleCamera={() => setCameraMode((m) => (m === 'front' ? 'chase' : 'front'))} setInput={setInput} />
      )}
      {status === 'paused' && !result && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="panel animate-fade-up w-full max-w-xs p-6">
            <div className="font-display text-center text-3xl text-white">Paused</div>
            <div className="mt-1 text-center text-sm text-slate-400">{setup.title}</div>
            <div className="mt-5 flex flex-col gap-2">
              <button className="btn-green" onClick={() => (session!.resume(), audio.click())}>
                <Play size={18} /> Resume
              </button>
              <button className="btn-dark" onClick={restart}>
                <RotateCcw size={18} /> Restart ride
              </button>
              <button className="btn-dark" onClick={exit}>
                {isCustom ? <Wrench size={18} /> : <Home size={18} />} {isCustom ? 'Exit to builder' : 'Exit to level select'}
              </button>
              <button className="btn-dark" onClick={() => (audio.click(), setScreen('menu'))}>
                <Home size={18} /> Main menu
              </button>
            </div>
          </div>
        </div>
      )}
      {result && (
        <Results
          result={result}
          isCustom={isCustom}
          onRetry={restart}
          onExit={exit}
          onNext={nextLevel && nextUnlocked ? () => (audio.click(), startRide({ kind: 'level', levelId: nextLevel.id })) : undefined}
        />
      )}
    </div>
  );
}
