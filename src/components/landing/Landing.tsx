import { Link } from "@tanstack/react-router";
import { Hand, Smartphone, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Landing() {
  return (
    <div className="land">
      <div className="land-pitch" aria-hidden="true">
        <span className="land-mid" />
        <span className="land-circle" />
        <span className="land-ball" />
      </div>

      <header className="land-hero">
        <p className="land-kicker">Dois jogadores · um celular</p>
        <h1 className="land-title">Gol a Gol</h1>
        <p className="land-lead">
          Deite o celular na mesa. Cada um num gol. O dedo defende e chuta ao
          mesmo tempo — multi-toque, boost e três tamanhos de arco.
        </p>
        <Button asChild size="xl" className="land-cta">
          <Link to="/play">
            <Zap />
            Jogar agora
          </Link>
        </Button>
      </header>

      <section className="land-teams" aria-label="Times">
        <div className="land-team land-brasa">
          <span className="land-team-name">Brasa</span>
          <span className="land-team-note">Um extremo do campo</span>
        </div>
        <div className="land-team land-gelo">
          <span className="land-team-name">Gelo</span>
          <span className="land-team-note">O gol de frente</span>
        </div>
      </section>

      <ol className="land-steps">
        <li>
          <Smartphone />
          <div>
            <strong>Deite o celular</strong>
            <span>Na mesa, entre os dois</span>
          </div>
        </li>
        <li>
          <Users />
          <div>
            <strong>Cada um num gol</strong>
            <span>Vocês jogam um contra o outro</span>
          </div>
        </li>
        <li>
          <Hand />
          <div>
            <strong>Chute e defenda</strong>
            <span>Até três dedos por pessoa</span>
          </div>
        </li>
      </ol>

      <footer className="land-foot">
        <p>Gelo vs Brasa · arena de mesa</p>
        <Button asChild variant="outline" size="lg" className="land-cta-ghost">
          <Link to="/play">Entrar na partida</Link>
        </Button>
      </footer>
    </div>
  );
}
