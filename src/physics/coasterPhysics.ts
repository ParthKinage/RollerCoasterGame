import * as THREE from 'three';
import { FLAG_BRAKE, FLAG_CHAIN, FLAG_STATION, type TrackPath } from '../track/trackPath';

export const GRAVITY = 9.81;
export const CAR_SPACING = 2.9;
export const NUM_CARS = 3;
export const START_S = CAR_SPACING * (NUM_CARS - 1) + 4;

const ROLLING_FRICTION = 0.07; // m/s^2
const AIR_DRAG = 0.00045; // per (m/s)^2
const STATION_SPEED = 4.5;
const CHAIN_SPEED = 5.2;
const RESCUE_SPEED = 1.8;
const BOOST_ACCEL = 5.5;
const BRAKE_ACCEL = 6;
const SUBSTEP = 1 / 240;

export interface PhysicsInput {
  boost: boolean;
  brake: boolean;
}

export interface PhysicsState {
  s: number;
  v: number;
  /** Boost energy 0..1 */
  boost: number;
  onChain: boolean;
  inStation: boolean;
  braking: boolean;
  finished: boolean;
  /** Seconds the safety drive tyres had to push a stalled train. */
  rescueTime: number;
  /** Vertical G (in the rider's up direction) and lateral G. */
  gVert: number;
  gLat: number;
}

export function createPhysicsState(): PhysicsState {
  return {
    s: START_S,
    v: 0,
    boost: 1,
    onChain: false,
    inStation: true,
    braking: false,
    finished: false,
    rescueTime: 0,
    gVert: 1,
    gLat: 0,
  };
}

const tmpT = new THREE.Vector3();
const tmpU = new THREE.Vector3();
const tmpK = new THREE.Vector3();
const tmpR = new THREE.Vector3();
const felt = new THREE.Vector3();

/** Advances the train using gravity along the slope, friction, drag, chain lift, boosters and brakes. */
export function stepPhysics(path: TrackPath, st: PhysicsState, dt: number, input: PhysicsInput) {
  if (st.finished) return;
  let remaining = Math.min(dt, 0.1);
  while (remaining > 1e-6) {
    const h = Math.min(SUBSTEP, remaining);
    remaining -= h;
    // average the slope over the train length (centre of mass of the whole train)
    const mid = st.s - (CAR_SPACING * (NUM_CARS - 1)) / 2;
    path.getTan(mid, tmpT);
    const flags = path.flagsAt(st.s);
    st.inStation = (flags & FLAG_STATION) !== 0;
    st.onChain = (flags & FLAG_CHAIN) !== 0;
    st.braking = (flags & FLAG_BRAKE) !== 0;

    let a = -GRAVITY * tmpT.y - ROLLING_FRICTION * Math.sign(st.v) - AIR_DRAG * st.v * Math.abs(st.v);

    if (input.boost && st.boost > 0 && !st.braking && !st.inStation) {
      a += BOOST_ACCEL;
      st.boost = Math.max(0, st.boost - h * 0.22);
    } else if (st.onChain) {
      st.boost = Math.min(1, st.boost + h * 0.25);
    }
    if (input.brake && !st.onChain && !st.inStation && st.v > 4) a -= BRAKE_ACCEL;

    if (st.braking) {
      const left = Math.max(0.5, path.length - 6 - st.s);
      const need = (st.v * st.v - 1.5) / (2 * left);
      if (st.v > 1.5) a = -Math.max(3, need);
      else a = 0.6;
    }

    st.v += a * h;

    if (st.inStation && st.s < path.length * 0.5 && st.v < STATION_SPEED) {
      st.v = Math.min(STATION_SPEED, st.v + 2.2 * h);
    }
    if (st.onChain && st.v < CHAIN_SPEED) st.v = Math.max(st.v + 3 * h, Math.min(CHAIN_SPEED, Math.max(st.v, 3.5)));

    // safety drive tyres: never let the train roll back on the circuit
    if (st.v < RESCUE_SPEED && !st.inStation && !st.braking && !st.onChain) {
      st.rescueTime += h;
      st.v = RESCUE_SPEED;
    }
    st.s += st.v * h;
    if (st.s >= path.length - 3) {
      st.s = path.length - 3;
      st.v = 0;
      st.finished = true;
      break;
    }
  }
  // G-force: felt acceleration = v^2 * k + g*worldUp, projected on rider axes
  const s = st.s - CAR_SPACING;
  path.getTan(s, tmpT);
  path.getUp(s, tmpU);
  path.getCurv(s, tmpK);
  tmpR.crossVectors(tmpT, tmpU);
  felt.copy(tmpK).multiplyScalar(st.v * st.v);
  felt.y += GRAVITY;
  st.gVert = felt.dot(tmpU) / GRAVITY;
  st.gLat = felt.dot(tmpR) / GRAVITY;
}
