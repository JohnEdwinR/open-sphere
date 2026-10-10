// All sound is synthesized with the Web Audio API: no audio assets to
// download or cache, works offline, and suits the retro pixel look.

export type Sound = "shoot" | "hit" | "killBat" | "killWraith" | "hurt" | "start" | "over";

const MUTE_KEY = "night-wizard-muted";

// A minor arpeggio (Am, Am, F, G) over a slow bass: eerie night loop.
const ARP = [220, 262, 330, 262, 220, 262, 330, 262, 175, 220, 262, 220, 196, 247, 294, 247];
const BASS = [110, 110, 87.3, 98];

export class GameAudio {
  muted = readMuted();

  private ctx: AudioContext | undefined;
  private master: GainNode | undefined;
  private musicGain: GainNode | undefined;
  private noise: AudioBuffer | undefined;

  private musicTimer: number | undefined;
  private nextTime = 0;
  private step = 0;
  private intensity = 0;

  /** Must be called from a user gesture (Start / Resume tap) to satisfy autoplay policies. */
  unlock() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);

      const length = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.8;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // storage may be blocked; mute just won't persist
    }
  }

  /** 0..1: music tempo rises as the night gets more dangerous. */
  setIntensity(value: number) {
    this.intensity = Math.min(1, Math.max(0, value));
  }

  play(sound: Sound) {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state !== "running") return;
    switch (sound) {
      case "shoot":
        this.tone(900, 260, 0.13, "square", 0.1);
        this.tone(1300, 500, 0.06, "triangle", 0.05);
        break;
      case "hit":
        this.tone(420, 260, 0.07, "square", 0.1);
        break;
      case "killBat":
        this.noiseBurst(0.12, 0.16);
        this.tone(520, 90, 0.2, "square", 0.12);
        break;
      case "killWraith":
        this.noiseBurst(0.2, 0.14);
        this.tone(700, 140, 0.34, "sine", 0.18);
        this.tone(350, 70, 0.34, "triangle", 0.12);
        break;
      case "hurt":
        this.noiseBurst(0.25, 0.22);
        this.tone(220, 50, 0.4, "sawtooth", 0.2);
        break;
      case "start":
        [392, 494, 587].forEach((f, i) => this.tone(f, f, 0.12, "square", 0.09, i * 0.09));
        break;
      case "over":
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.97, 0.3, "triangle", 0.16, i * 0.26));
        break;
    }
  }

  startMusic() {
    const ctx = this.ctx;
    if (!ctx || this.musicTimer !== undefined) return;
    this.nextTime = ctx.currentTime + 0.05;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 30);
  }

  stopMusic() {
    if (this.musicTimer === undefined) return;
    window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  private scheduleMusic() {
    const ctx = this.ctx;
    if (!ctx) return;
    const bpm = 92 + this.intensity * 44;
    const stepDur = 60 / bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.15) {
      const t = this.nextTime - ctx.currentTime;
      this.tone(ARP[this.step]!, ARP[this.step]!, stepDur * 1.5, "triangle", 0.09, t, this.musicGain);
      if (this.step % 4 === 0) {
        this.tone(BASS[this.step / 4]!, BASS[this.step / 4]!, stepDur * 3.6, "sine", 0.14, t, this.musicGain);
      }
      this.step = (this.step + 1) % ARP.length;
      this.nextTime += stepDur;
    }
  }

  private tone(
    from: number,
    to: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
    dest: AudioNode | undefined = this.master,
  ) {
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const t = ctx.currentTime + Math.max(0, delay);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noiseBurst(duration: number, volume: number) {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.master) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = this.noise;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.02);
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}
