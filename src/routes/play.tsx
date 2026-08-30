import { createFileRoute } from "@tanstack/react-router";
import { GolAGol } from "@/components/game/GolAGol";
import type { Mode } from "@/game/types";

type PlaySearch = { go?: Mode };

export const Route = createFileRoute("/play")({
  component: Play,
  validateSearch: (raw: Record<string, unknown>): PlaySearch => ({
    go: raw.go === "bot" || raw.go === "versus" ? raw.go : undefined,
  }),
  head: () => ({
    meta: [{ title: "Jogar · Gol a Gol" }],
  }),
});

function Play() {
  const { go } = Route.useSearch();
  return <GolAGol start={go} />;
}
