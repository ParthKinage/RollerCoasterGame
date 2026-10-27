import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Play, RotateCw } from 'lucide-react';
import { OrbitControls, ContactShadows, Environment } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import { GameCanvas } from '../scene/GameCanvas';
import { TrainModel, TRAIN_COLORS } from '../scene/Train';
import { SkyDome } from '../scene/environments/Sky';
import { PRESETS } from '../scene/environments/presets';
import { audio } from '../audio/audioEngine';
import type { TrainColor } from '../types';
import { CAR_SPACING, NUM_CARS } from '../physics/coasterPhysics';

const ORDER: TrainColor[] = ['red', 'blue', 'yellow', 'green'];

function PreviewTrack() {
  const ties = useMemo(() => Array.from({ length: 22 }, (_, i) => i * 1.2 - 13), []);
  return (
    <group position={[0, -0.12, 0]}>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0, -3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 28, 10]} />
          <meshStandardMaterial color="#444b57" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
      {ties.map((z) => (
        <mesh key={z} position={[0, -0.15, z]}>
          <boxGeometry args={[1.6, 0.12, 0.2]} />
          <meshStandardMaterial color="#2b313b" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function Customize() {
  const setScreen = useGameStore((s) => s.setScreen);
  const previous = useGameStore((s) => s.previousScreen);
  const color = useGameStore((s) => s.trainColor);
  const setColor = useGameStore((s) => s.setTrainColor);
  const idx = ORDER.indexOf(color);
  const cycle = (d: number) => {
    audio.click();
    setColor(ORDER[(idx + d + ORDER.length) % ORDER.length]);
  };
  const back = previous === 'levels' ? 'levels' : 'menu';
  const preset = PRESETS.night;

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#0d1730] to-[#060a14]">
      <GameCanvas label="Rolling out the train">
        <SkyDome preset={{ ...preset, sky: { top: '#0b1430', horizon: '#1b2a52', bottom: '#05080f', sunGlow: '#3a5ab0' } }} />
        <Environment resolution={64} frames={1}>
          <SkyDome preset={PRESETS.sunny} radius={100} />
        </Environment>
        <ambientLight intensity={0.5} />
        <spotLight position={[8, 14, 10]} angle={0.5} penumbra={0.6} intensity={900} castShadow />
        <directionalLight position={[-6, 6, -8]} intensity={1.2} color="#88aaff" />
        <group position={[0, 0, ((NUM_CARS - 1) * CAR_SPACING) / 2]}>
          <TrainModel color={color} />
          <PreviewTrack />
        </group>
        <ContactShadows position={[0, -0.4, 0]} opacity={0.6} scale={22} blur={2.2} far={4} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]} receiveShadow>
          <circleGeometry args={[14, 48]} />
          <meshStandardMaterial color="#121a2e" metalness={0.3} roughness={0.6} />
        </mesh>
        <OrbitControls
          makeDefault
          autoRotate
          autoRotateSpeed={0.8}
          enablePan={false}
          minDistance={5}
          maxDistance={18}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0.8, 0]}
        />
        <CameraInit />
      </GameCanvas>

      <div className="absolute left-3 top-3 sm:left-6 sm:top-5">
        <button className="btn-dark" onClick={() => (audio.click(), setScreen(back))}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>
      <div className="pointer-events-none absolute left-0 right-0 top-16 text-center sm:top-6">
        <h1 className="font-display text-3xl tracking-wide text-white sm:text-4xl">CUSTOMIZE TRAIN</h1>
        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-400">
          <RotateCw size={12} /> Drag to rotate · scroll / pinch to zoom
        </div>
      </div>

      <button className="btn-icon absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 sm:left-8" onClick={() => cycle(-1)} aria-label="Previous colour">
        <ChevronLeft size={26} />
      </button>
      <button className="btn-icon absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 sm:right-8" onClick={() => cycle(1)} aria-label="Next colour">
        <ChevronRight size={26} />
      </button>

      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6">
        <div className="panel mx-auto max-w-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="label">Selected</div>
              <div className="font-display text-2xl text-white">{TRAIN_COLORS[color].label}</div>
            </div>
            <button className="btn-green" onClick={() => (audio.click(), setScreen('levels'))}>
              <Play size={18} className="fill-white" /> Ride
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
            {ORDER.map((c) => (
              <button
                key={c}
                onClick={() => (audio.click(), setColor(c))}
                className={`relative flex h-16 flex-col items-center justify-center rounded-xl border-2 bg-[#121b2e] transition sm:h-20 ${
                  c === color ? 'border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.3)]' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="h-6 w-12 rounded-md shadow-inner sm:h-8 sm:w-16" style={{ background: `linear-gradient(180deg, ${TRAIN_COLORS[c].body}, ${TRAIN_COLORS[c].body}aa)`, boxShadow: `inset 0 -4px 0 ${TRAIN_COLORS[c].accent}` }} />
                <div className="mt-1 text-[11px] font-semibold capitalize text-slate-200">{c}</div>
                {c === color && (
                  <div className="absolute right-1 top-1 rounded-full bg-yellow-400 p-0.5 text-black">
                    <Check size={10} strokeWidth={4} />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">Your choice is used on every ride, including custom tracks.</p>
        </div>
      </div>
    </div>
  );
}

function CameraInit() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(5.5, 2.8, 7);
  }, [camera]);
  return null;
}
