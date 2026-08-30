import { GameAudio } from "./audio";
import { Renderer } from "./render";
import { patchUi, useGameUi } from "./store";
import {
  BRASA,
  GELO,
  PAPER,
  loadSettings,
  makeField,
  saveSettings,
  type Ball,
  type Field,
  type Finger,
  type GoalSize,
  type Mode,
  type Particle,
  type Phase,
} from "./types";

const STEP = 1 / 120;
const MAX_BALL = 2400;
const MAX_FINGER = 2100;
const FRICTION = 0.52;
const REST = 0.84;
const MAX_FINGERS = 3;

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private field: Field;
  private ball: Ball;
  private fingers = new Map<number, Finger>();
  private bot: Finger | null = null;
  private particles: Particle[] = [];
  private renderer = new Renderer();
  private audio = new GameAudio();

  private raf = 0;
  private last = 0;
  private acc = 0;
  private time = 0;
  private hitstop = 0;
  private trauma = 0;
  private reducedMotion = false;
  private dpr = 1;
  private running = false;
  private goalLock = 0;
  private countLeft = 0;
  private idleBoost = 0;
  private kickoffTimer: ReturnType<typeof setTimeout> | undefined;

  private phase: Phase = "menu";
  private mode: Mode = "versus";
  private score: [number, number] = [0, 0];
  private target = 5;
  private muted = false;
  private shakeOn = true;
  private ready: [boolean, boolean] = [false, false];
  private goalSize: GoalSize = "m";
  private padCool = [0, 0];
  private trail: Array<{ x: number; y: number }> = [];
  private flash = 0;

  private ro: ResizeObserver | null = null;
  private unbind: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D indisponível");
    this.ctx = ctx;
    this.field = makeField(360, 640, this.goalSize);
    this.ball = this.freshBall();

    const s = loadSettings();
    this.target = s.target;
    this.muted = s.muted;
    this.shakeOn = s.shake;
    this.goalSize = s.goalSize;
    this.audio.setMuted(s.muted);
    patchUi({
      target: s.target,
      muted: s.muted,
      shake: s.shake,
      goalSize: s.goalSize,
    });

    this.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    this.bind();
    this.resize();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    if (this.kickoffTimer !== undefined) clearTimeout(this.kickoffTimer);
    this.ro?.disconnect();
    for (const off of this.unbind) off();
    this.unbind = [];
    this.fingers.clear();
    this.audio.dispose();
  }

  unlockAudio() {
    this.audio.unlock();
  }

  setMode(mode: Mode) {
    this.mode = mode;
    this.score = [0, 0];
    this.ready = [false, false];
    this.fingers.clear();
    this.bot = null;
    if (mode === "versus") {
      this.phase = "ready";
      patchUi({
        phase: "ready",
        mode,
        score: [0, 0],
        ready: [false, false],
        winner: null,
        lastScorer: null,
      });
      this.audio.crowdReady();
    } else {
      this.beginKickoff(true);
    }
    this.audio.ui();
  }

  setReady(side: 0 | 1) {
    if (this.phase !== "ready") return;
    this.ready[side] = true;
    patchUi({ ready: [...this.ready] as [boolean, boolean] });
    this.audio.ui();
    if (this.ready[0] && this.ready[1]) this.beginKickoff(true);
  }

  rematch() {
    this.score = [0, 0];
    this.fingers.clear();
    if (this.mode === "versus") {
      this.ready = [false, false];
      this.phase = "ready";
      this.resetBall(true);
      patchUi({
        phase: "ready",
        score: [0, 0],
        ready: [false, false],
        winner: null,
        lastScorer: null,
      });
      this.audio.crowdReady();
    } else {
      this.beginKickoff(true);
      patchUi({ score: [0, 0], winner: null, lastScorer: null });
    }
    this.audio.ui();
  }

  toMenu() {
    this.phase = "menu";
    this.fingers.clear();
    this.bot = null;
    this.resetBall(true);
    this.idleBoost = 0.4;
    patchUi({
      phase: "menu",
      ready: [false, false],
      winner: null,
      lastScorer: null,
      countdown: 0,
    });
    this.audio.crowdStop();
  }

  pause() {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    patchUi({ phase: "paused" });
    this.audio.crowdDuck();
  }

  resume() {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    patchUi({ phase: "playing" });
    this.audio.crowdPlay();
  }

  setTarget(n: number) {
    this.target = n;
    this.persist();
    patchUi({ target: n });
  }

  setGoalSize(size: GoalSize) {
    this.goalSize = size;
    this.persist();
    patchUi({ goalSize: size });
    this.resize();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.audio.setMuted(muted);
    this.persist();
    patchUi({ muted });
  }

  setShake(shake: boolean) {
    this.shakeOn = shake;
    this.persist();
    patchUi({ shake });
  }

  private persist() {
    saveSettings({
      target: this.target,
      muted: this.muted,
      shake: this.shakeOn,
      goalSize: this.goalSize,
    });
  }

  private beginKickoff(resetScore: boolean) {
    if (resetScore) this.score = [0, 0];
    this.fingers.clear();
    if (this.mode === "bot") this.spawnBot();
    else this.bot = null;
    this.resetBall(true);
    this.phase = "countdown";
    this.countLeft = 3.45;
    this.goalLock = 0;
    this.trail = [];
    this.padCool = [0, 0];
    patchUi({
      phase: "countdown",
      mode: this.mode,
      score: [...this.score] as [number, number],
      countdown: 3,
      winner: null,
    });
    this.audio.whistle();
    this.audio.crowdPlay();
  }

  private spawnBot() {
    const f = this.field;
    const x = f.axis === "lr" ? f.x + f.fingerR + 18 : f.midX;
    const y = f.axis === "lr" ? f.midY : f.y + f.fingerR + 18;
    this.bot = {
      id: -1,
      side: 1,
      x,
      y,
      px: x,
      py: y,
      vx: 0,
      vy: 0,
      r: f.fingerR,
      born: this.time,
      bot: true,
    };
  }

  private freshBall(): Ball {
    return {
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      vx: 0,
      vy: 0,
      r: 14,
      rot: 0,
      vrot: 0,
    };
  }

  private resetBall(still: boolean) {
    const f = this.field;
    this.ball.x = f.midX;
    this.ball.y = f.midY;
    this.ball.px = f.midX;
    this.ball.py = f.midY;
    this.ball.r = f.ballR;
    this.ball.rot = 0;
    if (still) {
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.ball.vrot = 0;
    } else {
      const a = (Math.random() - 0.5) * 0.6;
      this.ball.vx = Math.sin(a) * 220;
      this.ball.vy = (Math.random() < 0.5 ? 1 : -1) * 40;
    }
  }

  private bind() {
    const c = this.canvas;
    const down = (e: PointerEvent) => this.onDown(e);
    const move = (e: PointerEvent) => this.onMove(e);
    const up = (e: PointerEvent) => this.onUp(e);
    c.addEventListener("pointerdown", down, { passive: false });
    c.addEventListener("pointermove", move, { passive: false });
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("lostpointercapture", up);
    this.unbind.push(() => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointercancel", up);
      c.removeEventListener("lostpointercapture", up);
    });

    const vis = () => {
      if (document.visibilityState === "visible") this.audio.resume();
    };
    document.addEventListener("visibilitychange", vis);
    this.unbind.push(() =>
      document.removeEventListener("visibilitychange", vis),
    );

    const prevent = (e: Event) => e.preventDefault();
    c.addEventListener("contextmenu", prevent);
    this.unbind.push(() => c.removeEventListener("contextmenu", prevent));

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(c.parentElement ?? c);
    const onWin = () => this.resize();
    window.addEventListener("resize", onWin);
    window.visualViewport?.addEventListener("resize", onWin);
    this.unbind.push(() => {
      window.removeEventListener("resize", onWin);
      window.visualViewport?.removeEventListener("resize", onWin);
    });
  }

  private resize() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    const prev = this.field;
    this.field = makeField(w, h, this.goalSize);
    if (useGameUi.getState().axis !== this.field.axis) {
      patchUi({ axis: this.field.axis });
    }
    if (prev.w > 1) {
      const sx = this.field.w / prev.w;
      const sy = this.field.h / prev.h;
      this.ball.x *= sx;
      this.ball.y *= sy;
      this.ball.px *= sx;
      this.ball.py *= sy;
      this.ball.r = this.field.ballR;
      for (const fng of this.fingers.values()) {
        fng.x *= sx;
        fng.y *= sy;
        fng.px *= sx;
        fng.py *= sy;
        fng.r = this.field.fingerR;
      }
      if (this.bot) {
        this.bot.x *= sx;
        this.bot.y *= sy;
        this.bot.r = this.field.fingerR;
      }
    } else {
      this.resetBall(true);
    }
  }

  private toLocal(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown(e: PointerEvent) {
    this.audio.unlock();
    if (e.button !== undefined && e.button !== 0) return;
    const phase = this.phase;
    if (phase !== "playing" && phase !== "countdown") return;
    e.preventDefault();
    const p = this.toLocal(e);
    const side = this.sideAt(p.x, p.y);
    if (this.mode === "bot" && side === 1) return;
    if (this.countSide(side) >= MAX_FINGERS) return;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* not required */
    }
    const pos = this.clampFinger(p.x, p.y, side);
    this.fingers.set(e.pointerId, {
      id: e.pointerId,
      side,
      x: pos.x,
      y: pos.y,
      px: pos.x,
      py: pos.y,
      vx: 0,
      vy: 0,
      r: this.field.fingerR,
      born: this.time,
      bot: false,
    });
    this.syncFingerCount();
  }

  private onMove(e: PointerEvent) {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    e.preventDefault();
    const p = this.toLocal(e);
    const pos = this.clampFinger(p.x, p.y, f.side);
    f.x = pos.x;
    f.y = pos.y;
  }

  private onUp(e: PointerEvent) {
    if (this.fingers.delete(e.pointerId)) this.syncFingerCount();
  }

  private countSide(side: 0 | 1) {
    let n = 0;
    for (const f of this.fingers.values()) if (f.side === side) n++;
    return n;
  }

  private syncFingerCount() {
    patchUi({
      fingers: [this.countSide(0), this.countSide(1)],
    });
  }

  private sideAt(x: number, y: number): 0 | 1 {
    const f = this.field;
    if (f.axis === "lr") return x >= f.midX ? 0 : 1;
    return y >= f.midY ? 0 : 1;
  }

  private clampFinger(x: number, y: number, side: 0 | 1) {
    const f = this.field;
    const r = f.fingerR * 0.3;
    if (f.axis === "lr") {
      y = clamp(y, f.y + r, f.y + f.ph - r);
      if (side === 0) {
        x = clamp(x, f.midX + 12, f.x + f.pw + f.goalD * 0.25);
      } else {
        x = clamp(x, f.x - f.goalD * 0.25, f.midX - 12);
      }
    } else {
      x = clamp(x, f.x + r, f.x + f.pw - r);
      if (side === 0) {
        y = clamp(y, f.midY + 12, f.y + f.ph + f.goalD * 0.25);
      } else {
        y = clamp(y, f.y - f.goalD * 0.25, f.midY - 12);
      }
    }
    return { x, y };
  }

  private loop = (now: number) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    this.time += dt;

    this.ball.px = this.ball.x;
    this.ball.py = this.ball.y;

    this.updatePointerVelocities(dt);

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.draw(1);
      this.raf = requestAnimationFrame(this.loop);
      return;
    }

    if (this.phase === "countdown") {
      this.countLeft -= dt;
      let shown = 0;
      if (this.countLeft > 0) shown = Math.max(1, Math.ceil(this.countLeft));
      if (useGameUi.getState().countdown !== shown) {
        patchUi({ countdown: shown });
      }
      if (this.countLeft <= -0.5) {
        this.phase = "playing";
        patchUi({ phase: "playing", countdown: 0 });
      }
    }

    this.acc += dt;
    const cap = STEP * 8;
    if (this.acc > cap) this.acc = cap;
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }

    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.updateParticles(dt);
    this.draw(this.acc / STEP);
    this.raf = requestAnimationFrame(this.loop);
  };

  private updatePointerVelocities(dt: number) {
    const safe = Math.max(dt, 1 / 240);
    for (const f of this.fingers.values()) {
      f.vx = (f.x - f.px) / safe;
      f.vy = (f.y - f.py) / safe;
      capVec(f, MAX_FINGER);
      f.px = f.x;
      f.py = f.y;
    }
  }

  private step(dt: number) {
    if (this.phase === "menu") {
      this.idleBall(dt);
      this.integrateBall(dt);
      this.collideWalls(false);
      return;
    }

    if (this.mode === "bot" && this.bot && (this.phase === "playing" || this.phase === "countdown")) {
      this.updateBot(dt);
    }

    if (this.phase === "playing") {
      this.integrateBall(dt);
      this.collideFingers();
      this.tickPads(dt);
      this.collideWalls(true);
      this.pushTrail();
    } else if (this.phase === "countdown") {
      this.collideFingers();
    }
  }

  private idleBall(dt: number) {
    this.idleBoost += dt;
    if (this.idleBoost > 2.8 && Math.hypot(this.ball.vx, this.ball.vy) < 40) {
      this.idleBoost = 0;
      const a = Math.random() * Math.PI * 2;
      this.ball.vx += Math.cos(a) * 260;
      this.ball.vy += Math.sin(a) * 220;
    }
  }

  private integrateBall(dt: number) {
    const b = this.ball;
    b.vx *= Math.exp(-FRICTION * dt);
    b.vy *= Math.exp(-FRICTION * dt);
    capVec(b, MAX_BALL);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rot += b.vrot * dt;
    const sp = Math.hypot(b.vx, b.vy);
    b.vrot = (b.vx + b.vy) / Math.max(24, b.r) + sp * 0.002;
  }

  private allFingers(): Finger[] {
    const list = [...this.fingers.values()];
    if (this.bot) list.push(this.bot);
    return list;
  }

  private collideFingers() {
    const b = this.ball;
    for (const f of this.allFingers()) {
      const dx = b.x - f.x;
      const dy = b.y - f.y;
      const min = b.r + f.r;
      const d2 = dx * dx + dy * dy;
      if (d2 > min * min || d2 < 1e-8) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const overlap = min - d;
      b.x += nx * overlap;
      b.y += ny * overlap;
      const rvx = b.vx - f.vx;
      const rvy = b.vy - f.vy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        const e = REST;
        b.vx -= (1 + e) * vn * nx;
        b.vy -= (1 + e) * vn * ny;
        const kick = Math.hypot(f.vx, f.vy);
        if (kick > 160) {
          const extra = Math.min(1.4, kick / 780);
          b.vx += f.vx * extra * 0.46;
          b.vy += f.vy * extra * 0.46;
        }
        capVec(b, MAX_BALL);
        const impact = Math.min(1, (Math.abs(vn) + kick) / 1200);
        if (this.phase === "playing") {
          this.audio.kick(impact, (b.x / this.field.w) * 2 - 1);
          this.addTrauma(0.16 + impact * 0.38);
          if (impact > 0.38) this.hitstop = this.reducedMotion ? 0 : 0.045 + impact * 0.03;
          if (impact > 0.62) this.flash = Math.max(this.flash, 0.22);
          this.burst(
            b.x,
            b.y,
            nx,
            ny,
            f.side === 0 ? GELO : BRASA,
            8 + Math.floor(impact * 14),
          );
          if (impact > 0.32) vibrate(Math.round(10 + impact * 22));
        }
      }
    }
  }

  private pushTrail() {
    const b = this.ball;
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(b.x - last.x, b.y - last.y) > 6) {
      this.trail.push({ x: b.x, y: b.y });
      if (this.trail.length > 16) this.trail.shift();
    }
  }

  private tickPads(dt: number) {
    const b = this.ball;
    const pads = this.field.pads;
    for (let i = 0; i < pads.length; i++) {
      this.padCool[i] = Math.max(0, (this.padCool[i] ?? 0) - dt);
      const p = pads[i];
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d > p.r + b.r * 0.2) continue;
      if ((this.padCool[i] ?? 0) > 0) continue;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp < 70) continue;
      const nx = b.vx / sp;
      const ny = b.vy / sp;
      b.vx = nx * Math.min(MAX_BALL, sp * 1.55 + 380);
      b.vy = ny * Math.min(MAX_BALL, sp * 1.55 + 380);
      this.padCool[i] = 1.7;
      this.addTrauma(0.28);
      this.flash = Math.max(this.flash, 0.16);
      this.audio.kick(0.7, (b.x / this.field.w) * 2 - 1);
      this.burst(p.x, p.y, nx, ny, PAPER, 14);
      for (let k = 0; k < 8; k++) {
        this.spawnParticle({
          x: p.x,
          y: p.y,
          vx: nx * (80 + Math.random() * 220) + (Math.random() - 0.5) * 80,
          vy: ny * (80 + Math.random() * 220) + (Math.random() * 80 - 40),
          life: 0.35 + Math.random() * 0.2,
          maxLife: 0.5,
          r: 2 + Math.random() * 3,
          color: Math.random() < 0.5 ? GELO : BRASA,
          rot: 0,
          vrot: 0,
          kind: "boost",
        });
      }
      vibrate(16);
    }
  }

  private collideWalls(canScore: boolean) {
    const f = this.field;
    const b = this.ball;
    if (f.axis === "lr") this.collideWallsLR(canScore, f, b);
    else this.collideWallsTB(canScore, f, b);
  }

  private collideWallsTB(canScore: boolean, f: Field, b: Ball) {
    const left = f.x + b.r;
    const right = f.x + f.pw - b.r;
    const top = f.y + b.r;
    const bot = f.y + f.ph - b.r;
    const gL = f.midX - f.goalW / 2;
    const gR = f.midX + f.goalW / 2;
    const inGoal = b.x > gL + b.r * 0.2 && b.x < gR - b.r * 0.2;

    if (b.x < left) {
      b.x = left;
      b.vx = Math.abs(b.vx) * REST;
      this.thud(b);
    } else if (b.x > right) {
      b.x = right;
      b.vx = -Math.abs(b.vx) * REST;
      this.thud(b);
    }

    if (b.y < top) {
      if (inGoal) {
        if (b.x - b.r < gL) {
          b.x = gL + b.r;
          b.vx = Math.abs(b.vx) * REST;
        }
        if (b.x + b.r > gR) {
          b.x = gR - b.r;
          b.vx = -Math.abs(b.vx) * REST;
        }
        const back = f.y - f.goalD + b.r;
        if (b.y < back) {
          b.y = back;
          b.vy = Math.abs(b.vy) * 0.35;
        }
        if (canScore && b.y < f.y - b.r * 0.1) {
          this.scoreGoal(0);
          return;
        }
      } else {
        b.y = top;
        b.vy = Math.abs(b.vy) * REST;
        this.thud(b);
      }
    } else if (b.y > bot) {
      if (inGoal) {
        if (b.x - b.r < gL) {
          b.x = gL + b.r;
          b.vx = Math.abs(b.vx) * REST;
        }
        if (b.x + b.r > gR) {
          b.x = gR - b.r;
          b.vx = -Math.abs(b.vx) * REST;
        }
        const back = f.y + f.ph + f.goalD - b.r;
        if (b.y > back) {
          b.y = back;
          b.vy = -Math.abs(b.vy) * 0.35;
        }
        if (canScore && b.y > f.y + f.ph + b.r * 0.1) {
          this.scoreGoal(1);
          return;
        }
      } else {
        b.y = bot;
        b.vy = -Math.abs(b.vy) * REST;
        this.thud(b);
      }
    }
  }

  private collideWallsLR(canScore: boolean, f: Field, b: Ball) {
    const left = f.x + b.r;
    const right = f.x + f.pw - b.r;
    const top = f.y + b.r;
    const bot = f.y + f.ph - b.r;
    const gT = f.midY - f.goalW / 2;
    const gB = f.midY + f.goalW / 2;
    const inGoal = b.y > gT + b.r * 0.2 && b.y < gB - b.r * 0.2;

    if (b.y < top) {
      b.y = top;
      b.vy = Math.abs(b.vy) * REST;
      this.thud(b);
    } else if (b.y > bot) {
      b.y = bot;
      b.vy = -Math.abs(b.vy) * REST;
      this.thud(b);
    }

    if (b.x < left) {
      if (inGoal) {
        if (b.y - b.r < gT) {
          b.y = gT + b.r;
          b.vy = Math.abs(b.vy) * REST;
        }
        if (b.y + b.r > gB) {
          b.y = gB - b.r;
          b.vy = -Math.abs(b.vy) * REST;
        }
        const back = f.x - f.goalD + b.r;
        if (b.x < back) {
          b.x = back;
          b.vx = Math.abs(b.vx) * 0.35;
        }
        if (canScore && b.x < f.x - b.r * 0.1) {
          this.scoreGoal(0);
          return;
        }
      } else {
        b.x = left;
        b.vx = Math.abs(b.vx) * REST;
        this.thud(b);
      }
    } else if (b.x > right) {
      if (inGoal) {
        if (b.y - b.r < gT) {
          b.y = gT + b.r;
          b.vy = Math.abs(b.vy) * REST;
        }
        if (b.y + b.r > gB) {
          b.y = gB - b.r;
          b.vy = -Math.abs(b.vy) * REST;
        }
        const back = f.x + f.pw + f.goalD - b.r;
        if (b.x > back) {
          b.x = back;
          b.vx = -Math.abs(b.vx) * 0.35;
        }
        if (canScore && b.x > f.x + f.pw + b.r * 0.1) {
          this.scoreGoal(1);
          return;
        }
      } else {
        b.x = right;
        b.vx = -Math.abs(b.vx) * REST;
        this.thud(b);
      }
    }
  }

  private thud(b: Ball) {
    if (this.phase !== "playing") return;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 80) return;
    this.audio.wall((b.x / this.field.w) * 2 - 1);
    this.burst(b.x, b.y, 0, 0, PAPER, 4);
  }

  private scoreGoal(scorer: 0 | 1) {
    if (this.phase !== "playing" || this.goalLock > this.time) return;
    this.goalLock = this.time + 1.6;
    this.score[scorer] += 1;
    this.phase = "goal";
    this.ball.vx *= 0.2;
    this.ball.vy *= 0.2;
    this.audio.goal();
    this.addTrauma(0.85);
    this.flash = 0.55;
    vibrate([30, 40, 70]);
    const color = scorer === 0 ? GELO : BRASA;
    for (let i = 0; i < 64; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 420;
      this.spawnParticle({
        x: this.ball.x,
        y: this.ball.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.7 + Math.random() * 0.5,
        maxLife: 1,
        r: 2 + Math.random() * 4,
        color: Math.random() < 0.5 ? color : PAPER,
        rot: Math.random() * 6,
        vrot: (Math.random() - 0.5) * 12,
        kind: "confetti",
      });
    }
    const over = this.score[scorer] >= this.target;
    patchUi({
      phase: over ? "over" : "goal",
      score: [...this.score] as [number, number],
      lastScorer: scorer,
      winner: over ? scorer : null,
    });
    if (over) {
      this.phase = "over";
      this.audio.win();
      return;
    }
    this.kickoffTimer = setTimeout(() => {
      if (!this.running || this.phase !== "goal") return;
      this.beginKickoff(false);
    }, 1400);
  }

  private updateBot(dt: number) {
    const bot = this.bot;
    if (!bot) return;
    const f = this.field;
    const b = this.ball;
    bot.r = f.fingerR;
    bot.px = bot.x;
    bot.py = bot.y;

    let tx: number;
    let ty: number;
    const maxSpd = 820;

    if (f.axis === "lr") {
      const inHalf = b.x < f.midX + 8;
      const threat = b.vx < -40 && b.x < f.midX + f.pw * 0.2;
      tx = f.x + bot.r + 16;
      ty = f.midY;
      if (threat || (inHalf && b.vx < 0)) {
        const look = Math.min(0.28, Math.abs((bot.x - b.x) / Math.max(90, -b.vx)));
        ty = clamp(b.y + b.vy * look, f.y + bot.r, f.y + f.ph - bot.r);
        tx = clamp(b.x - bot.r - b.r + 6, f.x + bot.r, f.midX - 12);
        if (Math.abs(b.y - bot.y) < bot.r * 1.1 && b.x > bot.x - 8) {
          tx = Math.min(f.midX - 12, b.x + bot.r * 0.6);
          ty = b.y + Math.sign(f.midY - b.y) * 6;
        }
      } else if (inHalf) {
        ty = b.y;
        tx = Math.min(f.midX - 14, b.x - bot.r - b.r * 0.4);
      } else {
        ty = f.midY + (b.y - f.midY) * 0.5;
        tx = f.x + bot.r + 14;
      }
      tx = clamp(tx, f.x + 8, f.midX - 10);
      ty = clamp(ty, f.y + bot.r * 0.4, f.y + f.ph - bot.r * 0.4);
    } else {
      const inHalf = b.y < f.midY + 8;
      const threat = b.vy < -40 && b.y < f.midY + f.ph * 0.2;
      tx = f.midX;
      ty = f.y + bot.r + 16;
      if (threat || (inHalf && b.vy < 0)) {
        const look = Math.min(0.28, Math.abs((bot.y - b.y) / Math.max(90, -b.vy)));
        tx = clamp(b.x + b.vx * look, f.x + bot.r, f.x + f.pw - bot.r);
        ty = clamp(b.y - bot.r - b.r + 6, f.y + bot.r, f.midY - 12);
        if (Math.abs(b.x - bot.x) < bot.r * 1.1 && b.y > bot.y - 8) {
          ty = Math.min(f.midY - 12, b.y + bot.r * 0.6);
          tx = b.x + Math.sign(f.midX - b.x) * 6;
        }
      } else if (inHalf) {
        tx = b.x;
        ty = Math.min(f.midY - 14, b.y - bot.r - b.r * 0.4);
      } else {
        tx = f.midX + (b.x - f.midX) * 0.5;
        ty = f.y + bot.r + 14;
      }
      tx = clamp(tx, f.x + bot.r * 0.4, f.x + f.pw - bot.r * 0.4);
      ty = clamp(ty, f.y + 8, f.midY - 10);
    }

    const dx = tx - bot.x;
    const dy = ty - bot.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      const spd = Math.min(maxSpd, dist * 9);
      bot.vx = (dx / dist) * spd;
      bot.vy = (dy / dist) * spd;
      bot.x += bot.vx * dt;
      bot.y += bot.vy * dt;
    } else {
      bot.vx = 0;
      bot.vy = 0;
    }
    const pos = this.clampFinger(bot.x, bot.y, 1);
    bot.x = pos.x;
    bot.y = pos.y;
  }

  private addTrauma(n: number) {
    if (!this.shakeOn || this.reducedMotion) return;
    this.trauma = Math.min(1, this.trauma + n);
  }

  private burst(
    x: number,
    y: number,
    nx: number,
    ny: number,
    color: string,
    n: number,
  ) {
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.4;
      const s = 60 + Math.random() * 280;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.25 + Math.random() * 0.28,
        maxLife: 0.45,
        r: 1.4 + Math.random() * 2.2,
        color,
        rot: 0,
        vrot: 0,
        kind: "spark",
      });
    }
  }

  private spawnParticle(p: Particle) {
    p.maxLife = p.life;
    if (this.particles.length > 220) this.particles.shift();
    this.particles.push(p);
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      if (p.kind === "confetti") p.vy += 420 * dt;
      p.rot += p.vrot * dt;
    }
  }

  private draw(alpha: number) {
    const shake = this.trauma * this.trauma;
    const t = this.time;
    const sx = shake * 16 * Math.sin(t * 47.2);
    const sy = shake * 16 * Math.sin(t * 39.7 + 1.2);
    const zoom = this.reducedMotion ? 1 : 1 + shake * 0.07;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.renderer.draw(
      this.ctx,
      this.field,
      this.ball,
      this.allFingers(),
      this.particles,
      alpha,
      sx,
      sy,
      this.time,
      this.phase,
      this.dpr,
      {
        trail: this.trail,
        pads: this.field.pads.map((p, i) => ({
          ...p,
          ready: (this.padCool[i] ?? 0) <= 0,
        })),
        zoom,
        flash: this.flash,
        score: this.score,
        target: this.target,
      },
    );
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function capVec(o: { vx: number; vy: number }, max: number) {
  const s = Math.hypot(o.vx, o.vy);
  if (s > max) {
    o.vx *= max / s;
    o.vy *= max / s;
  }
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
