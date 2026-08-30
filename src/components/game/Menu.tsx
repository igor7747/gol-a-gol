import { Link } from "@tanstack/react-router";
import {
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
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  BallSkin,
  BotLevel,
  GloveSkin,
  GoalSize,
  Mode,
  PitchTheme,
} from "@/game/types";
import { cn } from "@/lib/utils";

export function Menu({
  mode,
  options,
  muted,
  target,
  goalSize,
  botLevel,
  timerOn,
  theme,
  ballSkin,
  gloveSkin,
  onMode,
  onOptions,
  onTarget,
  onGoalSize,
  onBotLevel,
  onTimer,
  onTheme,
  onBall,
  onGlove,
  onPlay,
  onMute,
}: {
  mode: Mode;
  options: boolean;
  muted: boolean;
  target: number;
  goalSize: GoalSize;
  botLevel: BotLevel;
  timerOn: boolean;
  theme: PitchTheme;
  ballSkin: BallSkin;
  gloveSkin: GloveSkin;
  onMode: (m: Mode) => void;
  onOptions: () => void;
  onTarget: (n: number) => void;
  onGoalSize: (s: GoalSize) => void;
  onBotLevel: (l: BotLevel) => void;
  onTimer: (on: boolean) => void;
  onTheme: (t: PitchTheme) => void;
  onBall: (s: BallSkin) => void;
  onGlove: (s: GloveSkin) => void;
  onPlay: () => void;
  onMute: () => void;
}) {
  const summary = [
    goalSize === "s" ? "gol pequeno" : goalSize === "l" ? "gol grande" : "gol médio",
    timerOn ? "2 min" : `até ${target}`,
    theme === "grass" ? "grama" : theme === "rain" ? "chuva" : "noite",
  ].join(" · ");

  return (
    <div className="overlay overlay-menu">
      <div className="menu-inner">
        <div className="menu-hero">
          <img src="/art/hero.jpg" alt="" />
        </div>
        <p className="menu-kicker">Dois jogadores · um celular</p>
        <h1 className="menu-title">Gol a Gol</h1>

        <div className="mode-pick">
          <button
            type="button"
            className={cn("mode-card", mode === "versus" && "is-on")}
            onClick={() => onMode("versus")}
          >
            <Users />
            Dois jogadores
          </button>
          <button
            type="button"
            className={cn("mode-card", mode === "bot" && "is-on")}
            onClick={() => onMode("bot")}
          >
            <Cpu />
            Contra o bot
          </button>
        </div>

        {mode === "bot" && (
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
        )}

        <div className="menu-actions">
          <Button variant="default" size="xl" onClick={onPlay}>
            <Zap />
            Jogar
          </Button>
        </div>

        <button type="button" className="icon-quiet" onClick={onOptions}>
          <SlidersHorizontal />
          {options ? "Fechar opções" : summary}
        </button>

        {options && (
          <Options
            mode={mode}
            target={target}
            goalSize={goalSize}
            botLevel={botLevel}
            timerOn={timerOn}
            theme={theme}
            ballSkin={ballSkin}
            gloveSkin={gloveSkin}
            onTarget={onTarget}
            onGoalSize={onGoalSize}
            onBotLevel={onBotLevel}
            onTimer={onTimer}
            onTheme={onTheme}
            onBall={onBall}
            onGlove={onGlove}
          />
        )}

        <div className="menu-foot">
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

function Options({
  mode,
  target,
  goalSize,
  botLevel,
  timerOn,
  theme,
  ballSkin,
  gloveSkin,
  onTarget,
  onGoalSize,
  onBotLevel,
  onTimer,
  onTheme,
  onBall,
  onGlove,
}: {
  mode: Mode;
  target: number;
  goalSize: GoalSize;
  botLevel: BotLevel;
  timerOn: boolean;
  theme: PitchTheme;
  ballSkin: BallSkin;
  gloveSkin: GloveSkin;
  onTarget: (n: number) => void;
  onGoalSize: (s: GoalSize) => void;
  onBotLevel: (l: BotLevel) => void;
  onTimer: (on: boolean) => void;
  onTheme: (t: PitchTheme) => void;
  onBall: (s: BallSkin) => void;
  onGlove: (s: GloveSkin) => void;
}) {
  return (
    <div className="menu-options">
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
            2 minutos
          </button>
        </div>
      </div>

      {mode === "bot" && (
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
      )}

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
  );
}
