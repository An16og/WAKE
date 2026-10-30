// Procedural Web Audio Engine with Static SFX & Safe Mode Support

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isSafeMode: boolean = false;
  private isStarted: boolean = false;

  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  // Procedural Horror BGM Synthesizer
  private bgmOsc1: OscillatorNode | null = null;
  private bgmOsc2: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private bgmLfo: OscillatorNode | null = null;
  private bgmChordTimer: any = null;
  private bgmChimeTimer: any = null;

  private heartbeatIntervalId: any = null;
  private distance: number = 10;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public initOnGesture(): void {
    if (this.isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.isStarted) {
        this.isStarted = true;
        this.startDrone();
        this.startBgm();
        this.updateHeartbeat(this.distance);
      }
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ctx) {
      if (this.isMuted) {
        this.ctx.suspend().catch(() => {});
      } else {
        this.ctx.resume().catch(() => {});
        if (!this.isStarted) {
          this.initOnGesture();
        } else {
          this.scheduleNextBgmChime();
        }
      }
    } else if (!this.isMuted) {
      this.initOnGesture();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setSafeMode(safe: boolean): void {
    this.isSafeMode = safe;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.isSafeMode ? 0.025 : 0.05, this.ctx.currentTime);
    }
  }

  public setDistance(dist: number): void {
    this.distance = Math.max(0, Math.min(10, dist));
    this.updateHeartbeat(this.distance);
  }

  private startDrone(): void {
    if (!this.ctx || this.isMuted || this.droneOsc) return;
    try {
      this.droneOsc = this.ctx.createOscillator();
      this.droneGain = this.ctx.createGain();

      this.droneOsc.type = 'sawtooth';
      this.droneOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // 55 Hz A1 hum

      // Lowpass filter to muffle harsh harmonics
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, this.ctx.currentTime);

      this.droneGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

      this.droneOsc.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(this.ctx.destination);

      this.droneOsc.start();
    } catch (err) {
      console.warn('Drone audio err:', err);
    }
  }

  private startBgm(): void {
    if (!this.ctx || this.isMuted || this.bgmOsc1) return;
    try {
      const now = this.ctx.currentTime;

      // Master BGM Gain
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.isSafeMode ? 0.025 : 0.05, now);

      // Warm analog lowpass filter
      this.bgmFilter = this.ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.setValueAtTime(240, now);
      this.bgmFilter.Q.setValueAtTime(2.2, now);

      // Slow tape-warble breathing LFO modulating filter cutoff
      this.bgmLfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      this.bgmLfo.type = 'sine';
      this.bgmLfo.frequency.setValueAtTime(0.12, now); // ~8s slow breathing wave
      lfoGain.gain.setValueAtTime(80, now); // sweep +/- 80Hz
      this.bgmLfo.connect(lfoGain);
      lfoGain.connect(this.bgmFilter.frequency);
      this.bgmLfo.start();

      // Dual detuned oscillators for thick, eerie retro synth pad
      this.bgmOsc1 = this.ctx.createOscillator();
      this.bgmOsc2 = this.ctx.createOscillator();

      this.bgmOsc1.type = 'triangle';
      this.bgmOsc2.type = 'sawtooth';

      // Initial chord: C minor ambient (C2 = 65.41 Hz, Eb2 = 77.78 Hz)
      this.bgmOsc1.frequency.setValueAtTime(65.41, now);
      this.bgmOsc2.frequency.setValueAtTime(77.78, now);
      this.bgmOsc2.detune.setValueAtTime(-6, now); // slight analog chorus detune

      this.bgmOsc1.connect(this.bgmFilter);
      this.bgmOsc2.connect(this.bgmFilter);
      this.bgmFilter.connect(this.bgmGain);
      this.bgmGain.connect(this.ctx.destination);

      this.bgmOsc1.start();
      this.bgmOsc2.start();

      // Atmospheric progression: shifts chords smoothly every 9 seconds
      const chords = [
        [65.41, 77.78],   // C2 + Eb2 (C minor dark)
        [58.27, 87.31],   // Bb1 + F2 (Desolate drop)
        [61.74, 92.50],   // B1 + F#2 (Eerie tritonic dread)
        [73.42, 87.31],   // D2 + F2 (D minor tension)
        [55.00, 82.41]    // A1 + E2 (Hollow resolve)
      ];
      let chordIndex = 0;

      if (this.bgmChordTimer) {
        clearInterval(this.bgmChordTimer);
        this.bgmChordTimer = null;
      }
      this.bgmChordTimer = setInterval(() => {
        if (!this.ctx || this.isMuted || !this.bgmOsc1 || !this.bgmOsc2) return;
        chordIndex = (chordIndex + 1) % chords.length;
        const [f1, f2] = chords[chordIndex];
        const t = this.ctx.currentTime;
        // Smooth 2s portamento glide between chords
        this.bgmOsc1.frequency.setTargetAtTime(f1, t, 1.8);
        this.bgmOsc2.frequency.setTargetAtTime(f2, t, 1.8);
      }, 9000);

      // Random high music-box glass chimes that gently ring in the dark
      this.scheduleNextBgmChime();
    } catch (e) {
      console.warn('[SoundEngine] BGM init error:', e);
    }
  }

  private scheduleNextBgmChime(): void {
    if (this.bgmChimeTimer) {
      clearTimeout(this.bgmChimeTimer);
      this.bgmChimeTimer = null;
    }
    const delayMs = 4500 + Math.random() * 5500;
    this.bgmChimeTimer = setTimeout(() => {
      this.playEerieChime();
      if (this.isStarted && !this.isMuted) {
        this.scheduleNextBgmChime();
      }
    }, delayMs);
  }

  private playEerieChime(): void {
    if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
    try {
      const chimeNotes = [587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66]; // D5, E5, G5, A5, C6, D6
      const freq = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const chimeVol = this.isSafeMode ? 0.015 : 0.035;
      gain.gain.setValueAtTime(chimeVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2); // long decaying ring

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 2.3);
    } catch (e) {
      // ignore
    }
  }

  private updateHeartbeat(distance: number): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    if (!this.ctx || this.isMuted || distance <= 0) return;

    // Heartbeat speed: distance 10 = 1200ms interval (50 bpm); distance 1 = 350ms interval (170 bpm)
    const intervalMs = 350 + (distance / 10) * 850;

    this.heartbeatIntervalId = setInterval(() => {
      this.playHeartbeatThump();
    }, intervalMs);
  }

  private playHeartbeatThump(): void {
    if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      // Lub
      this.synthesizeThump(now, 75, 45, 0.12, 0.15);
      // Dub (slightly quieter and delayed)
      this.synthesizeThump(now + 0.14, 65, 40, 0.1, 0.1);
    } catch (e) {
      // ignore
    }
  }

  private synthesizeThump(startTime: number, freqStart: number, freqEnd: number, duration: number, gainVal: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqStart, startTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);

    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  public playKeyClick(): void {
    if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.015);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.015);
    } catch (e) {
      // ignore
    }
  }

  public playGlitchNoise(): void {
    if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.15; // 150ms buffer
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.2;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.isSafeMode ? 0.05 : 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch (e) {
      // ignore
    }
  }

  public async playSfx(name: string): Promise<void> {
    if (this.isMuted) return;
    try {
      this.initOnGesture();
      const audio = new Audio(`/sfx/${name}.mp3`);
      audio.volume = this.isSafeMode ? 0.25 : 0.75;
      await audio.play();
    } catch (err) {
      console.warn(`[SoundEngine] playSfx('${name}') fallback:`, err);
      // Fallback to procedural generation if audio file doesn't exist or play() is blocked
      this.playGlitchNoise();
    }
  }
}

export const soundEngine = new SoundEngine();
