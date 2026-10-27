import * as THREE from 'three';
import { useMemo } from 'react';
import { useDisposable } from '../geometry';
import type { EnvPreset } from './presets';

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // keep the dome at the far plane
  }
`;

const fragment = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 bottom;
  uniform vec3 sunGlow;
  uniform vec3 sunDir;
  uniform float sunSize;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, pow(-h, 0.4));
    float sd = max(dot(d, normalize(sunDir)), 0.0);
    col += sunGlow * pow(sd, 8.0) * 0.45;            // wide glow
    col += sunGlow * pow(sd, 64.0) * 0.6;            // halo
    col = mix(col, sunGlow * 1.6, smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.6, sd)); // disc
    // horizon haze band
    col = mix(col, horizon * 1.05, (1.0 - smoothstep(0.0, 0.12, abs(h))) * 0.35);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Gradient sky dome with a sun disc. Used for both the visible sky and the reflection environment. */
export function SkyDome({ preset, radius = 1500 }: { preset: EnvPreset; radius?: number }) {
  const geo = useDisposable(() => new THREE.SphereGeometry(radius, 32, 16), [radius]);
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color(preset.sky.top) },
      horizon: { value: new THREE.Color(preset.sky.horizon) },
      bottom: { value: new THREE.Color(preset.sky.bottom) },
      sunGlow: { value: new THREE.Color(preset.sky.sunGlow) },
      sunDir: { value: new THREE.Vector3(...preset.sunDir).normalize() },
      sunSize: { value: preset.stars ? 0.0006 : 0.0012 },
    }),
    [preset],
  );
  const mat = useDisposable(
    () => new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, side: THREE.BackSide, depthWrite: false, fog: false }),
    [uniforms],
  );
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-10} />;
}

/** Soft billboard clouds generated from a canvas texture (no external assets). */
export function Clouds({ preset, cx, cz, rand }: { preset: EnvPreset; cx: number; cz: number; rand: () => number }) {
  const texture = useDisposable(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    for (let i = 0; i < 14; i++) {
      const x = 30 + Math.random() * 68;
      const y = 50 + Math.random() * 30;
      const r = 18 + Math.random() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const mat = useDisposable(
    () => new THREE.SpriteMaterial({ map: texture, color: preset.clouds.color, transparent: true, opacity: preset.clouds.opacity, depthWrite: false, fog: false }),
    [texture, preset],
  );
  const clouds = useMemo(
    () =>
      Array.from({ length: preset.clouds.count }, () => {
        const a = rand() * Math.PI * 2;
        const r = 250 + rand() * 650;
        const s = 120 + rand() * 180;
        return { p: [cx + Math.cos(a) * r, 140 + rand() * 160, cz + Math.sin(a) * r] as [number, number, number], s };
      }),
    [preset, cx, cz, rand],
  );
  return (
    <group>
      {clouds.map((c, i) => (
        <sprite key={i} position={c.p} scale={[c.s, c.s * 0.45, 1]} material={mat} />
      ))}
    </group>
  );
}
