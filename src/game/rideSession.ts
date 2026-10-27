import * as THREE from 'three';
import { createPhysicsState, stepPhysics, START_S, type PhysicsState } from '../physics/coasterPhysics';
import type { TrackPath } from '../track/trackPath';
import { thrillRate } from '../track/validate';
import { useHudStore, type RideStatus } from '../store/hudStore';
import type { RideResult, RideSource } from '../types';
import { audio } from '../audio/audioEngine';

export interface RideInput {
  boost: boolean;
  brake: boolean;
  handsUp: boolean;
}

const HIGH_G_PENALTY = 4.2;
const COMPLETION_BONUS = 500;

/**
 * Owns the gameplay state of one ride: countdown, physics, scoring and stats.
 * It is plain TypeScript; the 3D scene reads from it every frame.
 */
export class RideSession {
  readonly path: TrackPath;
  readonly source: RideSource;
  readonly thrillPotential: number;
  phys: PhysicsState;
  status: RideStatus = 'countdown';
  countdown = 3;
  time = 0;
  input: RideInput = { boost: false, brake: false, handsUp: false };
  gSmooth = 1;
  thrill = 0;
  penalties = 0;
  maxSpeed = 0;
  maxHeight = 0;
  maxG = 1;
  minG = 1;
  inversions = 0;
  private wasInverted = false;
  private hudTimer = 0;
  private message: { text: string; tone: 'good' | 'bad' | 'info'; ttl: number } | null = null;
  private lastCount = 4;
  private airtime = 0;
  onFinish?: (session: RideSession) => void;
  private readonly tmpUp = new THREE.Vector3();
  private readonly tmpPos = new THREE.Vector3();

  /** Demo sessions (menu backgrounds) skip the countdown, sounds and HUD updates. */
  readonly demo: boolean;

  constructor(path: TrackPath, source: RideSource, thrillPotential: number, demo = false) {
    this.path = path;
    this.source = source;
    this.thrillPotential = Math.max(1, thrillPotential);
    this.demo = demo;
    this.phys = createPhysicsState();
    if (demo) this.countdown = 0;
    this.applyDemoStart();
    this.pushHud(true);
  }

  restart() {
    this.phys = createPhysicsState();
    this.status = 'countdown';
    this.countdown = this.demo ? 0 : 3;
    this.lastCount = 4;
    this.time = 0;
    this.gSmooth = 1;
    this.thrill = 0;
    this.penalties = 0;
    this.maxSpeed = 0;
    this.maxHeight = 0;
    this.maxG = 1;
    this.minG = 1;
    this.inversions = 0;
    this.wasInverted = false;
    this.airtime = 0;
    this.message = null;
    this.applyDemoStart();
    this.pushHud(true);
  }

  private applyDemoStart() {
    if (!this.demo) return;
    const lift = this.path.segments.find((sg) => sg.type === 'lift');
    if (lift) {
      this.phys.s = Math.max(START_S, lift.end - 12);
      this.phys.v = 5;
    }
  }

  pause() {
    if (this.status === 'running' || this.status === 'countdown') {
      this.prevStatus = this.status;
      this.status = 'paused';
      this.pushHud(true);
    }
  }
  private prevStatus: RideStatus = 'running';
  resume() {
    if (this.status === 'paused') {
      this.status = this.prevStatus;
      this.pushHud(true);
    }
  }

  get score() {
    return Math.max(0, Math.round(this.thrill - this.penalties));
  }

  get completion() {
    return Math.min(1, Math.max(0, (this.phys.s - START_S) / (this.path.length - 3 - START_S)));
  }

  flash(text: string, tone: 'good' | 'bad' | 'info' = 'info', ttl = 1.4) {
    this.message = { text, tone, ttl };
  }

