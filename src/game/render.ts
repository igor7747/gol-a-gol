import {
  BRASA,
  GELO,
  PAPER,
  type Ball,
  type BallSkin,
  type Field,
  type Finger,
  type GloveSkin,
  type Particle,
  type PitchTheme,
} from "./types";

const THEMES: Record<
  PitchTheme,
  { a: string; b: string; bg: string; glow0: string; glow1: string }
> = {
  night: {
    a: "#0c2c22",
    b: "#0a261e",
    bg: "#06110d",
    glow0: "#123c2c",
    glow1: "#06110d",
  },
  grass: {
    a: "#2a8f4a",
    b: "#1f7a3c",
    bg: "#0c3d20",
    glow0: "#3aa558",
    glow1: "#0c3d20",
  },
  rain: {
    a: "#14352c",
    b: "#102e27",
    bg: "#071410",
    glow0: "#1a4036",
    glow1: "#071410",
  },
};
const LINE = "rgba(236, 240, 232, 0.78)";
const NET = "rgba(232, 236, 226, 0.28)";

export interface DrawExtras {
  trail: Array<{ x: number; y: number }>;
  pads: Array<{ x: number; y: number; r: number; ready: boolean }>;
  zoom: number;
  flash: number;
  score: [number, number];
  target: number;
  theme: PitchTheme;
  ballSkin: BallSkin;
  gloveSkin: GloveSkin;
  scorePulse: number;
  cam: { cx: number; cy: number } | null;
  path: Array<{ x: number; y: number }>;
  replay: boolean;
}

export class Renderer {
  private pitch: HTMLCanvasElement | null = null;
  private pitchKey = "";

