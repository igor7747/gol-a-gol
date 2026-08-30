import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Cpu,
  Goal,
  Hand,
  Pause,
  Play,
  RotateCcw,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Engine } from "@/game/engine";
import { useGameUi } from "@/game/store";
import type { Axis, GoalSize, Mode } from "@/game/types";
import { cn } from "@/lib/utils";

export function GolAGol() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const ui = useGameUi();
  const [setup, setSetup] = useState<Mode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas);
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const eng = () => engineRef.current;

  useEffect(() => {
    if (ui.phase !== "menu") setSetup(null);
  }, [ui.phase]);

  return (
    <div
      className={cn("game-shell", `layout-${ui.axis}`)}
      onPointerDown={() => eng()?.unlockAudio()}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Campo de gol a gol"
      />

      {ui.phase === "menu" && setup === null && (
        <Home
          muted={ui.muted}
          onVersus={() => setSetup("versus")}
          onBot={() => setSetup("bot")}
          onMute={() => eng()?.setMuted(!ui.muted)}
        />
      )}

      {ui.phase === "menu" && setup !== null && (
        <Setup
          mode={setup}
          target={ui.target}
          goalSize={ui.goalSize}
          onTarget={(n) => eng()?.setTarget(n)}
          onGoalSize={(s) => eng()?.setGoalSize(s)}
          onPlay={() => eng()?.setMode(setup)}
          onBack={() => setSetup(null)}
        />
      )}

      {ui.phase === "ready" && (
        <Ready
          axis={ui.axis}
          ready={ui.ready}
          onReady={(side) => eng()?.setReady(side)}
          onBack={() => eng()?.toMenu()}
        />
      )}

      {ui.phase === "countdown" && <Countdown n={ui.countdown} />}

      {(ui.phase === "playing" ||
        ui.phase === "paused" ||
        ui.phase === "countdown" ||
        ui.phase === "goal") && (
        <Hud
          axis={ui.axis}
          target={ui.target}
          paused={ui.phase === "paused"}
          onPause={() =>
            ui.phase === "paused" ? eng()?.resume() : eng()?.pause()
          }
        />
      )}

      {ui.phase === "paused" && (
        <PauseMenu
          muted={ui.muted}
          onResume={() => eng()?.resume()}
          onMenu={() => eng()?.toMenu()}
          onMute={() => eng()?.setMuted(!ui.muted)}
        />
      )}

      {ui.phase === "goal" && ui.lastScorer !== null && (
        <GoalBanner axis={ui.axis} scorer={ui.lastScorer} />
      )}

      {ui.phase === "over" && ui.winner !== null && (
        <Over
          axis={ui.axis}
          winner={ui.winner}
          score={ui.score}
          mode={ui.mode}
          onRematch={() => eng()?.rematch()}
          onMenu={() => eng()?.toMenu()}
        />
      )}
    </div>
  );
}