  update(dt: number) {
    dt = Math.min(dt, 0.1);
    if (this.status === 'paused' || this.status === 'finished') {
      this.pushHud(false, dt);
      return;
    }
    if (this.status === 'countdown') {
      this.countdown -= dt;
      const c = Math.ceil(this.countdown);
      if (c !== this.lastCount && c >= 0 && !this.demo) {
        this.lastCount = c;
        audio.countdownBeep(c === 0);
      }
      if (this.countdown <= 0) {
        this.status = 'running';
        this.flash('GO!', 'good', 1);
      }
      this.pushHud(false, dt);
      return;
    }

    this.time += dt;
    const ph = this.phys;
    stepPhysics(this.path, ph, dt, this.input);
    // G-force low-pass so the gauge reads like a real accelerometer
    this.gSmooth += (ph.gVert - this.gSmooth) * Math.min(1, dt * 8);
    const g = this.gSmooth;
    this.path.getPos(ph.s, this.tmpPos);
    this.maxSpeed = Math.max(this.maxSpeed, ph.v);
    this.maxHeight = Math.max(this.maxHeight, this.tmpPos.y);
    if (!ph.braking && !ph.inStation) {
      this.maxG = Math.max(this.maxG, g);
      this.minG = Math.min(this.minG, g);
    }
    this.path.getUp(ph.s - 3, this.tmpUp);
    const inverted = this.tmpUp.y < -0.2;
    if (inverted && !this.wasInverted) {
      this.inversions++;
      this.flash('INVERSION!', 'good');
    }
    this.wasInverted = inverted;

    // scoring: hands up earns thrill points; hands up in heavy G costs points
    if (this.input.handsUp && !ph.onChain && !ph.inStation && !ph.braking) {
      if (g > HIGH_G_PENALTY) {
        this.penalties += 60 * dt;
        if (!this.message || this.message.tone !== 'bad') {
          this.flash('HOLD ON! Too many Gs', 'bad');
          audio.warn();
        }
      } else {
        const r = thrillRate(ph.v, g);
        this.thrill += r * dt;
        if (g < 0.35 && ph.v > 7) {
          this.airtime += dt;
          if (this.airtime > 0.3 && (!this.message || this.message.text !== 'AIRTIME x2')) {
            this.flash('AIRTIME x2', 'good', 0.8);
            audio.thrill();
          }
        } else this.airtime = 0;
      }
    }
    if (ph.rescueTime > 0.5 && ph.rescueTime - dt <= 0.5) this.flash('Safety tyres engaged', 'info');

    if (ph.finished) {
      this.status = 'finished';
      this.pushHud(true);
      this.onFinish?.(this);
      return;
    }
    this.pushHud(false, dt);
  }

  stars() {
    const ratio = this.thrill / this.thrillPotential - this.penalties / this.thrillPotential;
    return 1 + (ratio >= 0.4 ? 1 : 0) + (ratio >= 0.7 ? 1 : 0);
  }

  buildResult(): Omit<RideResult, 'newBest' | 'unlockedLevel'> {
    const complete = this.status === 'finished';
    const bonus = complete ? COMPLETION_BONUS + Math.round(this.maxSpeed * 3.6 * 3) + this.inversions * 150 : 0;
    return {
      source: this.source,
      score: this.score + bonus,
      stars: complete ? this.stars() : 0,
      maxSpeed: this.maxSpeed * 3.6,
      maxHeight: this.maxHeight,
      maxG: this.maxG,
      minG: this.minG,
      duration: this.time,
      inversions: this.inversions,
      completion: complete ? 1 : this.completion,
      thrill: Math.round(this.thrill),
      rescued: this.phys.rescueTime > 0.5,
    };
  }

  private pushHud(force: boolean, dt = 0) {
    if (this.demo) return;
    if (this.message) {
      this.message.ttl -= dt;
      if (this.message.ttl <= 0) this.message = null;
    }
    this.hudTimer -= dt;
    if (!force && this.hudTimer > 0) return;
    this.hudTimer = 1 / 15;
    this.path.getPos(this.phys.s, this.tmpPos);
    useHudStore.setState({
      status: this.status,
      countdown: Math.max(0, Math.ceil(this.countdown)),
      speed: this.phys.v * 3.6,
      height: this.tmpPos.y,
      time: this.time,
      gForce: this.gSmooth,
      progress: this.completion,
      boost: this.phys.boost,
      score: this.score,
      onChain: this.phys.onChain,
      handsUp: this.input.handsUp,
      message: this.message?.text ?? null,
      messageTone: this.message?.tone ?? 'info',
    });
  }
}
