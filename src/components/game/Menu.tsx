import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  CloudRain,
  Cpu,
  Goal,
  Moon,
  SlidersHorizontal,
  Sun,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  BallSkin,
  BotLevel,
  CamFeel,
  GloveSkin,
  GoalSize,
  Mode,
  PitchTheme,
} from "@/game/types";
import { cn } from "@/lib/utils";

export function Menu({
  mode,
  muted,
  target,
  goalSize,
  botLevel,
  timerOn,
  theme,
  ballSkin,
  gloveSkin,
  camFeel,
  onMode,
  onTarget,
  onGoalSize,
  onBotLevel,
  onTimer,
  onTheme,
  onBall,
  onGlove,
  onCamFeel,
  onPlay,
  onMute,
}: {
  mode: Mode;
  muted: boolean;
  target: number;
  goalSize: GoalSize;
  botLevel: BotLevel;
  timerOn: boolean;
  theme: PitchTheme;
  ballSkin: BallSkin;
  gloveSkin: GloveSkin;
  camFeel: CamFeel;
  onMode: (m: Mode) => void;
  onTarget: (n: number) => void;
  onGoalSize: (s: GoalSize) => void;
  onBotLevel: (l: BotLevel) => void;
  onTimer: (on: boolean) => void;
  onTheme: (t: PitchTheme) => void;
  onBall: (s: BallSkin) => void;
  onGlove: (s: GloveSkin) => void;
  onCamFeel: (f: CamFeel) => void;
  onPlay: (m: Mode) => void;
  onMute: () => void;
}) {
  const [sheet, setSheet] = useState(false);

  if (sheet) {
    return (
      <Ajustes
        mode={mode}
        target={target}
        goalSize={goalSize}
        botLevel={botLevel}
        timerOn={timerOn}
        theme={theme}
        ballSkin={ballSkin}
        gloveSkin={gloveSkin}
        camFeel={camFeel}
        onTarget={onTarget}
        onGoalSize={onGoalSize}
        onBotLevel={onBotLevel}
        onTimer={onTimer}
        onTheme={onTheme}
        onBall={onBall}
        onGlove={onGlove}
        onCamFeel={onCamFeel}
        onBack={() => setSheet(false)}
      />
    );
  }

  return (
    <div className="overlay overlay-menu">
      <div className="menu-inner">
        <p className="menu-kicker">Gol a Gol</p>
        <div className="menu-actions">
          <Button variant="default" size="xl" onClick={() => onPlay("versus")}>
            <Users />
            Dois jogadores
          </Button>
          <Button variant="outline" size="xl" onClick={() => onPlay("bot")}>
            <Cpu />
            Contra o bot
          </Button>
        </div>
        <div className="menu-foot">
          <button type="button" className="icon-quiet" onClick={() => setSheet(true)}>
            <SlidersHorizontal />
            Ajustes
          </button>
          <button type="button" className="icon-quiet" onClick={onMute}>
            {muted ? <VolumeX /> : <Volume2 />}
            {muted ? "Som off" : "Som on"}
          </button>
          <Link to="/" className="icon-quiet">
            Início
          </Link>
        </div>
      </div>
    </div>
  );
}

