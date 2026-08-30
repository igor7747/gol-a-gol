import { Link } from "@tanstack/react-router";
import { Hand, Smartphone, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Landing() {
  return (
    <div className="land">
      <section className="land-hero-art">
        <img
          src="/art/hero.jpg"
          alt="Arena de mesa: Gelo e Brasa no gramado"
        />
        <div className="land-hero-shade" />
        <div className="land-hero-copy">
          <p className="land-kicker">Dois jogadores · um celular</p>
          <h1 className="land-title">Gol a Gol</h1>
          <p className="land-lead">
            Deite o celular na mesa. Cada um num gol. O dedo defende e chuta
            ao mesmo tempo.
          </p>
          <Button asChild size="xl" className="land-cta">
            <Link to="/play" search={{ go: "versus" }}>
              <Zap />
              Jogar agora
            </Link>
          </Button>
        </div>
      </section>

      <section className="land-teams" aria-label="Times">
        <article className="land-team land-brasa">
          <img src="/art/brasa.jpg" alt="" className="land-crest" />
          <div>
            <span className="land-team-name">Brasa</span>
            <span className="land-team-note">Um extremo do campo</span>
          </div>
        </article>
        <article className="land-team land-gelo">
          <img src="/art/gelo.jpg" alt="" className="land-crest" />
          <div>
            <span className="land-team-name">Gelo</span>
            <span className="land-team-note">O gol de frente</span>
          </div>
        </article>
      </section>

      <figure className="land-shot">
        <img
          src="/art/mesa.jpg"
          alt="Celular deitado na mesa, um jogador em cada ponta"
        />
      </figure>

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
        <div className="land-foot-actions">
          <Button asChild size="lg">
            <Link to="/play" search={{ go: "versus" }}>
              Dois jogadores
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/play" search={{ go: "bot" }}>
              Contra o bot
            </Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
