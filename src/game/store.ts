import { create } from "zustand";
import type {
  Axis,
  BallSkin,
  BotLevel,
  GloveSkin,
  GoalSize,
  Mode,
  Phase,
  PitchTheme,
} from "./types";

export interface GameUi {
  phase: Phase;
  mode: Mode;
  axis: Axis;
  score: [number, number];
  target: number;
  goalSize: GoalSize;
  lastScorer: 0 | 1 | null;
  winner: 0 | 1 | null;
  countdown: number;
  ready: [boolean, boolean];
  muted: boolean;
  shake: boolean;
  fingers: [number, number];
  booted: boolean;
  botLevel: BotLevel;
  timerOn: boolean;
  clock: number;
  sudden: boolean;
  theme: PitchTheme;
  ballSkin: BallSkin;
  gloveSkin: GloveSkin;
  tutorialDone: boolean;
  scorePulse: number;
}

export interface GameUiApi extends GameUi {
  patch: (partial: Partial<GameUi>) => void;
}

export const useGameUi = create<GameUiApi>((set) => ({
  phase: "menu",
  mode: "versus",
  axis: "tb",
  score: [0, 0],
  target: 5,
  goalSize: "m",
  lastScorer: null,
  winner: null,
  countdown: 0,
  ready: [false, false],
  muted: false,
  shake: true,
  fingers: [0, 0],
  booted: false,
  botLevel: "normal",
  timerOn: false,
  clock: 120,
  sudden: false,
  theme: "night",
  ballSkin: "classic",
  gloveSkin: "ring",
  tutorialDone: false,
  scorePulse: 0,
  patch: (partial) => set(partial),
}));

export function patchUi(partial: Partial<GameUi>) {
  useGameUi.getState().patch(partial);
}
