const CROWD_FILES = {
  chant: "/sfx/crowd-chant.mp3",
  drums: "/sfx/crowd-drums.mp3",
  cheer: "/sfx/crowd-cheer.mp3",
  hit: "/sfx/crowd-hit.mp3",
} as const;

type CrowdKey = keyof typeof CROWD_FILES;

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private ambience: GainNode | null = null;
  private crowdEnv: GainNode | null = null;
  private drumsGain: GainNode | null = null;
  private crowdNodes: AudioNode[] = [];
  private crowdSources: Array<AudioBufferSourceNode | OscillatorNode> = [];
  private buffers: Partial<Record<CrowdKey, AudioBuffer>> = {};
  private loadPromise: Promise<void> | null = null;
  private crowdGen = 0;
  private crowdMood: "off" | "duck" | "ready" | "play" = "off";
  private muted = false;
  unlocked = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      const g = muted ? 0 : 1;
      this.master.gain.setTargetAtTime(g, this.ctx.currentTime, 0.02);
    }
  }

  unlock() {
    if (this.unlocked && this.ctx?.state === "running") {
      void this.loadSamples();
      return;
    }
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.ambience = this.ctx.createGain();
      this.sfx.gain.value = 0.7;
      this.ambience.gain.value = 0.72;
      this.sfx.connect(this.master);
      this.ambience.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.master.gain.value = this.muted ? 0 : 1;
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    this.unlocked = true;
    void this.loadSamples().then(() => {
      if (this.crowdMood !== "off") this.ensureCrowd();
    });
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    if (this.crowdMood !== "off" && this.crowdSources.length === 0) {
      this.ensureCrowd();
    }
  }

  dispose() {
    this.crowdStop();
    this.tearCrowd();
    if (this.ctx && this.ctx.state !== "closed") void this.ctx.close();
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.ambience = null;
    this.unlocked = false;
  }

  crowdReady() {
    this.setCrowd("ready", 0.3);
  }

  crowdPlay() {
    this.setCrowd("play", 0.22);
  }

  crowdDuck() {
    this.setCrowd("duck", 0.18);
  }

  crowdStop() {
    this.crowdMood = "off";
    if (this.crowdEnv && this.ctx) {
      this.crowdEnv.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.35);
    }
    if (this.drumsGain && this.ctx) {
      this.drumsGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.35);
    }
  }

  crowdCheer(big = false) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    this.ensureCrowd();
    if (!this.crowdEnv) return;
    const now = ctx.currentTime;
    const peak = big ? 1 : 0.95;
    this.crowdEnv.gain.cancelScheduledValues(now);
    this.crowdEnv.gain.setTargetAtTime(peak, now, 0.04);
    const back = this.crowdMood === "off" ? 0.0001 : this.levelFor(this.crowdMood);
    this.crowdEnv.gain.setTargetAtTime(back, now + (big ? 2.2 : 1.4), 0.5);
    if (this.drumsGain) {
      this.drumsGain.gain.cancelScheduledValues(now);
      this.drumsGain.gain.setTargetAtTime(big ? 0.95 : 0.8, now, 0.05);
      this.drumsGain.gain.setTargetAtTime(
        this.drumsFor(this.crowdMood),
        now + 1.6,
        0.45,
      );
    }
    const cheer = this.buffers.cheer;
    const hit = this.buffers.hit;
    if (cheer) {
      this.fireBuf(cheer, this.ambience!, now, big ? 0.95 : 0.78, 1);
      if (big) this.fireBuf(cheer, this.ambience!, now + 0.55, 0.7, 1.03);
    }
    if (hit) {
      this.fireBuf(hit, this.ambience!, now, 0.7, 1);
      this.fireBuf(hit, this.ambience!, now + 0.18, 0.55, 1.04);
      if (big) this.fireBuf(hit, this.ambience!, now + 0.42, 0.62, 0.97);
    }
  }

  kick(strength: number, pan = 0) {
    const ctx = this.ctx;
    const bus = this.sfx;
    if (!ctx || !bus || this.muted) return;
    const t = ctx.currentTime;
    const s = Math.min(1, Math.max(0.15, strength));
    this.noiseBurst(t, 0.045 + s * 0.04, 180 + s * 420, 0.18 + s * 0.28, pan);
    this.thump(t, 90 + s * 70, 0.12 + s * 0.1, 0.22 + s * 0.3, pan);
  }

  wall(pan = 0) {
    const ctx = this.ctx;
    const bus = this.sfx;
    if (!ctx || !bus || this.muted) return;
    this.noiseBurst(ctx.currentTime, 0.03, 900, 0.12, pan);
    this.thump(ctx.currentTime, 220, 0.06, 0.1, pan);
  }

  whistle() {
    const ctx = this.ctx;
    const bus = this.sfx;
    if (!ctx || !bus || this.muted) return;
    const t = ctx.currentTime;
    this.tone(t, 1480, 0.18, 0.09, "square", 0);
    this.tone(t + 0.2, 1480, 0.28, 0.09, "square", 0);
  }

  goal() {
    const ctx = this.ctx;
    const bus = this.sfx;
    if (!ctx || !bus || this.muted) return;
    const t = ctx.currentTime;
    this.tone(t, 392, 0.35, 0.16, "triangle", 0);
    this.tone(t + 0.08, 523, 0.4, 0.16, "triangle", 0);
    this.tone(t + 0.18, 659, 0.5, 0.18, "triangle", 0);
    this.noiseBurst(t, 0.28, 400, 0.22, 0);
    this.crowdCheer(false);
  }

  ui() {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || this.muted) return;
    this.tone(ctx.currentTime, 640, 0.05, 0.07, "sine", 0);
  }

  win() {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || this.muted) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => {
      this.tone(t + i * 0.11, f, 0.28, 0.14, "triangle", 0);
    });
    this.crowdCheer(true);
  }

  private levelFor(mood: "duck" | "ready" | "play") {
    if (mood === "duck") return 0.22;
    if (mood === "ready") return 0.42;
    return 0.72;
  }

  private drumsFor(mood: "off" | "duck" | "ready" | "play") {
    if (mood === "play") return 0.7;
    if (mood === "ready") return 0.28;
    if (mood === "duck") return 0.12;
    return 0.0001;
  }

  private applyCrowdLevel(mood: "duck" | "ready" | "play", tau: number) {
    if (!this.ctx) return;
    if (this.crowdEnv) {
      this.crowdEnv.gain.setTargetAtTime(
        this.levelFor(mood),
        this.ctx.currentTime,
        tau,
      );
    }
    if (this.drumsGain) {
      this.drumsGain.gain.setTargetAtTime(
        this.drumsFor(mood),
        this.ctx.currentTime,
        tau,
      );
    }
  }

  private setCrowd(mood: "duck" | "ready" | "play", tau: number) {
    this.crowdMood = mood;
    this.ensureCrowd();
    this.applyCrowdLevel(mood, tau);
  }

  private ensureCrowd() {
    const ctx = this.ctx;
    const bus = this.ambience;
    if (!ctx || !bus) return;
    if (this.crowdEnv && this.crowdSources.length) {
      if (this.crowdMood !== "off") this.applyCrowdLevel(this.crowdMood, 0.2);
      return;
    }
    void this.startCrowdWhenReady();
  }

  private async startCrowdWhenReady() {
    const gen = this.crowdGen;
    await this.loadSamples();
    if (gen !== this.crowdGen || this.crowdMood === "off" || !this.ctx) return;
    if (this.crowdEnv && this.crowdSources.length) {
      this.applyCrowdLevel(this.crowdMood, 0.2);
      return;
    }
    this.buildCrowdGraph();
    this.applyCrowdLevel(this.crowdMood, 0.25);
  }

  private async loadSamples() {
    if (this.loadPromise) return this.loadPromise;
    const ctx = this.ctx;
    if (!ctx) return;
    this.loadPromise = (async () => {
      const keys = Object.keys(CROWD_FILES) as CrowdKey[];
      await Promise.all(
        keys.map(async (key) => {
          try {
            const res = await fetch(CROWD_FILES[key]);
            if (!res.ok) throw new Error(String(res.status));
            const raw = await res.arrayBuffer();
            this.buffers[key] = await decodeBuf(ctx, raw);
          } catch {
            /* fallback graph covers a missing file */
          }
        }),
      );
    })();
    return this.loadPromise;
  }

  private buildCrowdGraph() {
    const ctx = this.ctx;
    const bus = this.ambience;
    if (!ctx || !bus) return;
    this.tearCrowd();

    const env = ctx.createGain();
    env.gain.value = 0.0001;
    env.connect(bus);
    this.crowdEnv = env;
    this.crowdNodes.push(env);

    const drums = ctx.createGain();
    drums.gain.value = 0.0001;
    drums.connect(env);
    this.drumsGain = drums;
    this.crowdNodes.push(drums);

    const chant = this.buffers.chant;
    const drumBuf = this.buffers.drums;

    if (chant) {
      this.loopBuf(chant, env, 0.55, 0);
      this.loopBuf(chant, env, 0.42, 0.47);
    }
    if (drumBuf) {
      this.loopBuf(drumBuf, drums, 0.7, 0);
      this.loopBuf(drumBuf, drums, 0.45, 0.38);
    }

    if (!chant && !drumBuf) this.buildFallbackCrowd(ctx, env);
  }

  private loopBuf(
    buf: AudioBuffer,
    dest: AudioNode,
    gain: number,
    offsetFrac: number,
  ) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(dest);
    const off = (offsetFrac * buf.duration) % Math.max(0.01, buf.duration);
    src.start(ctx.currentTime, off);
    this.crowdSources.push(src);
    this.crowdNodes.push(g);
  }

  private fireBuf(
    buf: AudioBuffer,
    dest: AudioNode,
    when: number,
    gain: number,
    rate: number,
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.setTargetAtTime(0.0001, when + Math.max(0.4, buf.duration - 0.35), 0.18);
    src.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + buf.duration + 0.05);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
  }

  private buildFallbackCrowd(ctx: AudioContext, dest: AudioNode) {
    const buf = bakeStadiumLoop(ctx, 4);
    this.loopBuf(buf, dest, 0.7, 0);
    this.loopBuf(buf, dest, 0.55, 0.5);
  }

  private tearCrowd() {
    this.crowdGen += 1;
    for (const s of this.crowdSources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    for (const n of this.crowdNodes) {
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.crowdSources = [];
    this.crowdNodes = [];
    this.crowdEnv = null;
    this.drumsGain = null;
  }

  private destination(): AudioNode | null {
    return this.sfx;
  }

  private panner(pan: number): StereoPannerNode | GainNode {
    return this.pannerTo(pan, this.destination()!);
  }

  private pannerTo(pan: number, dest: AudioNode): StereoPannerNode | GainNode {
    const ctx = this.ctx!;
    if (typeof ctx.createStereoPanner === "function") {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      p.connect(dest);
      return p;
    }
    const g = ctx.createGain();
    g.connect(dest);
    return g;
  }

  private thump(
    when: number,
    freq: number,
    dur: number,
    gain: number,
    pan: number,
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.45, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.panner(pan));
    osc.start(when);
    osc.stop(when + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private tone(
    when: number,
    freq: number,
    dur: number,
    gain: number,
    type: OscillatorType,
    pan: number,
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.panner(pan));
    osc.start(when);
    osc.stop(when + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private noiseBurst(
    when: number,
    dur: number,
    cutoff: number,
    gain: number,
    pan: number,
  ) {
    const ctx = this.ctx!;
    const n = 0.35 * ctx.sampleRate;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.panner(pan));
    src.start(when);
    src.stop(when + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
}

async function decodeBuf(ctx: AudioContext, raw: ArrayBuffer): Promise<AudioBuffer> {
  const copy = raw.slice(0);
  return await new Promise((resolve, reject) => {
    let settled = false;
    const ok = (buf: AudioBuffer) => {
      if (!settled) {
        settled = true;
        resolve(buf);
      }
    };
    const bad = (err?: unknown) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };
    try {
      const p = ctx.decodeAudioData(copy, ok, bad);
      if (p && typeof p.then === "function") void p.then(ok, bad);
    } catch (err) {
      bad(err);
    }
  });
}

function bakeStadiumLoop(ctx: AudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.floor(seconds * sr);
  const buf = ctx.createBuffer(2, n, sr);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const beat = Math.floor(0.48 * sr);

  const addGrain = (
    at: number,
    dur: number,
    formant: number,
    amp: number,
    pan: number,
  ) => {
    const len = Math.floor(dur * sr);
    for (let i = 0; i < len; i++) {
      const t = at + i;
      if (t < 0 || t >= n) continue;
      const env = Math.sin((Math.PI * i) / len);
      const s =
        Math.sin((2 * Math.PI * formant * i) / sr) * 0.55 +
        (Math.random() * 2 - 1) * 0.45;
      const v = s * env * amp;
      L[t] += v * (1 - pan);
      R[t] += v * pan;
    }
  };

  for (let g = 0; g < 90; g++) {
    addGrain(
      Math.floor(Math.random() * n),
      0.07 + Math.random() * 0.16,
      520 + Math.random() * 1600,
      0.045 + Math.random() * 0.05,
      Math.random(),
    );
  }
  for (let b = 0; b < n; b += beat) {
    addGrain(b, 0.09, 220 + Math.random() * 40, 0.14, 0.5);
    addGrain(b + Math.floor(beat * 0.5), 0.04, 2400, 0.1, 0.35 + Math.random() * 0.3);
  }
  let peak = 0.0001;
  for (let i = 0; i < n; i++) {
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = 0.7 / peak;
  for (let i = 0; i < n; i++) {
    L[i] *= norm;
    R[i] *= norm;
  }
  return buf;
}
