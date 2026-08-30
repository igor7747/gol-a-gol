export type Phase =
  | "menu"
  | "ready"
  | "countdown"
  | "playing"
  | "paused"
  | "goal"
  | "over";

export type Mode = "versus" | "bot";

/** tb = gols em cima/baixo (retrato). lr = gols esquerda/direita (paisagem). */
export type Axis = "tb" | "lr";

export type GoalSize = "s" | "m" | "l";

export const GOAL_SIZE_RATIO: Record<GoalSize, number> = {
  s: 0.34,
  m: 0.52,
  l: 0.72,
};

export interface BoostPad {
  x: number;
  y: number;
  r: number;
}

export interface Field {
  w: number;
  h: number;
  axis: Axis;
  x: number;
  y: number;
  pw: number;
  ph: number;
  midY: number;
  midX: number;
  goalW: number;
  goalD: number;
  line: number;
  ballR: number;
  fingerR: number;
  corner: number;
  pads: BoostPad[];
}

export interface Finger {
  id: number;
  side: 0 | 1;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  r: number;
  born: number;
  bot: boolean;
}

export interface Ball {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vrot: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
  rot: number;
  vrot: number;
  kind: "spark" | "confetti" | "dust" | "boost";
}

export const GELO = "#7ee0d6";
export const BRASA = "#e07a72";
export const PAPER = "#f3f1ea";

export const SETTINGS_KEY = "golagol-v1";

export interface SavedSettings {
  target: number;
  muted: boolean;
  shake: boolean;
  goalSize: GoalSize;
}

export function makeField(
  viewW: number,
  viewH: number,
  goalSize: GoalSize = "m",
): Field {
  const axis: Axis = viewW > viewH * 1.05 ? "lr" : "tb";
  const min = Math.min(viewW, viewH);
  const long = axis === "tb" ? viewH : viewW;
  const short = axis === "tb" ? viewW : viewH;
  const goalD = Math.max(26, Math.min(56, long * 0.065));
  const padEnd = goalD + 2;
  const padSide = Math.max(3, min * 0.008);
  const x = axis === "lr" ? padEnd : padSide;
  const y = axis === "tb" ? padEnd : padSide;
  const pw = viewW - x * 2;
  const ph = viewH - y * 2;
  const midX = x + pw / 2;
  const midY = y + ph / 2;
  const padR = Math.max(16, min * 0.055);
  const pads: BoostPad[] =
    axis === "lr"
      ? [
          { x: x + pw * 0.28, y: midY - ph * 0.22, r: padR },
          { x: x + pw * 0.72, y: midY + ph * 0.22, r: padR },
        ]
      : [
          { x: midX - pw * 0.22, y: y + ph * 0.28, r: padR },
          { x: midX + pw * 0.22, y: y + ph * 0.72, r: padR },
        ];
  return {
    w: viewW,
    h: viewH,
    axis,
    x,
    y,
    pw,
    ph,
    midY,
    midX,
    goalW: short * GOAL_SIZE_RATIO[goalSize],
    goalD,
    line: Math.max(2, min * 0.006),
    ballR: Math.max(14, min * 0.036),
    fingerR: Math.max(38, Math.min(58, min * 0.11)),
    corner: Math.max(8, min * 0.018),
    pads,
  };
}

export function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { target: 5, muted: false, shake: true, goalSize: "m" };
    const parsed = JSON.parse(raw) as Partial<SavedSettings>;
    const target = parsed.target === 3 || parsed.target === 7 ? parsed.target : 5;
    const goalSize: GoalSize =
      parsed.goalSize === "s" || parsed.goalSize === "l" ? parsed.goalSize : "m";
    return {
      target,
      muted: Boolean(parsed.muted),
      shake: parsed.shake !== false,
      goalSize,
    };
  } catch {
    return { target: 5, muted: false, shake: true, goalSize: "m" };
  }
}

export function saveSettings(s: SavedSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}
