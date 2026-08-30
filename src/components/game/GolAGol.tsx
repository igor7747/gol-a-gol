import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, FeelPick } from "@/components/game/Menu";
import { Engine } from "@/game/engine";
import { useGameUi } from "@/game/store";
import type { Axis, CamFeel, Mode, SideStats } from "@/game/types";
import { cn } from "@/lib/utils";

export function GolAGol({ start }: { start?: Mode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const launched = useRef(false);
  const ui = useGameUi();
  const [mode, setMode] = useState<Mode>(start ?? "versus");
  const [showLoader, setShowLoader] = useState(true);
  const [tutorial, setTutorial] = useState(false);

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

  useEffect(() => {
    if (!ui.booted) return;
    const t = window.setTimeout(() => setShowLoader(false), 480);
    return () => window.clearTimeout(t);
  }, [ui.booted]);

  useEffect(() => {
    const t = window.setTimeout(() => setShowLoader(false), 4500);
    return () => window.clearTimeout(t);
  }, []);

  const eng = () => engineRef.current;

  useEffect(() => {
    if (!showLoader && ui.phase === "menu" && !ui.tutorialDone) {
      setTutorial(true);
    }
  }, [showLoader, ui.phase, ui.tutorialDone]);

  const launch = (m: Mode) => {
    launched.current = true;
    engineRef.current?.setMode(m);
  };

  useEffect(() => {
    if (showLoader || tutorial || ui.phase !== "menu") return;
    if (!start || launched.current) return;
    launch(start);
  }, [showLoader, tutorial, start, ui.phase]);

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

      {showLoader && <Loader />}

      {tutorial && !showLoader && (
        <Tutorial
          onDone={() => {
            setTutorial(false);
            eng()?.finishTutorial();
            if (start) launch(start);
          }}
        />
      )}

      {ui.phase === "menu" && !tutorial && !showLoader && (
        <Menu
          mode={mode}
          muted={ui.muted}
          target={ui.target}
          goalSize={ui.goalSize}
          botLevel={ui.botLevel}
          timerOn={ui.timerOn}
          theme={ui.theme}
          ballSkin={ui.ballSkin}
          gloveSkin={ui.gloveSkin}
          camFeel={ui.camFeel}
          onMode={setMode}
          onTarget={(n) => eng()?.setTarget(n)}
          onGoalSize={(s) => eng()?.setGoalSize(s)}
          onBotLevel={(l) => eng()?.setBotLevel(l)}
          onTimer={(on) => eng()?.setTimerOn(on)}
          onTheme={(t) => eng()?.setTheme(t)}
          onBall={(s) => eng()?.setBallSkin(s)}
          onGlove={(s) => eng()?.setGloveSkin(s)}
          onCamFeel={(f) => eng()?.setCamFeel(f)}
          onPlay={() => launch(mode)}
          onMute={() => eng()?.setMuted(!ui.muted)}
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
          timerOn={ui.timerOn}
          clock={ui.clock}
          sudden={ui.sudden}
          onPause={() =>
            ui.phase === "paused" ? eng()?.resume() : eng()?.pause()
          }
        />
      )}

      {ui.phase === "paused" && (
        <PauseMenu
          muted={ui.muted}
          camFeel={ui.camFeel}
          stats={ui.stats}
          onResume={() => eng()?.resume()}
          onMenu={() => eng()?.toMenu()}
          onMute={() => eng()?.setMuted(!ui.muted)}
          onCamFeel={(f) => eng()?.setCamFeel(f)}
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
          stats={ui.stats}
          onRematch={() => eng()?.rematch()}
          onMenu={() => eng()?.toMenu()}
        />
      )}
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
          <img src="/art/brasa.jpg" alt="" className="ready-crest" />
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
          <img src="/art/gelo.jpg" alt="" className="ready-crest" />
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
  timerOn,
  clock,
  sudden,
  onPause,
}: {
  axis: Axis;
  target: number;
  paused: boolean;
  timerOn: boolean;
  clock: number;
  sudden: boolean;
  onPause: () => void;
}) {
  const mm = Math.floor(Math.max(0, clock) / 60);
  const ss = String(Math.max(0, clock) % 60).padStart(2, "0");
  return (
    <div className={cn("hud pointer-none", `layout-${axis}`)}>
      <button
        type="button"
        className="hud-pause pointer-auto"
        onClick={onPause}
        aria-label={paused ? "Continuar" : "Pausar"}
      >
        {paused ? <Play /> : <Pause />}
        <span>
          {sudden ? "Morte súbita" : timerOn ? `${mm}:${ss}` : `até ${target}`}
        </span>
      </button>
    </div>
  );
}

