import * as THREE from 'three';
import { fbm } from '../../utils/math';
import { useDisposable } from '../geometry';
import type { EnvPreset } from './presets';
import type { WorldLayout } from './worldLayout';

interface Props {
  layout: WorldLayout;
  preset: EnvPreset;
  segments: number;
}

const c = new THREE.Color();
const c2 = new THREE.Color();

function colorFor(preset: EnvPreset, x: number, z: number, h: number, out: THREE.Color) {
  const [a, b, d] = preset.groundColors.map((s) => c2.set(s).clone());
  const n = fbm(x / 40, z / 40, 3, 11);
  switch (preset.terrain) {
    case 'snow': {
      out.copy(a).lerp(b, n);
      if (h > 22 && fbm(x / 15, z / 15, 2, 4) > 0.55) out.lerp(d, 0.6);
      break;
    }
    case 'canyon': {
      const band = (Math.sin(h * 0.9) + 1) / 2;
      out.copy(a).lerp(b, band * 0.7 + n * 0.3);
      if (h < 0.5) out.lerp(d, 0.4);
      break;
    }
    default: {
      out.copy(a).lerp(b, n);
      if (h > 14) out.lerp(d, Math.min(1, (h - 14) / 20) * 0.6);
    }
  }
  if (h < -0.3) out.lerp(c.set('#6b5a3a'), 0.7); // river bed
  return out;
}

/** Large displaced terrain mesh with vertex colours, flattened around the track. */
export function Terrain({ layout, preset, segments }: Props) {
  const geometry = useDisposable(() => {
    const g = new THREE.PlaneGeometry(layout.size, layout.size, segments, segments);
    g.rotateX(-Math.PI / 2);
    g.translate(layout.cx, 0, layout.cz);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = layout.heightAt(x, z);
      pos.setY(i, h);
      colorFor(preset, x, z, h, col).toArray(colors, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [layout, preset, segments]);
  const material = useDisposable(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: preset.terrain === 'snow' ? 0.75 : 0.95, metalness: 0 }), [preset]);
  return <mesh geometry={geometry} material={material} receiveShadow />;
}

/** Bright grid floor used by the Track Builder. */
export function GridFloor({ size = 1200 }: { size?: number }) {
  const texture = useDisposable(() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#4f9a34';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(20,60,10,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(20,60,10,0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 64, 0);
      ctx.lineTo(i * 64, 256);
      ctx.moveTo(0, i * 64);
      ctx.lineTo(256, i * 64);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(size / 20, size / 20);
    t.anisotropy = 8;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [size]);
  const mat = useDisposable(() => new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }), [texture]);
  const geo = useDisposable(() => new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), [size]);
  return <mesh geometry={geo} material={mat} receiveShadow position={[0, -0.01, 0]} />;
}

export function Water({ layout, color }: { layout: WorldLayout; color: string }) {
  const geo = useDisposable(() => new THREE.PlaneGeometry(layout.size, layout.size).rotateX(-Math.PI / 2), [layout]);
  const mat = useDisposable(() => new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.12, envMapIntensity: 1.4, transparent: true, opacity: 0.9 }), [color]);
  return <mesh geometry={geo} material={mat} position={[layout.cx, -0.9, layout.cz]} receiveShadow />;
}