  draw(
    ctx: CanvasRenderingContext2D,
    field: Field,
    ball: Ball,
    fingers: Finger[],
    particles: Particle[],
    alpha: number,
    shakeX: number,
    shakeY: number,
    time: number,
    phase: string,
    dpr: number,
    extras: DrawExtras,
  ) {
    const { w, h } = field;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = THEMES[extras.theme].bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    if (extras.cam) {
      ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
      ctx.scale(extras.zoom, extras.zoom);
      ctx.translate(-extras.cam.cx, -extras.cam.cy);
    } else {
      ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
      ctx.scale(extras.zoom, extras.zoom);
      ctx.translate(-w / 2, -h / 2);
    }

    this.ensurePitch(field, extras.theme);
    if (this.pitch) ctx.drawImage(this.pitch, 0, 0, w, h);

    this.drawPads(ctx, extras.pads, time);
    this.drawGoals(ctx, field);
    this.drawScoreboard(ctx, field, extras.score, extras.scorePulse);
    if (extras.path.length > 1) this.drawShotPath(ctx, extras.path, extras.replay ? 0.35 : extras.scorePulse);
    if (extras.theme === "rain" && !extras.replay) this.drawRain(ctx, field, time);
    this.drawParticles(ctx, particles, "dust");
    this.drawParticles(ctx, particles, "boost");
    this.drawTrail(ctx, extras.trail, ball);
    this.drawBallShadow(ctx, ball, alpha);
    this.drawFingers(ctx, fingers, time, extras.gloveSkin);
    this.drawBall(ctx, ball, alpha, extras.ballSkin);
    this.drawParticles(ctx, particles, "spark");
    this.drawParticles(ctx, particles, "confetti");

    if (phase === "playing" || phase === "countdown") {
      this.drawMidHint(ctx, field);
    }

    ctx.restore();

    this.drawVignette(ctx, w, h);
    if (extras.replay) this.drawReplayTag(ctx, field);
    if (extras.flash > 0.01) {
      ctx.fillStyle = `rgba(243,241,234,${Math.min(0.42, extras.flash)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  warm(field: Field, theme: PitchTheme) {
    this.ensurePitch(field, theme);
  }

  private ensurePitch(field: Field, theme: PitchTheme) {
    const key = `${Math.round(field.w)}x${Math.round(field.h)}x${Math.round(field.pw)}x${Math.round(field.ph)}x${Math.round(field.goalW)}x${theme}`;
    if (this.pitch && this.pitchKey === key) return;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(field.w));
    c.height = Math.max(1, Math.round(field.h));
    const g = c.getContext("2d");
    if (!g) return;
    this.drawStaticPitch(g, field, theme);
    this.pitch = c;
    this.pitchKey = key;
  }

  private drawStaticPitch(ctx: CanvasRenderingContext2D, f: Field, theme: PitchTheme) {
    const pal = THEMES[theme];
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, f.w, f.h);

    this.drawStands(ctx, f);

    const glow = ctx.createRadialGradient(
      f.midX,
      f.midY,
      f.pw * 0.08,
      f.midX,
      f.midY,
      Math.max(f.w, f.h) * 0.78,
    );
    glow.addColorStop(0, pal.glow0);
    glow.addColorStop(1, pal.glow1);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, f.w, f.h);

    ctx.save();
    roundRect(ctx, f.x, f.y, f.pw, f.ph, f.corner);
    ctx.clip();

    if (f.axis === "lr") {
      const stripes = 18;
      const sw = f.pw / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? pal.a : pal.b;
        ctx.fillRect(f.x + i * sw, f.y, sw + 0.6, f.ph);
      }
    } else {
      const stripes = 18;
      const sh = f.ph / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? pal.a : pal.b;
        ctx.fillRect(f.x, f.y + i * sh, f.pw, sh + 0.6);
      }
    }

    ctx.fillStyle = "rgba(126, 224, 214, 0.08)";
    if (f.axis === "lr") {
      ctx.fillRect(f.midX, f.y, f.pw / 2, f.ph);
      ctx.fillStyle = "rgba(224, 122, 114, 0.09)";
      ctx.fillRect(f.x, f.y, f.pw / 2, f.ph);
    } else {
      ctx.fillRect(f.x, f.midY, f.pw, f.ph / 2);
      ctx.fillStyle = "rgba(224, 122, 114, 0.09)";
      ctx.fillRect(f.x, f.y, f.pw, f.ph / 2);
    }

    const gloss = ctx.createLinearGradient(f.x, f.y, f.x + f.pw, f.y + f.ph);
    gloss.addColorStop(0, "rgba(255,255,255,0)");
    gloss.addColorStop(0.45, "rgba(255,255,255,0.05)");
    gloss.addColorStop(0.55, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(f.x, f.y, f.pw, f.ph);

    this.drawBeams(ctx, f);
    ctx.restore();

    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 10;
    roundRect(ctx, f.x - 3, f.y - 3, f.pw + 6, f.ph + 6, f.corner + 2);
    ctx.stroke();

    ctx.strokeStyle = LINE;
    ctx.lineWidth = f.line;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    roundRect(ctx, f.x, f.y, f.pw, f.ph, f.corner);
    ctx.stroke();

    ctx.beginPath();
    if (f.axis === "lr") {
      ctx.moveTo(f.midX, f.y);
      ctx.lineTo(f.midX, f.y + f.ph);
    } else {
      ctx.moveTo(f.x, f.midY);
      ctx.lineTo(f.x + f.pw, f.midY);
    }
    ctx.stroke();

    const circleR = Math.min(f.pw, f.ph) * 0.15;
    ctx.beginPath();
    ctx.arc(f.midX, f.midY, circleR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(f.midX, f.midY, f.line * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = LINE;
    ctx.fill();

    this.drawBox(ctx, f, 1);
    this.drawBox(ctx, f, -1);

    ctx.lineWidth = 6;
    if (f.axis === "lr") {
      ctx.strokeStyle = "rgba(126, 224, 214, 0.28)";
      ctx.beginPath();
      ctx.moveTo(f.midX + 7, f.y + 8);
      ctx.lineTo(f.midX + 7, f.y + f.ph - 8);
      ctx.stroke();
      ctx.strokeStyle = "rgba(224, 122, 114, 0.28)";
      ctx.beginPath();
      ctx.moveTo(f.midX - 7, f.y + 8);
      ctx.lineTo(f.midX - 7, f.y + f.ph - 8);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(126, 224, 214, 0.28)";
      ctx.beginPath();
      ctx.moveTo(f.x + 8, f.midY + 7);
      ctx.lineTo(f.x + f.pw - 8, f.midY + 7);
      ctx.stroke();
      ctx.strokeStyle = "rgba(224, 122, 114, 0.28)";
      ctx.beginPath();
      ctx.moveTo(f.x + 8, f.midY - 7);
      ctx.lineTo(f.x + f.pw - 8, f.midY - 7);
      ctx.stroke();
    }
  }

  private drawStands(ctx: CanvasRenderingContext2D, f: Field) {
    ctx.fillStyle = "#0a1612";
    const band = Math.max(10, Math.min(f.w, f.h) * 0.03);
    if (f.axis === "tb") {
      ctx.fillRect(0, 0, band, f.h);
      ctx.fillRect(f.w - band, 0, band, f.h);
      ctx.fillStyle = "rgba(224,122,114,0.12)";
      ctx.fillRect(0, 0, band, f.h / 2);
      ctx.fillStyle = "rgba(126,224,214,0.12)";
      ctx.fillRect(0, f.h / 2, band, f.h / 2);
      ctx.fillStyle = "rgba(224,122,114,0.12)";
      ctx.fillRect(f.w - band, 0, band, f.h / 2);
      ctx.fillStyle = "rgba(126,224,214,0.12)";
      ctx.fillRect(f.w - band, f.h / 2, band, f.h / 2);
    } else {
      ctx.fillRect(0, 0, f.w, band);
      ctx.fillRect(0, f.h - band, f.w, band);
      ctx.fillStyle = "rgba(224,122,114,0.12)";
      ctx.fillRect(0, 0, f.w / 2, band);
      ctx.fillStyle = "rgba(126,224,214,0.12)";
      ctx.fillRect(f.w / 2, 0, f.w / 2, band);
      ctx.fillStyle = "rgba(224,122,114,0.12)";
      ctx.fillRect(0, f.h - band, f.w / 2, band);
      ctx.fillStyle = "rgba(126,224,214,0.12)";
      ctx.fillRect(f.w / 2, f.h - band, f.w / 2, band);
    }
  }

  private drawBeams(ctx: CanvasRenderingContext2D, f: Field) {
    const corners = [
      [f.x + 8, f.y + 8],
      [f.x + f.pw - 8, f.y + 8],
      [f.x + 8, f.y + f.ph - 8],
      [f.x + f.pw - 8, f.y + f.ph - 8],
    ];
    for (const [cx, cy] of corners) {
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(f.pw, f.ph) * 0.45);
      g.addColorStop(0, "rgba(255,248,220,0.16)");
      g.addColorStop(0.35, "rgba(255,248,220,0.04)");
      g.addColorStop(1, "rgba(255,248,220,0)");
      ctx.fillStyle = g;
      ctx.fillRect(f.x, f.y, f.pw, f.ph);
    }
  }

  private drawBox(ctx: CanvasRenderingContext2D, f: Field, dir: 1 | -1) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = f.line;
    const short = f.axis === "tb" ? f.pw : f.ph;
    const long = f.axis === "tb" ? f.ph : f.pw;
    const boxShort = short * 0.62;
    const boxLong = long * 0.14;
    const sixShort = short * 0.32;
    const sixLong = long * 0.055;
    const sign = dir;

    if (f.axis === "lr") {
      const gx = dir === 1 ? f.x : f.x + f.pw;
      const by = f.midY - boxShort / 2;
      ctx.strokeRect(gx, by, boxLong * sign, boxShort);
      const sy = f.midY - sixShort / 2;
      ctx.strokeRect(gx, sy, sixLong * sign, sixShort);
      const spotX = gx + sign * long * 0.1;
      ctx.beginPath();
      ctx.arc(spotX, f.midY, f.line * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = LINE;
      ctx.fill();
      ctx.beginPath();
      const arcR = short * 0.14;
      if (dir === 1) {
        ctx.arc(spotX, f.midY, arcR, -0.25 * Math.PI, 0.25 * Math.PI, false);
      } else {
        ctx.arc(spotX, f.midY, arcR, 0.75 * Math.PI, 1.25 * Math.PI, false);
      }
      ctx.stroke();
      return;
    }

    const gy = dir === 1 ? f.y : f.y + f.ph;
    const bx = f.midX - boxShort / 2;
    ctx.strokeRect(bx, gy, boxShort, boxLong * sign);
    const sx = f.midX - sixShort / 2;
    ctx.strokeRect(sx, gy, sixShort, sixLong * sign);
    const spotY = gy + sign * long * 0.1;
    ctx.beginPath();
    ctx.arc(f.midX, spotY, f.line * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = LINE;
    ctx.fill();
    ctx.beginPath();
    const arcR = short * 0.14;
    if (dir === 1) {
      ctx.arc(f.midX, spotY, arcR, 0.25 * Math.PI, 0.75 * Math.PI, false);
    } else {
      ctx.arc(f.midX, spotY, arcR, 1.25 * Math.PI, 1.75 * Math.PI, false);
    }
    ctx.stroke();
  }

  private drawPads(
    ctx: CanvasRenderingContext2D,
    pads: DrawExtras["pads"],
    time: number,
  ) {
    for (const p of pads) {
      const pulse = p.ready ? 0.55 + Math.sin(time * 6) * 0.2 : 0.22;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = `rgba(243,241,234,${0.18 + pulse * 0.35})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(243,241,234,${0.06 + pulse * 0.1})`;
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(243,241,234,${0.35 + pulse * 0.4})`;
      chevron(ctx, 0, -p.r * 0.12, p.r * 0.38);
      chevron(ctx, 0, p.r * 0.18, p.r * 0.38);
      ctx.restore();
    }
  }

