/**
 * Procedural Web Audio engine: every sound is synthesised at runtime so the game
 * works offline with no audio assets.
 */
type MusicMode = 'menu' | 'ride' | 'off';

interface RideNodes {
  rumbleGain: GainNode;
  rumbleFilter: BiquadFilterNode;
  windGain: GainNode;
  windFilter: BiquadFilterNode;
  ambienceGain: GainNode;
  sources: AudioScheduledSourceNode[];
}

export interface RideAudioParams {
  speed: number; // m/s
  onChain: boolean;
  inStation: boolean;
  braking: boolean;
  running: boolean;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfx!: GainNode;
  private music!: GainNode;
  private noise!: AudioBuffer;
  private ride: RideNodes | null = null;
  private chainTimer = 0;
  private clackDistance = 0;
  private musicMode: MusicMode = 'off';
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private sfxVolume = 0.8;
  private musicVolume = 0.5;

  /** Must be called from a user gesture at least once (browser autoplay policy). */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.sfx = this.ctx.createGain();
        this.music = this.ctx.createGain();
        this.sfx.gain.value = this.sfxVolume;
        this.music.gain.value = this.musicVolume * 0.35;
        this.sfx.connect(this.ctx.destination);
        this.music.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 2;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        let brown = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          brown = (brown + 0.02 * white) / 1.02;
          d[i] = white * 0.5 + brown * 3;
        }
        if (this.musicMode !== 'off') this.startMusicLoop();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfx.gain.setTargetAtTime(sfx, t, 0.05);
    this.music.gain.setTargetAtTime(music * 0.35, t, 0.05);
  }

  private noiseSource() {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    return src;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, dest?: AudioNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.sfx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  click() {
    this.unlock();
    this.tone(880, 0.08, 'triangle', 0.12);
    this.tone(1320, 0.06, 'sine', 0.06, 0.02);
  }

  hover() {
    this.tone(660, 0.04, 'sine', 0.03);
  }

  countdownBeep(final: boolean) {
    this.tone(final ? 1046 : 523, final ? 0.5 : 0.18, 'square', 0.08);
  }

  complete(stars: number) {
    const notes = [523, 659, 784, 1046, 1318];
    notes.slice(0, 3 + Math.min(2, stars)).forEach((n, i) => {
      this.tone(n, 0.5, 'triangle', 0.15, i * 0.12);
      this.tone(n * 2, 0.3, 'sine', 0.04, i * 0.12);
    });
  }

  thrill() {
    this.tone(1200, 0.12, 'sine', 0.05);
  }

  warn() {
    this.tone(200, 0.2, 'sawtooth', 0.05);
  }

  startRide() {
    if (!this.ctx) return;
    this.stopRide();
    const ctx = this.ctx;
    const rumbleSrc = this.noiseSource();
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 120;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    rumbleSrc.connect(rumbleFilter).connect(rumbleGain).connect(this.sfx);

    const windSrc = this.noiseSource();
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 600;
    windFilter.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter).connect(windGain).connect(this.sfx);

    // station ambience: murmuring crowd (band-limited noise wobbling via an LFO)
    const ambSrc = this.noiseSource();
    const ambFilter = ctx.createBiquadFilter();
    ambFilter.type = 'bandpass';
    ambFilter.frequency.value = 420;
    ambFilter.Q.value = 1.4;
    const ambienceGain = ctx.createGain();
    ambienceGain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.7;
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(ambienceGain.gain);
    ambSrc.connect(ambFilter).connect(ambienceGain).connect(this.sfx);

    rumbleSrc.start();
    windSrc.start(ctx.currentTime + 0.37);
    ambSrc.start(ctx.currentTime + 0.81);
    lfo.start();
    this.ride = { rumbleGain, rumbleFilter, windGain, windFilter, ambienceGain, sources: [rumbleSrc, windSrc, ambSrc, lfo] };
  }

  updateRide(p: RideAudioParams, dt: number) {
    if (!this.ctx || !this.ride) return;
    const t = this.ctx.currentTime;
    const v = p.running ? p.speed : 0;
    const r = this.ride;
    r.rumbleGain.gain.setTargetAtTime(Math.min(0.55, 0.05 + v * 0.02) * (p.running ? 1 : 0), t, 0.1);
    r.rumbleFilter.frequency.setTargetAtTime(90 + v * 9, t, 0.1);
    r.windGain.gain.setTargetAtTime(Math.min(0.5, (v * v) / 2200), t, 0.15);
    r.windFilter.frequency.setTargetAtTime(400 + v * 40, t, 0.2);
    r.ambienceGain.gain.setTargetAtTime(p.inStation ? 0.06 : 0.0, t, 0.6);

    if (!p.running) return;
    // lift chain: regular "clack-clack" anti-rollback dogs
    if (p.onChain) {
      this.chainTimer -= dt;
      if (this.chainTimer <= 0) {
        this.chainTimer = 0.22;
        this.tone(140 + Math.random() * 20, 0.05, 'square', 0.09);
        this.tone(2400, 0.02, 'square', 0.02);
      }
    }
    // wheel clacks over rail joints
    this.clackDistance += v * dt;
    if (this.clackDistance > 9 && v > 2) {
      this.clackDistance = 0;
      this.tone(90, 0.06, 'triangle', Math.min(0.12, 0.03 + v * 0.004));
    }
    if (p.braking && v > 3 && Math.random() < dt * 6) {
      this.tone(2600 + Math.random() * 400, 0.25, 'sawtooth', 0.015);
    }
  }

  stopRide() {
    if (!this.ride) return;
    for (const s of this.ride.sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.ride.rumbleGain.disconnect();
    this.ride.windGain.disconnect();
    this.ride.ambienceGain.disconnect();
    this.ride = null;
  }

  // ---------------- music ----------------
  setMusic(mode: MusicMode) {
    if (mode === this.musicMode) return;
    this.musicMode = mode;
    if (mode === 'off') this.stopMusicLoop();
    else if (this.ctx) this.startMusicLoop();
  }

  private startMusicLoop() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 50);
  }

  private stopMusicLoop() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private scheduleMusic() {
    if (!this.ctx) return;
    const tempo = this.musicMode === 'ride' ? 132 : 100;
    const stepDur = 60 / tempo / 2;
    // I - V - vi - IV in C major
    const chords = [
      [261.6, 329.6, 392.0],
      [196.0, 246.9, 293.7],
      [220.0, 261.6, 329.6],
      [174.6, 220.0, 261.6],
    ];
    while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
      const bar = Math.floor(this.step / 8) % 4;
      const chord = chords[bar];
      const when = this.nextNoteTime - this.ctx.currentTime;
      const inBar = this.step % 8;
      if (inBar === 0) {
        chord.forEach((f) => this.tone(f / 2, stepDur * 7.5, 'sine', 0.05, when, this.music));
        this.tone(chord[0] / 4, stepDur * 3, 'triangle', 0.12, when, this.music);
      }
      if (inBar === 4) this.tone(chord[0] / 4, stepDur * 3, 'triangle', 0.1, when, this.music);
      const arp = [0, 1, 2, 1, 2, 0, 1, 2][inBar];
      this.tone(chord[arp] * (this.musicMode === 'ride' ? 2 : 1), stepDur * 0.9, 'triangle', 0.05, when, this.music);
      this.nextNoteTime += stepDur;
      this.step++;
    }
  }
}

export const audio = new AudioEngine();