function PauseMenu({
  muted,
  camFeel,
  stats,
  onResume,
  onMenu,
  onMute,
  onCamFeel,
}: {
  muted: boolean;
  camFeel: CamFeel;
  stats: [SideStats, SideStats];
  onResume: () => void;
  onMenu: () => void;
  onMute: () => void;
  onCamFeel: (f: CamFeel) => void;
}) {
  return (
    <div className="overlay overlay-center">
      <div className="panel">
        <h2 className="panel-title">Pausa</h2>
        <FeelPick value={camFeel} onPick={onCamFeel} />
        <StatTable gelo={stats[0]} brasa={stats[1]} />
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
  stats,
  onRematch,
  onMenu,
}: {
  axis: Axis;
  winner: 0 | 1;
  score: [number, number];
  mode: Mode;
  stats: [SideStats, SideStats];
  onRematch: () => void;
  onMenu: () => void;
}) {
  const name = winner === 0 ? "Gelo" : "Brasa";
  const youWin = mode === "bot" && winner === 0;
  const youLose = mode === "bot" && winner === 1;
  const headline = youWin
    ? "Você venceu"
    : youLose
      ? "O bot venceu"
      : `${name} vence`;
  return (
    <div className={cn("overlay overlay-split", `layout-${axis}`)}>
      <div className="over-side over-brasa">
        <div className="over-inner">
          <p className="over-kicker">Fim de jogo</p>
          <h2>{headline}</h2>
          <p className="over-score">
            {score[1]} – {score[0]}
          </p>
          <StatTable gelo={stats[0]} brasa={stats[1]} compact />
        </div>
      </div>
      <div className="over-side over-gelo">
        <div className="over-inner">
          <p className="over-kicker">Fim de jogo</p>
          <h2>{headline}</h2>
          <p className="over-score">
            {score[0]} – {score[1]}
          </p>
          <StatTable gelo={stats[0]} brasa={stats[1]} compact />
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

function Loader() {
  return (
    <div className="loader" role="status" aria-live="polite">
      <img src="/art/logo.jpg" alt="" className="brand-logo loader-logo" />
      <p className="loader-kicker">Gol a Gol</p>
      <h2 className="loader-title">Montando o campo</h2>
      <p className="loader-note">Gramado, gols e torcida</p>
    </div>
  );
}

function StatTable({
  gelo,
  brasa,
  compact = false,
}: {
  gelo: SideStats;
  brasa: SideStats;
  compact?: boolean;
}) {
  const spd = (n: number) => (n < 40 ? "—" : `${Math.round(n / 8)}`);
  const rows: Array<[string, string, string]> = [
    ["Chutes", String(brasa.shots), String(gelo.shots)],
    ["A gol", String(brasa.onTarget), String(gelo.onTarget)],
    ["Defesas", String(brasa.saves), String(gelo.saves)],
    ["Boosts", String(brasa.boosts), String(gelo.boosts)],
    ["Toques", String(brasa.touches), String(gelo.touches)],
    ["Chute máx.", spd(brasa.maxSpd), spd(gelo.maxSpd)],
  ];
  return (
    <table className={cn("stats", compact && "stats-compact")}>
      <thead>
        <tr>
          <th />
          <th className="stats-brasa">Brasa</th>
          <th className="stats-gelo">Gelo</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, a, b]) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{a}</td>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tutorial({ onDone }: { onDone: () => void }) {
  return (
    <div className="overlay overlay-menu">
      <div className="menu-inner">
        <img src="/art/mesa.jpg" alt="" className="tut-shot" />
        <p className="menu-kicker">Como jogar</p>
        <h2 className="setup-title">Deite o celular</h2>
        <p className="menu-lead">
          Cada um num gol. Até três dedos. O dedo defende e chuta. Os círculos
          no campo dão boost.
        </p>
        <div className="menu-actions">
          <Button size="xl" onClick={onDone}>
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
