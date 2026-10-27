import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import type { TrackPath } from '../../track/trackPath';
import type { GraphicsQuality } from '../../types';
import { PRESETS, type EnvPreset } from './presets';
import { WorldLayout } from './worldLayout';
import { Clouds, SkyDome } from './Sky';
import { GridFloor, Terrain, Water } from './Terrain';
import { Mountains, Rocks, Trees } from './Scenery';
import { Carousel, Chalets, DropTower, FerrisWheel, LampPosts, NeonHoops, Station, Tents } from './Attractions';

interface Props {
  envId: string;
  path: TrackPath | null;
  quality: GraphicsQuality;
  trackColor?: string;
  seed?: number;
}

const SHADOW_SIZE = { low: 0, medium: 1024, high: 2048 };
const TERRAIN_SEGMENTS = { low: 110, medium: 160, high: 220 };

/** Directional "sun" whose shadow frustum follows the camera so shadows stay crisp over a large map. */
function Sun({ preset, quality }: { preset: EnvPreset; quality: GraphicsQuality }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const camera = useThree((s) => s.camera);
  const dir = useMemo(() => new THREE.Vector3(...preset.sunDir).normalize(), [preset]);
  const shadow = SHADOW_SIZE[quality];
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const target = camera.position;
    l.position.copy(target).addScaledVector(dir, 200);
    l.target.position.copy(target);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      color={preset.sunColor}
      intensity={preset.sunIntensity}
      castShadow={shadow > 0}
      shadow-mapSize-width={shadow || 512}
      shadow-mapSize-height={shadow || 512}
      shadow-camera-left={-90}
      shadow-camera-right={90}
      shadow-camera-top={90}
      shadow-camera-bottom={-90}
      shadow-camera-near={10}
      shadow-camera-far={500}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
    />
  );
}

/** Full procedural environment for a level: sky, lighting, terrain, water and scenery. */
export function World({ envId, path, quality, trackColor = '#d62020', seed = 7 }: Props) {
  const preset = PRESETS[envId] ?? PRESETS.sunny;
  const layout = useMemo(() => new WorldLayout(path, preset, seed), [path, preset, seed]);

  // Place the big attractions once per layout
  const spots = useMemo(() => {
    const wheel = preset.ferrisWheel ? layout.reserve(layout.findSpot(28, 30, 110)) : null;
    const carousel = preset.parkRides ? layout.reserve(layout.findSpot(12, 18, 70)) : null;
    const tower = preset.parkRides ? layout.reserve(layout.findSpot(6, 25, 120)) : null;
    const tents = preset.parkRides ? layout.reserve(layout.findSpot(22, 16, 80)) : null;
    const tents2 = preset.parkRides ? layout.reserve(layout.findSpot(22, 20, 140)) : null;
    const chalets = preset.chalets ? layout.reserve(layout.findSpot(24, 25, 120)) : null;
    const lamps = preset.neon ? layout.scatter(40, 6, layout.trackRadius + 30) : [];
    return { wheel, wheelRot: layout.rand() * Math.PI, carousel, tower, tents, tents2, chalets, lamps };
  }, [layout, preset]);

  const y = (s: { x: number; z: number } | null) => (s ? Math.max(0, layout.heightAt(s.x, s.z)) : 0);
  const stationEnd = path ? path.segments[path.segments.length - 1] : null;

  return (
    <group>
      <color attach="background" args={[preset.sky.horizon]} />
      <fog attach="fog" args={[preset.fog.color, preset.fog.near, preset.fog.far]} />
      <SkyDome preset={preset} />
      <Environment resolution={64} frames={1}>
        <SkyDome preset={preset} radius={100} />
        <mesh position={[0, -40, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[400, 400]} />
          <meshBasicMaterial color={preset.groundColors[0]} />
        </mesh>
      </Environment>
      <hemisphereLight args={[preset.hemi.sky, preset.hemi.ground, preset.hemi.intensity]} />
      <ambientLight intensity={preset.ambient} />
      <Sun preset={preset} quality={quality} />
      {preset.stars && <Stars radius={600} depth={200} count={quality === 'low' ? 2000 : 5000} factor={6} fade speed={0.5} />}
      {preset.stars && (
        <mesh position={[layout.cx + 300, 380, layout.cz - 700]}>
          <sphereGeometry args={[28, 24, 16]} />
          <meshBasicMaterial color="#f4f1ff" fog={false} toneMapped={false} />
        </mesh>
      )}
      {preset.clouds.count > 0 && <Clouds preset={preset} cx={layout.cx} cz={layout.cz} rand={layout.rand} />}

      {preset.terrain === 'grid' ? <GridFloor size={layout.size} /> : <Terrain layout={layout} preset={preset} segments={TERRAIN_SEGMENTS[quality]} />}
      {preset.water && <Water layout={layout} color={preset.water.color} />}
      <Mountains layout={layout} preset={preset} />
      {preset.trees && <Trees layout={layout} preset={preset} quality={quality} />}
      {preset.rocks && <Rocks layout={layout} color={preset.terrain === 'canyon' ? '#9c4f2a' : '#7c838c'} count={quality === 'low' ? 60 : 160} />}

      {spots.wheel && <FerrisWheel position={[spots.wheel.x, y(spots.wheel), spots.wheel.z]} rotation={spots.wheelRot} neon={preset.neon} />}
      {spots.carousel && <Carousel position={[spots.carousel.x, y(spots.carousel), spots.carousel.z]} neon={preset.neon} />}
      {spots.tower && <DropTower position={[spots.tower.x, y(spots.tower), spots.tower.z]} neon={preset.neon} />}
      {spots.tents && <Tents position={[spots.tents.x, y(spots.tents), spots.tents.z]} neon={preset.neon} />}
      {spots.tents2 && <Tents position={[spots.tents2.x, y(spots.tents2), spots.tents2.z]} neon={preset.neon} />}
      {spots.chalets && <Chalets position={[spots.chalets.x, y(spots.chalets), spots.chalets.z]} />}
      {preset.neon && <LampPosts points={spots.lamps} />}
      {preset.neon && path && <NeonHoops path={path} />}

      {path && <Station path={path} at={0} length={Math.min(30, path.segments[0].end)} color={trackColor} neon={preset.neon} />}
      {path && stationEnd && stationEnd.type === 'brake' && (
        <Station path={path} at={stationEnd.start + 4} length={Math.min(30, stationEnd.end - stationEnd.start - 4)} color={trackColor} neon={preset.neon} />
      )}
    </group>
  );
}
