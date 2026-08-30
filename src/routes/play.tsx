import { createFileRoute } from "@tanstack/react-router";
import { GolAGol } from "@/components/game/GolAGol";

export const Route = createFileRoute("/play")({
  component: Play,
  head: () => ({
    meta: [{ title: "Jogar · Gol a Gol" }],
  }),
});

function Play() {
  return <GolAGol />;
}
