import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { RideSession } from '../game/rideSession';
import { CAR_SPACING } from '../physics/coasterPhysics';
import { useGameStore } from '../store/gameStore';
import { clamp, valueNoise } from '../utils/math';

export type RigMode = 'front' | 'chase' | 'orbit';

interface Props {
  session: RideSession;
  mode: RigMode;
  /** Allow drag-to-look in first person. */
  interactive?: boolean;
  /** Disable shake/FOV effects regardless of settings (menus). */
  calm?: boolean;
}

/**
 * Drives the active camera. First person sits in the front row, aligned to the
 * track frame (so it banks and inverts with the train), with optional drag-to-look,
 * speed-based FOV and camera shake.
 */
export function CameraRig({ session, mode, interactive = false, calm = false }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const look = useRef({ yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0, idle: 0 });
  const v = useMemo(
    () => ({
      p: new THREE.Vector3(),
      t: new THREE.Vector3(),
      u: new THREE.Vector3(),
      r: new THREE.Vector3(),
      t2: new THREE.Vector3(),
      back: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      qLook: new THREE.Quaternion(),
      e: new THREE.Euler(0, 0, 0, 'YXZ'),
      desired: new THREE.Vector3(),
      target: new THREE.Vector3(),
      chasePos: new THREE.Vector3(),
      init: false,
      lastMode: '' as string,
    }),
    [],
  );

  useEffect(() => {
    if (!interactive) return;
    const el = gl.domElement;
    const L = look.current;
    const down = (e: PointerEvent) => {
      L.dragging = true;
      L.lastX = e.clientX;
      L.lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!L.dragging) return;
      const sens = useGameStore.getState().settings.cameraSensitivity;
      L.yaw = clamp(L.yaw - (e.clientX - L.lastX) * 0.005 * sens, -2.4, 2.4);
      L.pitch = clamp(L.pitch - (e.clientY - L.lastY) * 0.004 * sens, -1.1, 1.1);
      L.lastX = e.clientX;
      L.lastY = e.clientY;
      L.idle = 0;
    };
    const up = () => (L.dragging = false);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [gl, interactive]);

  useFrame((state, dt) => {
    const path = session.path;
    const s = session.phys.s;
    const speed = session.phys.v;
    const settings = useGameStore.getState().settings;
    const effects = settings.motionEffects && !calm;
    const L = look.current;
    if (!L.dragging) {
      L.idle += dt;
      if (L.idle > 1.5) {
        const k = Math.min(1, dt * 2);
        L.yaw -= L.yaw * k;
        L.pitch -= L.pitch * k;
      }
    }

    if (v.lastMode !== mode) {
      v.init = false; // snap instead of easing in from a stale position
      v.lastMode = mode;
    }
    let fov = 70;
    if (mode === 'front') {
      // camera in the front row of the front car
      path.frame(s - 0.1, v.p, v.t, v.u, v.r);
      // look direction anticipates the track slightly for a smoother ride
      path.getTan(s + 2.5, v.t2);
      v.t.lerp(v.t2, 0.35).normalize();
      v.u.addScaledVector(v.t, -v.u.dot(v.t)).normalize();
      v.r.crossVectors(v.t, v.u).normalize();
      v.back.copy(v.t).negate();
      v.m.makeBasis(v.r, v.u, v.back);
      v.q.setFromRotationMatrix(v.m);
      v.e.set(L.pitch, L.yaw, 0);
      v.qLook.setFromEuler(v.e);
      camera.quaternion.copy(v.q).multiply(v.qLook);
      camera.position.copy(v.p).addScaledVector(v.u, 1.62).addScaledVector(v.t, 0.45);
      if (effects) {
        const t = state.clock.elapsedTime;
        const amp = clamp((speed - 12) / 25, 0, 1) * 0.045 + Math.abs(session.phys.gLat) * 0.004;
        camera.position.addScaledVector(v.r, (valueNoise(t * 18, 1.3) - 0.5) * amp);
        camera.position.addScaledVector(v.u, (valueNoise(t * 21, 7.1) - 0.5) * amp);
        fov = 70 + clamp((speed - 8) / 30, 0, 1) * 14;
      }
    } else if (mode === 'chase') {
      path.frame(s - CAR_SPACING, v.p, v.t, v.u, v.r);
      v.target.copy(v.p).addScaledVector(v.u, 1);
      v.t.y *= 0.3;
      v.t.normalize();
      v.desired.copy(v.p).addScaledVector(v.t, -16).add(new THREE.Vector3(0, 7, 0));
      if (v.desired.y < v.p.y - 4) v.desired.y = v.p.y - 4;
      v.desired.y = Math.max(v.desired.y, 2.5);
      if (!v.init) v.chasePos.copy(v.desired);
      v.chasePos.lerp(v.desired, 1 - Math.exp(-dt * 3));
      camera.position.copy(v.chasePos);
      camera.lookAt(v.target);
      fov = 62;
    } else {
      const b = path.bounds;
      const cx = (b.min.x + b.max.x) / 2;
      const cz = (b.min.z + b.max.z) / 2;
      const R = Math.max(80, Math.hypot(b.max.x - b.min.x, b.max.z - b.min.z) * 0.62);
      const a = state.clock.elapsedTime * 0.05 + 0.6;
      camera.position.set(cx + Math.cos(a) * R, Math.max(45, b.max.y + 25), cz + Math.sin(a) * R);
      camera.lookAt(cx, b.max.y * 0.3, cz);
      fov = 55;
    }
    v.init = true;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