function Home({
  muted,
  onVersus,
  onBot,
  onMute,
}: {
  muted: boolean;
  onVersus: () => void;
  onBot: () => void;
  onMute: () => void;
}) {
  return (
    <div className="overlay overlay-menu">
      <div className="menu-inner">
        <p className="menu-kicker">Dois jogadores · um celular</p>
        <h1 className="menu-title">Gol a Gol</h1>
        <p className="menu-lead">
          Celular deitado na mesa. Cada um num gol. O dedo defende e chuta
          ao mesmo tempo.
        </p>

        <div className="menu-actions">
          <Button variant="default" size="xl" onClick={onVersus}>
            <Users />
            Dois jogadores
          </Button>
          <Button variant="outline" size="xl" onClick={onBot}>
            <Cpu />
            Contra o bot
          </Button>
        </div>

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

function Setup({
  mode,
  target,
  goalSize,
  onTarget,
  onGoalSize,
  onPlay,
  onBack,
}: {
  mode: Mode;
  target: number;
  goalSize: GoalSize;
  onTarget: (n: number) => void;
  onGoalSize: (s: GoalSize) => void;
  onPlay: () => void;
  onBack: () => void;
}) {
  return (
    <div className="overlay overlay-menu">
      <div className="menu-inner">
        <button type="button" className="icon-quiet setup-back" onClick={onBack}>
          <ArrowLeft />
          Voltar
        </button>
        <p className="menu-kicker">
          {mode === "versus" ? "Dois jogadores" : "Contra o bot"}
        </p>
        <h2 className="setup-title">Antes de jogar</h2>

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

        <div className="how">
          <Hand className="how-icon" strokeWidth={1.75} />
          <p>
            Toque na sua metade — até 3 dedos. Arraste rápido para chutar.
            Os círculos no campo dão um boost, no estilo da arena.
          </p>
        </div>

        <div className="menu-actions">
          <Button variant="default" size="xl" onClick={onPlay}>
            <Zap />
            Jogar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Ready({
  axis,
  ready,
  onReady,
  onBack,
}: {
  axis: Axis;
  ready: [boolean, boolean];
  onReady: (side: 0 | 1) => void;
  onBack: () => void;
}) {
  return (
    <div className={cn("overlay overlay-split", `layout-${axis}`)}>
      <button
        type="button"
        className={cn("ready-side ready-brasa", ready[1] && "is-ready")}
        onClick={() => onReady(1)}
      >
        <span className="ready-inner">
          <span className="ready-team">Brasa</span>
          <span className="ready-cta">
            {ready[1] ? "Pronto" : "Toque para começar"}
          </span>
          <span className="ready-note">Seu gol · até 3 dedos</span>
        </span>
      </button>
      <button
        type="button"
        className={cn("ready-side ready-gelo", ready[0] && "is-ready")}
        onClick={() => onReady(0)}
      >
        <span className="ready-inner">
          <span className="ready-team">Gelo</span>
          <span className="ready-cta">
            {ready[0] ? "Pronto" : "Toque para começar"}
          </span>
          <span className="ready-note">Seu gol · até 3 dedos</span>
        </span>
      </button>
      <button type="button" className="ready-back" onClick={onBack}>
        <ArrowLeft />
        Menu
      </button>
    </div>
  );
}

function Countdown({ n }: { n: number }) {
  const label = n === 0 ? "GO" : String(n);
  return (
    <div className="overlay overlay-center pointer-none">
      <div className="count-wrap">
        <span className={cn("count-flip", n === 0 && "count-go")}>{label}</span>
        <span className={cn("count-num", n === 0 && "count-go")}>{label}</span>
      </div>
    </div>
  );
}

function Hud({
  axis,
  target,
  paused,
  onPause,
}: {
  axis: Axis;
  target: number;
  paused: boolean;
  onPause: () => void;
}) {
  return (
    <div className={cn("hud pointer-none", `layout-${axis}`)}>
      <button
        type="button"
        className="hud-pause pointer-auto"
        onClick={onPause}
        aria-label={paused ? "Continuar" : "Pausar"}
      >
        {paused ? <Play /> : <Pause />}
        <span>até {target}</span>
      </button>
    </div>
  );
}

function PauseMenu({
  muted,
  onResume,
  onMenu,
  onMute,
}: {
  muted: boolean;
  onResume: () => void;
  onMenu: () => void;
  onMute: () => void;
}) {
  return (
    <div className="overlay overlay-center">
      <div className="panel">
        <h2 className="panel-title">Pausa</h2>
        <div className="panel-actions">
          <Button size="lg" onClick={onResume}>
            <Play />
            Continuar
          </Button>
          <Button variant="outline" size="lg" onClick={onMute}>
            {muted ? <VolumeX /> : <Volume2 />}
            {muted ? "Ativar som" : "Silenciar"}
          </Button>
          <Button variant="ghost" size="lg" onClick={onMenu}>
            <ArrowLeft />
            Menu
          </Button>
        </div>
      </div>
    </div>
  );
}

function GoalBanner({ axis, scorer }: { axis: Axis; scorer: 0 | 1 }) {
  const name = scorer === 0 ? "Gelo" : "Brasa";
  const cls = scorer === 0 ? "goal-gelo" : "goal-brasa";
  return (
    <div className={cn("overlay overlay-split pointer-none", `layout-${axis}`)}>
      <div className={cn("goal-band goal-top", cls)}>
        <span>Gol</span>
        <small>{name}</small>
      </div>
      <div className={cn("goal-band goal-bot", cls)}>
        <span>Gol</span>
        <small>{name}</small>
      </div>
    </div>
  );
}

function Over({
  axis,
  winner,
  score,
  mode,
  onRematch,
  onMenu,
}: {
  axis: Axis;
  winner: 0 | 1;
  score: [number, number];
  mode: "versus" | "bot";
  onRematch: () => void;
  onMenu: () => void;
}) {
  const name = winner === 0 ? "Gelo" : "Brasa";
  const youWin = mode === "bot" && winner === 0;
  const youLose = mode === "bot" && winner === 1;
  const headline = youWin ? "Você venceu" : youLose ? "O bot venceu" : `${name} vence`;
  return (
    <div className={cn("overlay overlay-split", `layout-${axis}`)}>
      <div className="over-side over-brasa">
        <div className="over-inner">
          <p className="over-kicker">Fim de jogo</p>
          <h2>{headline}</h2>
          <p className="over-score">
            {score[1]} – {score[0]}
          </p>
        </div>
      </div>
      <div className="over-side over-gelo">
        <div className="over-inner">
          <p className="over-kicker">Fim de jogo</p>
          <h2>{headline}</h2>
          <p className="over-score">
            {score[0]} – {score[1]}
          </p>
          <div className="over-actions">
            <Button size="lg" onClick={onRematch}>
              <RotateCcw />
              Outra
            </Button>
            <Button variant="outline" size="lg" onClick={onMenu}>
              Menu
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