export function FeelPick({
  value,
  onPick,
}: {
  value: CamFeel;
  onPick: (f: CamFeel) => void;
}) {
  return (
    <div className="feel-block">
      <span className="menu-label">Tremor do campo</span>
      <div className="feel-pick">
        {(
          [
            ["leve", "Leve", 1],
            ["medio", "Médio", 2],
            ["forte", "Forte", 3],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            className={cn("feel-card", value === id && "is-on")}
            onClick={() => onPick(id)}
          >
            <span className="feel-bars" aria-hidden="true">
              {Array.from({ length: 3 }, (_, i) => (
                <i key={i} className={cn(i < n && "is-lit")} />
              ))}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Ajustes({
  mode,
  target,
  goalSize,
  botLevel,
  timerOn,
  theme,
  ballSkin,
  gloveSkin,
  camFeel,
  onTarget,
  onGoalSize,
  onBotLevel,
  onTimer,
  onTheme,
  onBall,
  onGlove,
  onCamFeel,
  onBack,
}: {
  mode: Mode;
  target: number;
  goalSize: GoalSize;
  botLevel: BotLevel;
  timerOn: boolean;
  theme: PitchTheme;
  ballSkin: BallSkin;
  gloveSkin: GloveSkin;
  camFeel: CamFeel;
  onTarget: (n: number) => void;
  onGoalSize: (s: GoalSize) => void;
  onBotLevel: (l: BotLevel) => void;
  onTimer: (on: boolean) => void;
  onTheme: (t: PitchTheme) => void;
  onBall: (s: BallSkin) => void;
  onGlove: (s: GloveSkin) => void;
  onCamFeel: (f: CamFeel) => void;
  onBack: () => void;
}) {
  return (
    <div className="overlay overlay-menu">
      <div className="menu-inner">
        <button type="button" className="icon-quiet setup-back" onClick={onBack}>
          <ArrowLeft />
          Voltar
        </button>
        <h2 className="setup-title">Ajustes</h2>
        <div className="menu-options">
          <FeelPick value={camFeel} onPick={onCamFeel} />

          <div className="setup-block">
            <span className="menu-label">
              <Goal /> Tamanho do gol
            </span>
            <div className="goal-pick">
              {(
                [
                  ["s", "Pequeno"],
                  ["m", "Médio"],
                  ["l", "Grande"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn("goal-card", goalSize === id && "is-on")}
                  onClick={() => onGoalSize(id)}
                >
                  <span className={cn("goal-mouth", `sz-${id}`)} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="menu-row">
            <span className="menu-label">Primeiro a</span>
            <div className="chip-row">
              {[3, 5, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cn("chip", n === target && "chip-on")}
                  onClick={() => onTarget(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-row">
            <span className="menu-label">
              <Clock /> Relógio
            </span>
            <div className="chip-row">
              <button
                type="button"
                className={cn("chip", !timerOn && "chip-on")}
                onClick={() => onTimer(false)}
              >
                Só gols
              </button>
              <button
                type="button"
                className={cn("chip", timerOn && "chip-on")}
                onClick={() => onTimer(true)}
              >
                2 min
              </button>
            </div>
          </div>

          <div className="menu-row">
            <span className="menu-label">Bot</span>
            <div className="chip-row">
              {(
                [
                  ["easy", "Fácil"],
                  ["normal", "Normal"],
                  ["hard", "Difícil"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn("chip", botLevel === id && "chip-on")}
                  onClick={() => onBotLevel(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-block">
            <span className="menu-label">Campo</span>
            <div className="chip-row">
              <button
                type="button"
                className={cn("chip", theme === "night" && "chip-on")}
                onClick={() => onTheme("night")}
              >
                <Moon /> Noite
              </button>
              <button
                type="button"
                className={cn("chip", theme === "grass" && "chip-on")}
                onClick={() => onTheme("grass")}
              >
                <Sun /> Grama
              </button>
              <button
                type="button"
                className={cn("chip", theme === "rain" && "chip-on")}
                onClick={() => onTheme("rain")}
              >
                <CloudRain /> Chuva
              </button>
            </div>
          </div>

          <div className="menu-row">
            <span className="menu-label">Bola</span>
            <div className="chip-row">
              {(
                [
                  ["classic", "Clássica"],
                  ["fire", "Fogo"],
                  ["ice", "Gelo"],
                  ["smile", "Sorriso"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn("chip", ballSkin === id && "chip-on")}
                  onClick={() => onBall(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-row">
            <span className="menu-label">Luvas</span>
            <div className="chip-row">
              {(
                [
                  ["ring", "Anel"],
                  ["stripe", "Faixa"],
                  ["solid", "Cheia"],
                  ["star", "Estrela"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn("chip", gloveSkin === id && "chip-on")}
                  onClick={() => onGlove(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button size="xl" onClick={onBack}>
          Pronto
        </Button>
      </div>
    </div>
  );
}
