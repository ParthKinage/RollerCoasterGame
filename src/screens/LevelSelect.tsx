import { useMemo } from 'react';
import { ArrowLeft, Lock, Play, Gauge, Mountain, Timer, Trophy, Palette } from 'lucide-react';
import * as THREE from 'three';
import { useGameStore, isLevelUnlocked } from '../store/gameStore';
import { LEVELS, getLevel } from '../game/levels';
import { buildTrack } from '../track/generator';
import { RideSession } from '../game/rideSession';
import { GameCanvas } from '../scene/GameCanvas';
import { CoasterScene } from '../scene/CoasterScene';
import { LevelArt } from '../ui/LevelArt';
import { StarRow } from '../ui/Stars';
import { audio } from '../audio/audioEngine';

const DIFF_COLORS = ['', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];

export function LevelSelect() {
  const setScreen = useGameStore((s) => s.setScreen);
  const selectedId = useGameStore((s) => s.selectedLevelId);
  const selectLevel = useGameStore((s) => s.selectLevel);
  const startRide = useGameStore((s) => s.startRide);
  const progress = useGameStore((s) => s.progress);
  const trainColor = useGameStore((s) => s.trainColor);
  const level = getLevel(selectedId) ?? LEVELS[0];
  const unlocked = isLevelUnlocked(progress, level.id);
  const best = progress[level.id];

  const session = useMemo(() => {
    const path = buildTrack(level.segments(), { yaw: level.yaw, start: new THREE.Vector3(0, 1.6, 0) });
    return new RideSession(path, { kind: 'level', levelId: level.id }, 1, true);
  }, [level]);

  const play = () => {
    if (!unlocked) return;
    audio.unlock();
    audio.click();
    startRide({ kind: 'level', levelId: level.id });
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GameCanvas label={`Loading ${level.name}`}>
        <CoasterScene
          key={level.id}
          session={session}
          envId={level.environment}
          trackColor={level.trackColor}
          supportColor={level.supportColor}
          trainColor={trainColor}
          cameraMode="orbit"
          demo
        />
      </GameCanvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070c18] via-[#070c18]/40 to-transparent" />

      <div className="absolute left-3 right-3 top-3 flex items-center justify-between sm:left-6 sm:right-6 sm:top-5">
        <button className="btn-dark" onClick={() => (audio.click(), setScreen('menu'))}>
          <ArrowLeft size={18} /> Menu
        </button>
        <button className="btn-dark" onClick={() => (audio.click(), setScreen('customize'))}>
          <Palette size={18} /> Customize train
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex max-h-full flex-col gap-3 overflow-y-auto p-3 sm:p-6 lg:flex-row lg:items-end">
        <div className="panel animate-fade-up flex-1 p-4 sm:p-5">
          <h2 className="font-display mb-3 text-2xl tracking-wide text-white">SELECT LEVEL</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {LEVELS.map((l, i) => {
              const open = isLevelUnlocked(progress, l.id);
              const p = progress[l.id];
              const sel = l.id === level.id;
              return (
                <button
                  key={l.id}
                  onClick={() => (audio.click(), selectLevel(l.id))}
                  onDoubleClick={() => open && startRide({ kind: 'level', levelId: l.id })}
                  className={`group overflow-hidden rounded-xl border-2 bg-[#121b2e] text-left transition ${
                    sel ? 'border-yellow-400 shadow-[0_0_24px_rgba(250,204,21,0.25)]' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="relative">
                    <LevelArt env={l.environment} className={`h-24 w-full sm:h-28 ${open ? '' : 'grayscale-[60%] brightness-50'}`} />
                    {!open && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-black/60 p-2.5">
                          <Lock size={20} className="text-slate-200" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="truncate text-sm font-semibold text-white">
                      {i + 1}. {l.name}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <StarRow count={p?.stars ?? 0} size={14} />
                      <span className={`text-[11px] font-semibold ${DIFF_COLORS[l.difficulty]}`}>{l.difficultyLabel}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel animate-fade-up w-full p-4 sm:p-5 lg:w-[340px]" style={{ animationDelay: '0.08s' }}>
          <div className="label">Level {level.index + 1}</div>
          <div className="font-display text-3xl text-white">{level.name}</div>
          <p className="mt-1 text-sm text-slate-300">{level.tagline}</p>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className={`font-semibold ${DIFF_COLORS[level.difficulty]}`}>Difficulty: {level.difficultyLabel}</span>
            <StarRow count={best?.stars ?? 0} size={16} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="panel-soft flex items-center gap-2 px-3 py-2">
              <Trophy size={16} className="text-yellow-400" /> {best?.bestScore ? best.bestScore.toLocaleString() : '—'}
            </div>
            <div className="panel-soft flex items-center gap-2 px-3 py-2">
              <Gauge size={16} className="text-red-400" /> {best?.maxSpeed ? `${Math.round(best.maxSpeed)} km/h` : '—'}
            </div>
            <div className="panel-soft flex items-center gap-2 px-3 py-2">
              <Mountain size={16} className="text-sky-400" /> {best?.maxHeight ? `${Math.round(best.maxHeight)} m` : '—'}
            </div>
            <div className="panel-soft flex items-center gap-2 px-3 py-2">
              <Timer size={16} className="text-green-400" /> {best?.bestTime ? `${best.bestTime.toFixed(1)} s` : '—'}
            </div>
          </div>
          {unlocked ? (
            <button className="btn-green mt-4 w-full py-3 text-lg" onClick={play}>
              <Play size={20} className="fill-white" /> Play
            </button>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <Lock size={16} /> Complete {LEVELS[level.index - 1]?.name} to unlock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
