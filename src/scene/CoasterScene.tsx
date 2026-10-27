import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { RideSession } from '../game/rideSession';
import type { TrainColor } from '../types';
import { useGameStore } from '../store/gameStore';
import { audio } from '../audio/audioEngine';
import { World } from './environments/World';
import { PRESETS } from './environments/presets';
import { TrackMesh } from './TrackMesh';
import { Train, type TrainHandle } from './Train';
import { CameraRig, type RigMode } from './CameraRig';
import { RiderArms, SpeedLines } from './RideEffects';

interface Props {
  session: RideSession;
  envId: string;
  trackColor: string;
  supportColor?: string;
  trackWidth?: number;
  trainColor: TrainColor;
  cameraMode: RigMode;
  /** Attract mode for menus: loops forever, silent, no player input. */
  demo?: boolean;
}

function RideController({ session, train, demo }: { session: RideSession; train: React.RefObject<TrainHandle>; demo: boolean }) {
  useFrame((_, dt) => {
    session.update(dt);
    if (demo && session.status === 'finished') session.restart();
    train.current?.update(session.path, session.phys.s);
    if (!demo) {
      const ph = session.phys;
      audio.updateRide(
        { speed: ph.v, onChain: ph.onChain, inStation: ph.inStation, braking: ph.braking, running: session.status === 'running' },
        Math.min(dt, 0.1),
      );
    }
  }, -1);
  return null;
}

function Exposure({ value }: { value: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
}

/** Everything inside the Canvas for a ride: world, track, train, camera and effects. */
export function CoasterScene({ session, envId, trackColor, supportColor, trackWidth = 1.2, trainColor, cameraMode, demo = false }: Props) {
  const quality = useGameStore((s) => s.settings.graphics);
  const train = useRef<TrainHandle>(null);
  const preset = PRESETS[envId] ?? PRESETS.sunny;
  return (
    <>
      <Exposure value={preset.exposure} />
      <World envId={envId} path={session.path} quality={quality} trackColor={trackColor} />
      <TrackMesh path={session.path} color={trackColor} supportColor={supportColor} width={trackWidth} neon={preset.neon} castShadow={quality !== 'low'} groundY={-1.2} />
      <Train ref={train} color={trainColor} />
      <RideController session={session} train={train} demo={demo} />
      <CameraRig session={session} mode={cameraMode} interactive={!demo && cameraMode === 'front'} calm={demo} />
      {!demo && cameraMode === 'front' && <SpeedLines session={session} />}
      {!demo && cameraMode === 'front' && <RiderArms session={session} />}
    </>
  );
}
