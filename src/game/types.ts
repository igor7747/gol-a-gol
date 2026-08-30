export type Phase =
  | "menu"
  | "ready"
  | "countdown"
  | "playing"
  | "paused"
  | "replay"
  | "goal"
  | "over";

export type Mode = "versus" | "bot";

/** tb = gols em cima/baixo (retrato). lr = gols esquerda/direita (paisagem). */
export type Axis = "tb" | "lr";

export type GoalSize = "s" | "m" | "l";
export type BotLevel = "easy" | "normal" | "hard";
export type PitchTheme = "night" | "grass" | "rain";
export type BallSkin = "classic" | "fire" | "ice" | "smile";
export type GloveSkin = "ring" | "stripe" | "solid" | "star";
export type CamFeel = "leve" | "medio" | "forte";

export interface SideStats {
  shots: number;
  onTarget: number;
  saves: number;
  boosts: number;
  touches: number;
  maxSpd: number;
}

export function emptyStats(): SideStats {
  return { shots: 0, onTarget: 0, saves: 0, boosts: 0, touches: 0, maxSpd: 0 };
}

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

export const SETTINGS_KEY = "golagol-v2";

export interface SavedSettings {
  target: number;
  muted: boolean;
  camFeel: CamFeel;
  goalSize: GoalSize;
  botLevel: BotLevel;
  timerOn: boolean;
  theme: PitchTheme;
  ballSkin: BallSkin;
  gloveSkin: GloveSkin;
  tutorialDone: boolean;
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
  let x = axis === "lr" ? padEnd : padSide;
  let y = axis === "tb" ? padEnd : padSide;
  let pw = viewW - x * 2;
  let ph = viewH - y * 2;
  const shrink = 0.9;
  x += (pw * (1 - shrink)) / 2;
  y += (ph * (1 - shrink)) / 2;
  pw *= shrink;
  ph *= shrink;
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

function defaults(): SavedSettings {
  return {
    target: 5,
    muted: false,
    camFeel: "medio",
    goalSize: "m",
    botLevel: "normal",
    timerOn: false,
    theme: "night",
    ballSkin: "classic",
    gloveSkin: "ring",
    tutorialDone: false,
  };
}

export function loadSettings(): SavedSettings {
  const base = defaults();
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem("golagol-v1");
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SavedSettings>;
    const target = parsed.target === 3 || parsed.target === 7 ? parsed.target : 5;
    const goalSize: GoalSize =
      parsed.goalSize === "s" || parsed.goalSize === "l" ? parsed.goalSize : "m";
    const botLevel: BotLevel =
      parsed.botLevel === "easy" || parsed.botLevel === "hard" ? parsed.botLevel : "normal";
    const theme: PitchTheme =
      parsed.theme === "grass" || parsed.theme === "rain" ? parsed.theme : "night";
    const ballSkin: BallSkin =
      parsed.ballSkin === "fire" || parsed.ballSkin === "ice" || parsed.ballSkin === "smile"
        ? parsed.ballSkin
        : "classic";
    const gloveSkin: GloveSkin =
      parsed.gloveSkin === "stripe" ||
      parsed.gloveSkin === "solid" ||
      parsed.gloveSkin === "star"
        ? parsed.gloveSkin
        : "ring";
    const camFeel: CamFeel =
      parsed.camFeel === "leve" || parsed.camFeel === "forte"
        ? parsed.camFeel
        : (parsed as { shake?: boolean }).shake === false
          ? "leve"
          : "medio";
    return {
      target,
      muted: Boolean(parsed.muted),
      camFeel,
      goalSize,
      botLevel,
      timerOn: Boolean(parsed.timerOn),
      theme,
      ballSkin,
      gloveSkin,
      tutorialDone: Boolean(parsed.tutorialDone),
    };
  } catch {
    return base;
  }
}

export function saveSettings(s: SavedSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}
