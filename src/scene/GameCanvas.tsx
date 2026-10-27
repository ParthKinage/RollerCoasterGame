import * as THREE from 'three';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { LoadingOverlay } from '../ui/LoadingOverlay';

let webglSupport: boolean | null = null;
export function hasWebGL() {
  if (webglSupport !== null) return webglSupport;
  try {
    const c = document.createElement('canvas');
    webglSupport = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 3) onReady();
  });
  return null;
}

const DPR: Record<string, [number, number]> = { low: [1, 1], medium: [1, 1.5], high: [1, 2] };

export function WebGLUnavailable({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-navy p-6 text-center">
      <div className="max-w-md rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="font-display text-2xl text-orange-400">3D graphics unavailable</h2>
        <p className="mt-3 text-sm text-slate-300">
          {message ?? 'Your browser could not start WebGL. Try enabling hardware acceleration, updating your graphics drivers, or using a recent version of Chrome, Edge or Firefox.'}
        </p>
        <button className="btn-primary mt-5" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
  label?: string;
  className?: string;
  /** Show the full-screen loading overlay until the first frames render. */
  showLoading?: boolean;
}

/** Canvas wrapper: quality settings, tone mapping, loading screen, WebGL error handling. */
export function GameCanvas({ children, label = 'Building the park', className = 'absolute inset-0', showLoading = true }: Props) {
  const quality = useGameStore((s) => s.settings.graphics);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => setReady(false), [quality]);

  if (!hasWebGL()) return <WebGLUnavailable />;
  if (lost) return <WebGLUnavailable message="The graphics context was lost (the GPU may have been reset). Reload to continue." />;

  return (
    <div className={className}>
      <ErrorBoundary fallback={(err) => <WebGLUnavailable message={`The 3D scene failed to start: ${err.message}`} />}>
        <Canvas
          key={quality}
          shadows={quality !== 'low' ? 'soft' : false}
          dpr={DPR[quality]}
          gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
          camera={{ fov: 70, near: 0.1, far: 5000, position: [0, 20, 40] }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setLost(true);
            });
          }}
        >
          <Suspense fallback={null}>
            {children}
            <ReadySignal onReady={() => setReady(true)} />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
      {showLoading && <LoadingOverlay visible={!ready} label={label} />}
    </div>
  );
}
