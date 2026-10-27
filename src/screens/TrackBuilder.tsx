import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Trash2,
  RotateCcw,
  Play,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Spline,
  Waves,
  TrendingDown,
  TrendingUp,
  CircleDot,
  Tornado,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { validateTrack } from '../track/validate';
import type { TrackPath } from '../track/trackPath';
import { makeSegment, SEGMENT_LABELS, SEGMENT_LIMITS } from '../game/segments';
import { createDefaultCustomTrack } from '../game/defaultTrack';
import type { CustomTrack, EnvironmentId, Segment, SegmentType, TrainColor } from '../types';
import { GameCanvas } from '../scene/GameCanvas';
import { World } from '../scene/environments/World';
import { ENVIRONMENT_OPTIONS } from '../scene/environments/presets';
import { TrackMesh } from '../scene/TrackMesh';
import { Train, TRAIN_COLORS, type TrainHandle } from '../scene/Train';
import { START_S } from '../physics/coasterPhysics';
import { Slider } from '../ui/Slider';
import { audio } from '../audio/audioEngine';

const TOOLS: { type: SegmentType; label: string; icon: React.ReactNode }[] = [
  { type: 'straight', label: 'Straight', icon: <Minus size={20} /> },
  { type: 'curve', label: 'Curve', icon: <Spline size={20} /> },
  { type: 'loop', label: 'Loop', icon: <CircleDot size={20} /> },
  { type: 'corkscrew', label: 'Corkscrew', icon: <Tornado size={20} /> },
  { type: 'hill', label: 'Hill', icon: <Waves size={20} /> },
  { type: 'drop', label: 'Drop', icon: <TrendingDown size={20} /> },
  { type: 'lift', label: 'Lift Hill', icon: <TrendingUp size={20} /> },
];

const TRACK_COLORS = ['#d62020', '#1f6fd6', '#f2b705', '#1fae4b', '#8b2be2', '#f08a12', '#e5e7eb', '#111827'];
const MAX_HISTORY = 80;

/** Static train parked in the station so builders can judge scale. */
function ParkedTrain({ path, color }: { path: TrackPath; color: TrainColor }) {
  const ref = useRef<TrainHandle>(null);
  useEffect(() => {
    ref.current?.update(path, START_S);
  }, [path, color]);
  return <Train ref={ref} color={color} />;
}

/** Frames the camera on the track once, then hands control to OrbitControls. */
function BuilderCamera({ path }: { path: TrackPath | null }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const framed = useRef(false);
  useEffect(() => {
    if (framed.current || !path || !controls) return;
    framed.current = true;
    const b = path.bounds;
    const c = new THREE.Vector3((b.min.x + b.max.x) / 2, 8, (b.min.z + b.max.z) / 2);
    const r = Math.max(60, b.getSize(new THREE.Vector3()).length() * 0.7);
    camera.position.set(c.x + r * 0.55, Math.max(50, r * 0.55), c.z + r * 0.7);
    controls.target.copy(c);
    controls.update();
  }, [path, controls, camera]);
  return null;
}

