// Procedural Web Audio Engine with Static SFX & Safe Mode Support

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isSafeMode: boolean = false;
  private isStarted: boolean = false;

  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

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
