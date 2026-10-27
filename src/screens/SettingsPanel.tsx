import { useEffect, useState } from 'react';
import { Maximize, Minimize, X, RotateCcw } from 'lucide-react';
import { useGameStore, DEFAULT_SETTINGS } from '../store/gameStore';
import { Slider } from '../ui/Slider';
import { audio } from '../audio/audioEngine';
import type { GraphicsQuality } from '../types';

function useFullscreen() {
  const [fs, setFs] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen may be blocked (e.g. iframes, iOS) */
    }
  };
  return { fs, toggle, supported: !!document.documentElement.requestFullscreen };
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useGameStore((s) => s.settings);
  const update = useGameStore((s) => s.updateSettings);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const { fs, toggle, supported } = useFullscreen();
  const [confirmReset, setConfirmReset] = useState(false);
  const qualities: { id: GraphicsQuality; label: string; hint: string }[] = [
    { id: 'low', label: 'Low', hint: 'No shadows, fewer trees' },
    { id: 'medium', label: 'Medium', hint: 'Balanced' },
    { id: 'high', label: 'High', hint: 'Sharp shadows, dense scenery' },
  ];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm">
      <div className="panel animate-fade-up max-h-full w-full max-w-lg overflow-y-auto p-5 scrollbar-thin sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-white">Settings</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="mt-5">
          <div className="label mb-2">Graphics quality</div>
          <div className="grid grid-cols-3 gap-2">
            {qualities.map((q) => (
              <button
                key={q.id}
                onClick={() => (audio.click(), update({ graphics: q.id }))}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${settings.graphics === q.id ? 'border-blue-400 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="font-semibold text-white">{q.label}</div>
                <div className="text-[11px] text-slate-400">{q.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <Slider label="Sound effects volume" value={settings.sfxVolume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update({ sfxVolume: v })} />
          <Slider label="Music volume" value={settings.musicVolume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update({ musicVolume: v })} />
          <Slider label="Camera sensitivity" value={settings.cameraSensitivity} min={0.2} max={2.5} step={0.1} format={(v) => `${v.toFixed(1)}x`} onChange={(v) => update({ cameraSensitivity: v })} />
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <div className="font-semibold text-white">Motion effects</div>
              <div className="text-xs text-slate-400">Camera shake, speed FOV, wind streaks and vignette</div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-blue-500"
              checked={settings.motionEffects}
              onChange={(e) => (audio.click(), update({ motionEffects: e.target.checked }))}
            />
          </label>
          <button
            disabled={!supported}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left disabled:opacity-40"
            onClick={() => (audio.click(), void toggle())}
          >
            <div>
              <div className="font-semibold text-white">Full-screen mode</div>
              <div className="text-xs text-slate-400">{fs ? 'On' : 'Off'}{!supported && ' (not supported here)'}</div>
            </div>
            {fs ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button className="btn-dark flex-1" onClick={() => (audio.click(), update(DEFAULT_SETTINGS))}>
            <RotateCcw size={16} /> Restore defaults
          </button>
          {confirmReset ? (
            <button className="btn flex-1 bg-red-600 text-white" onClick={() => (resetProgress(), setConfirmReset(false))}>
              Confirm: erase progress
            </button>
          ) : (
            <button className="btn-dark flex-1 text-red-300" onClick={() => setConfirmReset(true)}>
              Reset progress
            </button>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">Settings and progress are saved on this device automatically.</p>
      </div>
    </div>
  );
}