export function TrackBuilder() {
  const setScreen = useGameStore((s) => s.setScreen);
  const startRide = useGameStore((s) => s.startRide);
  const track = useGameStore((s) => s.customTrack);
  const setTrack = useGameStore((s) => s.setCustomTrack);
  const trainColor = useGameStore((s) => s.trainColor);
  const setTrainColor = useGameStore((s) => s.setTrainColor);
  const quality = useGameStore((s) => s.settings.graphics);

  const [past, setPast] = useState<CustomTrack[]>([]);
  const [future, setFuture] = useState<CustomTrack[]>([]);
  const [selected, setSelected] = useState(() => Math.max(1, track.segments.length - 2));
  const [tab, setTab] = useState<'track' | 'environment' | 'trains'>('track');
  const [panelOpen, setPanelOpen] = useState(true);
  const lastEdit = useRef<{ key: string; time: number } | null>(null);

  const segments = track.segments;
  const sel = Math.min(selected, segments.length - 1);
  const deferredSegments = useDeferredValue(segments);
  const validation = useMemo(() => validateTrack(deferredSegments), [deferredSegments]);
  const lastGoodPath = useRef<TrackPath | null>(null);
  if (validation.path) lastGoodPath.current = validation.path;
  const path = validation.path ?? lastGoodPath.current;

  /** Applies a change and records undo history. Rapid slider edits on one field are merged. */
  const commit = useCallback(
    (next: CustomTrack, coalesceKey?: string) => {
      const now = performance.now();
      const merge = coalesceKey && lastEdit.current?.key === coalesceKey && now - lastEdit.current.time < 900;
      if (!merge) {
        setPast((p) => [...p.slice(-MAX_HISTORY + 1), track]);
        setFuture([]);
      }
      lastEdit.current = coalesceKey ? { key: coalesceKey, time: now } : null;
      setTrack(next);
    },
    [track, setTrack],
  );

  const undo = useCallback(() => {
    if (!past.length) return;
    audio.click();
    setFuture((f) => [track, ...f]);
    setTrack(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    lastEdit.current = null;
  }, [past, track, setTrack]);

  const redo = useCallback(() => {
    if (!future.length) return;
    audio.click();
    setPast((p) => [...p, track]);
    setTrack(future[0]);
    setFuture((f) => f.slice(1));
    lastEdit.current = null;
  }, [future, track, setTrack]);

  const addSegment = (type: SegmentType) => {
    audio.click();
    const at = Math.min(Math.max(1, sel + 1), segments.length - 1);
    const next = [...segments.slice(0, at), makeSegment(type), ...segments.slice(at)];
    commit({ ...track, segments: next });
    setSelected(at);
  };

  const removeSelected = () => {
    const s = segments[sel];
    if (!s || s.type === 'station' || s.type === 'brake') return;
    audio.click();
    commit({ ...track, segments: segments.filter((_, i) => i !== sel) });
    setSelected(Math.max(1, sel - 1));
  };

  const moveSelected = (d: -1 | 1) => {
    const t = sel + d;
    if (sel < 1 || sel > segments.length - 2 || t < 1 || t > segments.length - 2) return;
    audio.click();
    const next = [...segments];
    [next[sel], next[t]] = [next[t], next[sel]];
    commit({ ...track, segments: next });
    setSelected(t);
  };

  const updateSegment = (patch: Partial<Segment>, key: string) => {
    const next = segments.map((s, i) => (i === sel ? { ...s, ...patch } : s));
    commit({ ...track, segments: next }, `${segments[sel].id}:${key}`);
  };

  const resetTrack = () => {
    audio.click();
    commit(createDefaultCustomTrack());
    setSelected(1);
  };

  const testRide = () => {
    if (!validation.ok) return;
    audio.unlock();
    audio.click();
    startRide({ kind: 'custom' });
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') removeSelected();
      else if (e.key === 'ArrowLeft') setSelected((s) => Math.max(0, s - 1));
      else if (e.key === 'ArrowRight') setSelected((s) => Math.min(segments.length - 1, s + 1));
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  });

  const selSeg = segments[sel];
  const limits = selSeg ? SEGMENT_LIMITS[selSeg.type] : {};
  const highlight = path && path.segments[sel] && deferredSegments === segments ? { from: path.segments[sel].start, to: path.segments[sel].end } : null;
  const errors = validation.issues.filter((i) => i.level === 'error');
  const warnings = validation.issues.filter((i) => i.level === 'warning');

  const pick = (s: number) => {
    if (!path) return;
    const idx = path.segmentAt(s);
    if (idx >= 0) {
      audio.click();
      setSelected(idx);
      setPanelOpen(true);
      setTab('track');
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a1120]">
      <GameCanvas label="Preparing the build site">
        <World envId="grid" path={null} quality={quality} />
        {path && (
          <>
            <TrackMesh path={path} color={track.color} width={track.width} highlight={highlight} onPick={pick} castShadow={quality !== 'low'} groundY={0} />
            <ParkedTrain path={path} color={trainColor} />
          </>
        )}
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.08} minDistance={8} maxDistance={700} enableDamping dampingFactor={0.12} />
        <BuilderCamera path={path} />
      </GameCanvas>

      {/* top bar */}
      <div className="absolute left-2 right-2 top-2 flex items-center gap-2 sm:left-4 sm:right-4 sm:top-4">
        <button className="btn-dark" onClick={() => (audio.click(), setScreen('menu'))}>
          <ArrowLeft size={18} /> <span className="hidden sm:inline">Menu</span>
        </button>
        <div className="panel flex items-center gap-1 p-1">
          <button className="btn-icon h-9 w-9 border-0 bg-transparent" onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)">
            <Undo2 size={18} />
          </button>
          <button className="btn-icon h-9 w-9 border-0 bg-transparent" onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)">
            <Redo2 size={18} />
          </button>
          <button
            className="btn-icon h-9 w-9 border-0 bg-transparent"
            onClick={removeSelected}
            disabled={!selSeg || selSeg.type === 'station' || selSeg.type === 'brake'}
            title="Delete selected segment (Del)"
          >
            <Trash2 size={18} />
          </button>
          <button className="btn-icon h-9 w-9 border-0 bg-transparent" onClick={resetTrack} title="Reset to the starter track">
            <RotateCcw size={18} />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn-dark lg:hidden" onClick={() => setPanelOpen((o) => !o)}>
            <SlidersHorizontal size={18} />
          </button>
          <button className="btn-green px-5 py-3 text-base" onClick={testRide} disabled={!validation.ok} title={validation.ok ? 'Ride your track' : 'Fix the errors first'}>
            <Play size={18} className="fill-white" /> Test Ride
          </button>
        </div>
      </div>

      {/* tools */}
      <div className="panel absolute left-2 top-16 w-[150px] p-2 sm:left-4 sm:top-20 sm:w-[170px] max-sm:bottom-[132px] max-sm:top-auto max-sm:w-auto max-sm:right-2">
        <div className="mb-2 hidden px-1 font-display text-lg tracking-wide text-white sm:block">TRACK BUILDER</div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin sm:flex-col">
          {TOOLS.map((t) => (
            <button
              key={t.type}
              onClick={() => addSegment(t.type)}
              disabled={segments.length >= 40}
              className="btn-dark shrink-0 justify-start px-3 py-2 text-sm"
              title={`Add ${t.label} after the selected segment`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-2 hidden px-1 text-[11px] leading-snug text-slate-400 sm:block">New pieces are inserted after the highlighted segment. Click the track to select.</div>
      </div>

      {/* properties panel */}
      {panelOpen && (
        <div className="panel absolute right-2 top-16 w-[min(310px,calc(100%-16px))] p-3 sm:right-4 sm:top-20 max-lg:max-h-[55vh] overflow-y-auto scrollbar-thin">
          <div className="mb-3 flex gap-1 rounded-lg bg-black/30 p-1">
            {(['track', 'environment', 'trains'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'track' && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm text-slate-200">Track Colour</div>
                <div className="flex flex-wrap gap-2">
                  {TRACK_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => (audio.click(), commit({ ...track, color: c }))}
                      className={`h-7 w-7 rounded-full border-2 transition ${track.color === c ? 'scale-110 border-white' : 'border-white/20'}`}
                      style={{ background: c }}
                      aria-label={`Track colour ${c}`}
                    />
                  ))}
                </div>
              </div>
              <Slider label="Track Width" value={track.width} min={1} max={1.6} step={0.05} format={(v) => `${v.toFixed(2)} m`} onChange={(v) => commit({ ...track, width: v }, 'width')} />

              <div className="border-t border-white/10 pt-3">
                {selSeg && (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="label">Segment {sel + 1}</div>
                        <div className="font-semibold text-white">{SEGMENT_LABELS[selSeg.type]}</div>
                      </div>
                      <div className="flex gap-1">
                        <button className="btn-icon h-8 w-8" onClick={() => moveSelected(-1)} title="Move earlier">
                          <ChevronLeft size={16} />
                        </button>
                        <button className="btn-icon h-8 w-8" onClick={() => moveSelected(1)} title="Move later">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {limits.length && (
                        <Slider label="Segment Length" value={selSeg.length} min={limits.length[0]} max={limits.length[1]} unit=" m" onChange={(v) => updateSegment({ length: v }, 'length')} />
                      )}
                      {limits.height && (
                        <Slider
                          label={selSeg.type === 'loop' || selSeg.type === 'corkscrew' ? 'Element Height' : selSeg.type === 'curve' ? 'Height Change' : 'Track Height'}
                          value={selSeg.height}
                          min={limits.height[0]}
                          max={limits.height[1]}
                          unit=" m"
                          onChange={(v) => updateSegment({ height: v }, 'height')}
                        />
                      )}
                      {limits.turn && selSeg.type !== 'loop' && selSeg.type !== 'corkscrew' && (
                        <Slider
                          label="Curve Intensity"
                          value={selSeg.turn}
                          min={limits.turn[0]}
                          max={limits.turn[1]}
                          step={5}
                          format={(v) => (v === 0 ? 'Straight' : `${Math.abs(v)}° ${v > 0 ? 'right' : 'left'}`)}
                          onChange={(v) => updateSegment({ turn: v }, 'turn')}
                        />
                      )}
                      {limits.bank && (
                        <Slider label="Track Angle (bank)" value={selSeg.bank} min={limits.bank[0]} max={limits.bank[1]} unit="°" onChange={(v) => updateSegment({ bank: v }, 'bank')} />
                      )}
                      {(selSeg.type === 'loop' || selSeg.type === 'corkscrew') && (
                        <div>
                          <div className="mb-1.5 text-sm text-slate-200">{selSeg.type === 'loop' ? 'Exit side' : 'Roll direction'}</div>
                          <div className="grid grid-cols-2 gap-2">
                            {[-1, 1].map((d) => (
                              <button
                                key={d}
                                onClick={() => (audio.click(), updateSegment({ turn: d }, 'dir'))}
                                className={`rounded-lg border px-3 py-1.5 text-sm ${Math.sign(selSeg.turn || 1) === d ? 'border-blue-400 bg-blue-500/20 text-white' : 'border-white/10 text-slate-300'}`}
                              >
                                {d < 0 ? 'Left' : 'Right'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {(selSeg.type === 'station' || selSeg.type === 'brake') && (
                        <div className="text-xs text-slate-400">{selSeg.type === 'station' ? 'Every ride starts here. The station cannot be removed.' : 'Brakes bring the train safely to a stop at the end of the ride.'}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'environment' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-400">Where your coaster is built when you test ride it.</div>
              {ENVIRONMENT_OPTIONS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => (audio.click(), commit({ ...track, environment: e.id as EnvironmentId }))}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${track.environment === e.id ? 'border-blue-400 bg-blue-500/20 text-white' : 'border-white/10 text-slate-200 hover:bg-white/5'}`}
                >
                  {e.label}
                  {track.environment === e.id && <Check size={16} />}
                </button>
              ))}
            </div>
          )}

          {tab === 'trains' && (
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TRAIN_COLORS) as TrainColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => (audio.click(), setTrainColor(c))}
                  className={`rounded-lg border-2 p-2 text-left ${trainColor === c ? 'border-yellow-400' : 'border-white/10'}`}
                >
                  <div className="h-6 rounded" style={{ background: TRAIN_COLORS[c].body, boxShadow: `inset 0 -3px 0 ${TRAIN_COLORS[c].accent}` }} />
                  <div className="mt-1 text-xs font-semibold text-slate-200">{TRAIN_COLORS[c].label}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* segment strip + validation */}
      <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 lg:left-[200px] lg:right-[340px]">
        <div className="panel p-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {segments.map((s, i) => {
              const bad = validation.issues.some((x) => x.segmentIndex === i && x.level === 'error');
              return (
                <button
                  key={s.id}
                  onClick={() => (audio.click(), setSelected(i))}
                  className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    i === sel ? 'border-yellow-400 bg-yellow-400/15 text-yellow-200' : bad ? 'border-red-500/60 bg-red-500/10 text-red-200' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {i + 1}. {SEGMENT_LABELS[s.type]}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs">
            {errors.length ? (
              <span className="flex items-center gap-1.5 font-semibold text-red-300">
                <AlertTriangle size={14} /> {errors[0].message}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-green-300">
                <CheckCircle2 size={14} /> Track is continuous and rideable
              </span>
            )}
            {!errors.length && warnings[0] && <span className="text-yellow-300">{warnings[0].message}</span>}
            {path && (
              <span className="ml-auto text-slate-400">
                {Math.round(path.length)} m · peak {Math.round(path.maxHeight)} m
                {validation.sim && ` · ${Math.round(validation.sim.maxSpeed * 3.6)} km/h · ${Math.round(validation.sim.duration)} s · ${validation.sim.maxG.toFixed(1)} G`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