  private drawGoals(ctx: CanvasRenderingContext2D, f: Field) {
    ctx.lineWidth = Math.max(3, f.line * 1.6);
    ctx.strokeStyle = PAPER;
    ctx.fillStyle = NET;

    if (f.axis === "lr") {
      const top = f.midY - f.goalW / 2;
      this.goalFrame(ctx, f.x - f.goalD, top, f.goalD, f.goalW, 1, true);
      this.goalFrame(ctx, f.x + f.pw, top, f.goalD, f.goalW, -1, true);
      ctx.shadowColor = BRASA;
      ctx.shadowBlur = 12;
      ctx.fillStyle = BRASA;
      roundRect(ctx, f.x - 6, top + 4, 5, f.goalW - 8, 2);
      ctx.fill();
      ctx.shadowColor = GELO;
      ctx.fillStyle = GELO;
      roundRect(ctx, f.x + f.pw + 1, top + 4, 5, f.goalW - 8, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      return;
    }

    const left = f.midX - f.goalW / 2;
    this.goalFrame(ctx, left, f.y - f.goalD, f.goalW, f.goalD, 1, false);
    this.goalFrame(ctx, left, f.y + f.ph, f.goalW, f.goalD, -1, false);
    ctx.shadowBlur = 12;
    ctx.shadowColor = BRASA;
    ctx.fillStyle = BRASA;
    roundRect(ctx, left + 4, f.y - 6, f.goalW - 8, 5, 2);
    ctx.fill();
    ctx.shadowColor = GELO;
    ctx.fillStyle = GELO;
    roundRect(ctx, left + 4, f.y + f.ph + 1, f.goalW - 8, 5, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private goalFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    dir: 1 | -1,
    horizontal: boolean,
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalAlpha = 0.6;
    const step = 9;
    ctx.strokeStyle = NET;
    ctx.lineWidth = 1;
    for (let i = -Math.max(w, h); i < w + h; i += step) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h, y + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + i, y + h);
      ctx.lineTo(x + i + h, y);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = PAPER;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x + (dir === 1 ? w : 0), y);
      ctx.lineTo(x + (dir === 1 ? 0 : w), y);
      ctx.lineTo(x + (dir === 1 ? 0 : w), y + h);
      ctx.lineTo(x + (dir === 1 ? w : 0), y + h);
    } else {
      ctx.moveTo(x, y + (dir === 1 ? h : 0));
      ctx.lineTo(x, y + (dir === 1 ? 0 : h));
      ctx.lineTo(x + w, y + (dir === 1 ? 0 : h));
      ctx.lineTo(x + w, y + (dir === 1 ? h : 0));
    }
    ctx.stroke();
  }

  private drawScoreboard(
    ctx: CanvasRenderingContext2D,
    f: Field,
    score: [number, number],
    pulse: number,
  ) {
    const r = Math.max(15, Math.min(21, Math.min(f.pw, f.ph) * 0.042));
    const gap = Math.max(6, r * 0.45);

    if (f.axis === "tb") {
      const gl = f.midX - f.goalW / 2;
      const gr = f.midX + f.goalW / 2;
      const left = Math.max(r + 8, gl - gap - r);
      const right = Math.min(f.w - r - 8, gr + gap + r);
      const topY = Math.max(r + 8, f.y - f.goalD * 0.52);
      const botY = Math.min(f.h - r - 8, f.y + f.ph + f.goalD * 0.52);
      // Top is rotated 180: swap sides so each player reads Brasa on their left.
      this.paintBadge(ctx, left, topY, r, score[0], GELO, Math.PI, pulse);
      this.paintBadge(ctx, right, topY, r, score[1], BRASA, Math.PI, pulse);
      this.paintBadge(ctx, left, botY, r, score[1], BRASA, 0, pulse);
      this.paintBadge(ctx, right, botY, r, score[0], GELO, 0, pulse);
      return;
    }

    const gt = f.midY - f.goalW / 2;
    const gb = f.midY + f.goalW / 2;
    const top = Math.max(r + 8, gt - gap - r);
    const bot = Math.min(f.h - r - 8, gb + gap + r);
    const leftX = Math.max(r + 8, f.x - f.goalD * 0.52);
    const rightX = Math.min(f.w - r - 8, f.x + f.pw + f.goalD * 0.52);
    this.paintBadge(ctx, leftX, top, r, score[0], GELO, -Math.PI / 2, pulse);
    this.paintBadge(ctx, leftX, bot, r, score[1], BRASA, -Math.PI / 2, pulse);
    this.paintBadge(ctx, rightX, top, r, score[1], BRASA, Math.PI / 2, pulse);
    this.paintBadge(ctx, rightX, bot, r, score[0], GELO, Math.PI / 2, pulse);
  }

  private paintBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    n: number,
    color: string,
    rot: number,
    pulse = 0,
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const s = 1 + pulse * 0.28;
    ctx.scale(s, s);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(6, 12, 10, 0.92)";
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = `700 ${r * 1.15}px "Bebas Neue", "Arial Narrow", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), 0, 1);
    ctx.restore();
  }

  private drawMidHint(ctx: CanvasRenderingContext2D, f: Field) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = PAPER;
    const size = Math.max(11, Math.min(f.pw, f.ph) * 0.04);
    ctx.font = `600 ${size}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (f.axis === "lr") {
      ctx.save();
      ctx.translate(f.midX + f.pw * 0.08, f.midY);
      ctx.rotate(Math.PI / 2);
      ctx.fillText("GELO", 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(f.midX - f.pw * 0.08, f.midY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("BRASA", 0, 0);
      ctx.restore();
    } else {
      ctx.fillText("GELO", f.midX, f.midY + f.ph * 0.07);
      ctx.save();
      ctx.translate(f.midX, f.midY - f.ph * 0.07);
      ctx.rotate(Math.PI);
      ctx.fillText("BRASA", 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawShotPath(
    ctx: CanvasRenderingContext2D,
    path: Array<{ x: number; y: number }>,
    pulse: number,
  ) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < path.length; i++) {
      const a = i / path.length;
      ctx.strokeStyle = `rgba(243,241,234,${0.08 + a * 0.45})`;
      ctx.lineWidth = 1.4 + a * 3.2 + pulse * 1.5;
      ctx.beginPath();
      ctx.moveTo(path[i - 1].x, path[i - 1].y);
      ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawReplayTag(ctx: CanvasRenderingContext2D, f: Field) {
    const size = Math.max(13, Math.min(f.pw, f.ph) * 0.045);
    ctx.save();
    ctx.fillStyle = "rgba(243,241,234,0.72)";
    ctx.font = `600 ${size}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = "REPLAY";
    if (f.axis === "lr") {
      ctx.save();
      ctx.translate(f.w * 0.5, 22);
      ctx.fillText(label, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(f.w * 0.5, f.h - 22);
      ctx.rotate(Math.PI);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(f.w * 0.5, 26);
      ctx.rotate(Math.PI);
      ctx.fillText(label, 0, 0);
      ctx.restore();
      ctx.fillText(label, f.w * 0.5, f.h - 26);
    }
    ctx.restore();
  }

  private drawRain(ctx: CanvasRenderingContext2D, f: Field, time: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(210,225,230,0.22)";
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 46; i++) {
      const seed = i * 17.3;
      const x = f.x + ((seed * 13 + time * 90) % Math.max(1, f.pw));
      const y = f.y + ((seed * 29 + time * 420) % Math.max(1, f.ph));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3.5, y + 13);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawTrail(
    ctx: CanvasRenderingContext2D,
    trail: Array<{ x: number; y: number }>,
    ball: Ball,
  ) {
    const sp = Math.hypot(ball.vx, ball.vy);
    if (trail.length < 2 || sp < 280) return;
    const hot = sp > 1400;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < trail.length; i++) {
      const t = i / trail.length;
      ctx.strokeStyle = hot
        ? `rgba(255,210,160,${0.08 + t * 0.35})`
        : `rgba(243,241,234,${0.04 + t * 0.22})`;
      ctx.lineWidth = ball.r * (0.35 + t * 0.9);
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSmileFace(ctx: CanvasRenderingContext2D, r: number) {
    ctx.fillStyle = "#1a1208";
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, -r * 0.12, r * 0.1, r * 0.14, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.22, -r * 0.12, r * 0.1, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, r * 0.08, r * 0.38, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  private drawBallShadow(ctx: CanvasRenderingContext2D, ball: Ball, alpha: number) {
    const x = ball.px + (ball.x - ball.px) * alpha;
    const y = ball.py + (ball.y - ball.py) * alpha;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(x + 2, y + ball.r * 0.55, ball.r * 0.9, ball.r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBall(
    ctx: CanvasRenderingContext2D,
    ball: Ball,
    alpha: number,
    skin: BallSkin = "classic",
  ) {
    const x = ball.px + (ball.x - ball.px) * alpha;
    const y = ball.py + (ball.y - ball.py) * alpha;
    const sp = Math.hypot(ball.vx, ball.vy);
    const stretch = 1 + Math.min(0.32, sp / 2200);
    const ang = Math.atan2(ball.vy, ball.vx);

    ctx.save();
    ctx.translate(x, y);
    if (sp > 40) ctx.rotate(ang);
    ctx.scale(stretch, 1 / stretch);
    if (sp > 40) ctx.rotate(-ang);
    ctx.rotate(ball.rot);

    if (sp > 1400 || skin !== "classic") {
      const aura = ctx.createRadialGradient(0, 0, ball.r * 0.4, 0, 0, ball.r * 1.7);
      const glow =
        skin === "ice"
          ? "rgba(126,224,214,0.35)"
          : skin === "fire"
            ? "rgba(255,140,90,0.38)"
            : skin === "smile"
              ? "rgba(250,210,80,0.4)"
              : "rgba(255,210,160,0.28)";
      aura.addColorStop(0, glow);
      aura.addColorStop(1, "rgba(255,210,160,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, ball.r * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
    ctx.fillStyle =
      skin === "fire"
        ? "#f4a574"
        : skin === "ice"
          ? "#d8f7f3"
          : skin === "smile"
            ? "#f5d15a"
            : "#f7f6f2";
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (skin === "smile") {
      this.drawSmileFace(ctx, ball.r);
    } else {
      ctx.fillStyle = skin === "fire" ? "#5a1c12" : skin === "ice" ? "#1a4a48" : "#161616";
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = ball.r * 0.07;
      pentagon(ctx, 0, 0, ball.r * 0.3, -Math.PI / 2, true);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const d = ball.r * 0.7;
        pentagon(ctx, Math.cos(a) * d, Math.sin(a) * d, ball.r * 0.2, a, true);
      }
      ctx.beginPath();
      ctx.arc(0, 0, ball.r * 0.52, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(20,20,20,0.35)";
      ctx.lineWidth = ball.r * 0.05;
      ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1.25;
    ctx.stroke();

    const hl = ctx.createRadialGradient(
      -ball.r * 0.32,
      -ball.r * 0.38,
      ball.r * 0.04,
      0,
      0,
      ball.r,
    );
    hl.addColorStop(0, "rgba(255,255,255,0.6)");
    hl.addColorStop(0.35, "rgba(255,255,255,0.08)");
    hl.addColorStop(1, "rgba(0,0,0,0.16)");
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFingers(
    ctx: CanvasRenderingContext2D,
    fingers: Finger[],
    time: number,
    glove: GloveSkin = "ring",
  ) {
    const slots = new Map<number, number>();
    const born0 = fingers
      .filter((f) => f.side === 0)
      .sort((a, b) => a.born - b.born);
    const born1 = fingers
      .filter((f) => f.side === 1)
      .sort((a, b) => a.born - b.born);
    born0.forEach((f, i) => slots.set(f.id, i + 1));
    born1.forEach((f, i) => slots.set(f.id, i + 1));

    for (const f of fingers) {
      const color = f.side === 0 ? GELO : BRASA;
      const ink = f.side === 0 ? "#06201c" : "#2a0e0c";
      const age = Math.min(1, (time - f.born) / 0.12);
      const pop = 0.72 + 0.28 * easeOutBack(age);
      const sp = Math.hypot(f.vx, f.vy);
      const stretch = 1 + Math.min(0.22, sp / 1800);
      const ang = Math.atan2(f.vy, f.vx);
      const slot = slots.get(f.id) ?? 1;

      ctx.save();
      ctx.translate(f.x, f.y);
      if (sp > 80) {
        ctx.rotate(ang);
        ctx.scale(stretch, 1 / stretch);
        ctx.rotate(-ang);
      }
      ctx.scale(pop, pop);

      if (sp > 420) {
        ctx.save();
        ctx.rotate(ang);
        const flame = ctx.createLinearGradient(-f.r * 1.8, 0, f.r * 0.2, 0);
        flame.addColorStop(0, withAlpha(color, 0));
        flame.addColorStop(1, withAlpha(color, 0.45));
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.moveTo(-f.r * 1.85, 0);
        ctx.lineTo(-f.r * 0.2, -f.r * 0.55);
        ctx.lineTo(-f.r * 0.2, f.r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const glow = ctx.createRadialGradient(0, 0, f.r * 0.2, 0, 0, f.r * 1.7);
      glow.addColorStop(0, withAlpha(color, 0.55));
      glow.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, f.r * 1.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "#121a16";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, f.r * 0.92, 0, Math.PI * 2);
      const disc = ctx.createRadialGradient(
        -f.r * 0.2,
        -f.r * 0.25,
        f.r * 0.1,
        0,
        0,
        f.r,
      );
      disc.addColorStop(0, withAlpha(color, 1));
      disc.addColorStop(0.55, withAlpha(color, 0.92));
      disc.addColorStop(1, ink);
      ctx.fillStyle = disc;
      ctx.fill();

      ctx.strokeStyle = withAlpha(PAPER, 0.7);
      ctx.lineWidth = Math.max(2, f.r * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, f.r * 0.92, 0, Math.PI * 2);
      ctx.stroke();

      if (glove === "stripe") {
        ctx.fillStyle = withAlpha(PAPER, 0.22);
        ctx.fillRect(-f.r * 0.92, -f.r * 0.16, f.r * 1.84, f.r * 0.32);
      }

      if (glove === "star") {
        ctx.fillStyle = withAlpha(PAPER, 0.9);
        starPath(ctx, 0, 0, f.r * 0.42);
        ctx.fill();
      } else if (glove !== "solid") {
        ctx.strokeStyle = withAlpha(PAPER, 0.28);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 0.72, 0, Math.PI * 2);
        ctx.stroke();

        const ticks = glove === "ring" ? 8 : 4;
        ctx.strokeStyle = withAlpha(PAPER, 0.45);
        ctx.lineWidth = 1.4;
        for (let i = 0; i < ticks; i++) {
          const a = (i / ticks) * Math.PI * 2 + (f.side === 0 ? 0.2 : 0);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * f.r * 0.78, Math.sin(a) * f.r * 0.78);
          ctx.lineTo(Math.cos(a) * f.r * 0.9, Math.sin(a) * f.r * 0.9);
          ctx.stroke();
        }

        if (f.side === 0) {
          ctx.strokeStyle = withAlpha(PAPER, 0.35);
          ctx.beginPath();
          ctx.moveTo(0, -f.r * 0.55);
          ctx.lineTo(0, -f.r * 0.22);
          ctx.moveTo(-f.r * 0.18, -f.r * 0.42);
          ctx.lineTo(f.r * 0.18, -f.r * 0.42);
          ctx.stroke();
        } else {
          ctx.fillStyle = withAlpha(PAPER, 0.28);
          chevron(ctx, 0, -f.r * 0.42, f.r * 0.18);
        }
      }

      ctx.beginPath();
      ctx.arc(-f.r * 0.22, -f.r * 0.28, f.r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, f.r * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(ink, 0.55);
      ctx.fill();

      ctx.fillStyle = PAPER;
      ctx.font = `700 ${f.r * 0.58}px "Bebas Neue", "Arial Narrow", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(slot), 0, f.r * 0.04);

      if (f.bot) {
        ctx.font = `600 ${f.r * 0.18}px Outfit, system-ui, sans-serif`;
        ctx.fillStyle = withAlpha(PAPER, 0.7);
        ctx.fillText("BOT", 0, f.r * 0.38);
      }

      ctx.restore();
    }
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    kind: Particle["kind"],
  ) {
    for (const p of particles) {
      if (p.kind !== kind) continue;
      const t = p.life / p.maxLife;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, t);
      if (p.kind === "confetti") {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
      } else if (p.kind === "boost") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.r * 1.4, 0);
        ctx.lineTo(-p.r * 0.6, p.r * 0.7);
        ctx.lineTo(-p.r * 0.6, -p.r * 0.7);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.r * (0.5 + 0.5 * t), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const g = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.28,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.74,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

function chevron(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.35);
  ctx.lineTo(x + s * 0.45, y + s * 0.15);
  ctx.lineTo(x, y);
  ctx.lineTo(x - s * 0.45, y + s * 0.15);
  ctx.closePath();
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.4;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function pentagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot: number,
  fill: boolean,
) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * Math.PI * 2) / 5;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) ctx.fill();
  else ctx.stroke();
}

function withAlpha(hex: string, a: number) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function easeOutBack(t: number) {
  const c = 1.70158;
  const x = t - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
}
