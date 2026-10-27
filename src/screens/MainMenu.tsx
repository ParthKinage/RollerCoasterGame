import { useMemo } from 'react';
import { Play, Wrench, Settings as SettingsIcon, LogOut, Palette, ArrowLeft } from 'lucide-react';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../game/levels';
import { buildTrack } from '../track/generator';
import { RideSession } from '../game/rideSession';
import { GameCanvas } from '../scene/GameCanvas';
import { CoasterScene } from '../scene/CoasterScene';
import { SettingsPanel } from './SettingsPanel';
import { audio } from '../audio/audioEngine';

function Title({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <div className={`leading-[0.85] ${size === 'lg' ? '' : 'scale-75 origin-left'}`}>
      <div className="title-text text-[56px] sm:text-[84px] lg:text-[104px]">ROLLER</div>
      <div className="title-text -mt-1 text-[56px] sm:text-[84px] lg:text-[104px]">COASTER</div>
      <div className="relative -mt-1 ml-16 inline-flex items-center sm:ml-28">
        <svg className="absolute -left-10 top-1/2 h-10 w-[150%] -translate-y-1/2 opacity-90" viewBox="0 0 300 40" preserveAspectRatio="none">
          <path d="M0 30 Q 80 2 150 20 T 300 10" stroke="#1d4ed8" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M0 30 Q 80 2 150 20 T 300 10" stroke="#93c5fd" strokeWidth="3" fill="none" strokeDasharray="6 8" />
        </svg>
        <span className="rush-text relative text-4xl sm:text-5xl lg:text-6xl">RUSH</span>
      </div>
    </div>
  );
}

export function MainMenu() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const trainColor = useGameStore((s) => s.trainColor);
  const level = LEVELS[0];
  const session = useMemo(() => {
    const path = buildTrack(level.segments(), { yaw: level.yaw, start: new THREE.Vector3(0, 1.6, 0) });
    const s = new RideSession(path, { kind: 'level', levelId: level.id }, 1, true);
    return s;
  }, [level]);

  const go = (target: Parameters<typeof setScreen>[0]) => {
    audio.unlock();
    audio.click();
    setScreen(target);
  };

  const items = [
    { label: 'Play', icon: <Play size={22} className="fill-white" />, onClick: () => go('levels'), primary: true },
    { label: 'Track Builder', icon: <Wrench size={22} />, onClick: () => go('builder') },
    { label: 'Customize Train', icon: <Palette size={22} />, onClick: () => go('customize') },
    { label: 'Settings', icon: <SettingsIcon size={22} />, onClick: () => go('settings') },
    { label: 'Exit', icon: <LogOut size={22} />, onClick: () => go('exit') },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GameCanvas label="Building the park">
        <CoasterScene session={session} envId="sunset" trackColor={level.trackColor} supportColor={level.supportColor} trainColor={trainColor} cameraMode="front" demo />
      </GameCanvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/10 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-10">
        <div className="animate-fade-up">
          <Title />
        </div>
        <div className="flex w-full max-w-[300px] flex-col gap-3 pb-2 sm:pb-6">
          {items.map((it, i) => (
            <button
              key={it.label}
              onMouseEnter={() => audio.hover()}
              onClick={it.onClick}
              className={`menu-btn animate-fade-up ${it.primary ? '!border-red-400/40 !bg-gradient-to-b !from-[#ff5a3c] !to-[#d8261a]' : ''}`}
              style={{ animationDelay: `${0.1 + i * 0.06}s` }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      </div>
      <div className="absolute bottom-3 right-4 text-right text-[11px] text-white/60">v1.0 · procedural 3D · progress saves automatically</div>

      {screen === 'settings' && <SettingsPanel onClose={() => go('menu')} />}
      {screen === 'exit' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="panel animate-fade-up w-full max-w-sm p-6 text-center">
            <div className="font-display text-3xl text-white">Thanks for riding!</div>
            <p className="mt-2 text-sm text-slate-300">Your progress is saved. You can close this browser tab at any time.</p>
            <div className="mt-5 flex gap-2">
              <button className="btn-dark flex-1" onClick={() => go('menu')}>
                <ArrowLeft size={18} /> Back
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  audio.click();
                  window.close();
                  // window.close only works for script-opened tabs; fall back to a blank page
                  setTimeout(() => (window.location.href = 'about:blank'), 150);
                }}
              >
                <LogOut size={18} /> Exit game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
