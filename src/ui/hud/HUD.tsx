import { Camera, ChevronsUp, Hand, Pause, Zap, OctagonX } from 'lucide-react';
import { useHudStore } from '../../store/hudStore';
import { useGameStore } from '../../store/gameStore';
import type { RideInput } from '../../game/rideSession';
import { Speedometer } from './Speedometer';

const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-chip min-w-[64px] sm:min-w-[84px]">
      <div className="text-[10px] font-medium text-slate-300 sm:text-xs">{label}</div>
      <div className="text-base font-bold tabular-nums text-white sm:text-xl">{value}</div>
    </div>
  );
}

interface Props {
  onPause: () => void;
  onToggleCamera: () => void;
  cameraMode: 'front' | 'chase';
  setInput: (patch: Partial<RideInput>) => void;
}

/** Hold-to-activate button that works with mouse and touch. */
function HoldButton({ label, icon, active, onChange, className, hint }: { label: string; icon: React.ReactNode; active: boolean; onChange: (v: boolean) => void; className: string; hint: string }) {
  return (
    <button
      className={`flex select-none flex-col items-center justify-center rounded-2xl border px-3 py-2 text-xs font-bold shadow-xl backdrop-blur transition ${className} ${active ? 'scale-95 brightness-125' : ''}`}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        onChange(true);
      }}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onContextMenu={(e) => e.preventDefault()}
      title={hint}
    >
      {icon}
      <span className="mt-0.5">{label}</span>
      <span className="hidden text-[9px] font-medium opacity-70 sm:block">{hint}</span>
    </button>
  );
}

export function HUD({ onPause, onToggleCamera, cameraMode, setInput }: Props) {
  const h = useHudStore();
  const motion = useGameStore((s) => s.settings.motionEffects);
  const vignette = motion ? Math.min(1, Math.max(0, (h.speed - 50) / 60)) : 0;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      <div className="vignette absolute inset-0 transition-opacity" style={{ opacity: vignette }} />
      {/* top stats */}
      <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
        <Chip label="Speed" value={`${Math.round(h.speed)} km/h`} />
        <Chip label="Height" value={`${Math.round(h.height)} m`} />
        <Chip label="Time" value={fmtTime(h.time)} />
        <Chip label="G-Force" value={`${h.gForce.toFixed(1)} G`} />
      </div>
      <div className="pointer-events-auto absolute right-2 top-2 flex gap-2 sm:right-4 sm:top-4">
        <button className="btn-icon h-11 w-11" onClick={onToggleCamera} title="Switch camera (C)">
          <Camera size={20} />
        </button>
        <button className="btn-icon h-11 w-11" onClick={onPause} title="Pause (Esc)">
          <Pause size={22} className="fill-white" />
        </button>
      </div>
      {/* progress + score */}
      <div className="absolute left-1/2 top-[76px] w-[min(70vw,420px)] -translate-x-1/2 xl:top-5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200 drop-shadow">
          <span>Track {Math.round(h.progress * 100)}%</span>
          <span className="text-yellow-300">Score {h.score}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
          <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500" style={{ width: `${h.progress * 100}%` }} />
        </div>
        {h.onChain && <div className="mt-2 text-center text-xs font-semibold text-sky-200 drop-shadow">Lift chain engaged · boost recharging</div>}
      </div>
      {/* countdown & messages */}
      {h.status === 'countdown' && (
        <div key={h.countdown} className="animate-pop absolute inset-0 flex flex-col items-center justify-center">
          <div className="title-text text-8xl">{h.countdown > 0 ? h.countdown : 'GO!'}</div>
          <div className="mt-4 rounded-lg bg-black/50 px-4 py-2 text-center text-sm text-slate-100">
            Hold <b>Space</b> / <b>Hands Up</b> on fast sections for thrill points · <b>W</b> boost · <b>S</b> brake · drag to look
          </div>
        </div>
      )}
      {h.message && h.status === 'running' && (
        <div key={h.message} className="animate-pop absolute left-1/2 top-[34%] -translate-x-1/2">
          <div
            className={`font-display text-3xl tracking-wide drop-shadow-[0_3px_0_rgba(0,0,0,0.6)] sm:text-4xl ${
              h.messageTone === 'bad' ? 'text-red-400' : h.messageTone === 'good' ? 'text-yellow-300' : 'text-sky-200'
            }`}
          >
            {h.message}
          </div>
        </div>
      )}
      {/* speedometer */}
      <div className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5">
        <Speedometer speed={h.speed} />
      </div>
      {/* controls */}
      <div className="pointer-events-auto absolute bottom-3 left-3 flex items-end gap-2 sm:bottom-5 sm:left-5">
        <HoldButton
          label="Hands Up"
          hint="Space"
          icon={<Hand size={24} />}
          active={h.handsUp}
          onChange={(v) => setInput({ handsUp: v })}
          className="h-20 w-20 border-yellow-300/40 bg-yellow-500/25 text-yellow-100 sm:h-24 sm:w-24"
        />
        <div className="flex flex-col gap-2">
          <HoldButton label="Boost" hint="W / ↑" icon={<Zap size={18} />} active={false} onChange={(v) => setInput({ boost: v })} className="h-14 w-16 border-sky-300/40 bg-sky-500/25 text-sky-100" />
          <HoldButton label="Brake" hint="S / ↓" icon={<OctagonX size={18} />} active={false} onChange={(v) => setInput({ brake: v })} className="h-14 w-16 border-red-300/40 bg-red-500/25 text-red-100" />
        </div>
        <div className="mb-1 ml-1 w-24">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
            <ChevronsUp size={12} /> Boost
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300" style={{ width: `${h.boost * 100}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-slate-300">{cameraMode === 'front' ? 'Front seat' : 'Chase cam'}</div>
        </div>
      </div>
    </div>
  );
}
