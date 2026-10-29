import { github } from "./site";
import { statsFor } from "./stats";

export type Category = "emu" | "game" | "agent" | "demo";

export const categories: Record<Category, { code: string; label: string }> = {
  emu: { code: "EMU", label: "Emulation" },
  game: { code: "GAME", label: "Games" },
  agent: { code: "AGENT", label: "Agents & tools" },
  demo: { code: "DEMO", label: "Demoscene" },
};

interface Curated {
  id: string;
  category: Category;
  summary: string;
  tags: string[];
  /** Live deployment; must be an https://*.rmstdope.eu URL. */
  live?: string;
}

/** Featured repositories, in display order. Only public repos belong here. */
const curated: Curated[] = [
  {
    id: "neser",
    category: "emu",
    summary:
      "Nintendo emulation systems engine in Rust: NES, Game Boy/Color, Game Boy Advance and SNES, with native desktop and browser frontends sharing audio, video, input and save-state code.",
    tags: ["nes", "gameboy", "gba", "snes"],
    live: "https://neser.rmstdope.eu",
  },
  {
    id: "atlantis-hud",
    category: "game",
    summary:
      "A frontend for the play-by-email strategy game Atlantis, shipped both as a web app and as a desktop application.",
    tags: ["pbem", "desktop", "web"],
    live: "https://atlantis-hud.rmstdope.eu",
  },
  {
    id: "cerebro",
    category: "agent",
    summary:
      "Runs a fleet of AI coding agents on your repository: each piece of work is planned, built test-first in its own worktree, reviewed and merged, while you stay the navigator.",
    tags: ["ai-agents", "worktrees", "tui"],
  },
  {
    id: "raster",
    category: "emu",
    summary: "A high-level language for writing timing-critical NES ROMs.",
    tags: ["compiler", "nes", "6502"],
  },
  {
    id: "retroquest",
    category: "game",
    summary:
      "A retro-style text adventure built with AI. Runs in the browser; the engine and all acts were ported from Python to TypeScript in 2026.",
    tags: ["text-adventure", "browser"],
    live: "https://retroquest.rmstdope.eu",
  },
  {
    id: "audio-studio",
    category: "game",
    summary:
      "Audio tool for game narratives: casts voices by audition, records narration line by line and checks every take with Whisper.",
    tags: ["voice", "narration", "whisper"],
  },
  {
    id: "slidecraft",
    category: "agent",
    summary:
      "An MDX presentation framework with build steps, shared-element morphs, a browser editor and export to a single HTML file or PDF.",
    tags: ["mdx", "slides", "pdf"],
  },
  {
    id: "DDXX",
    category: "demo",
    summary: "Demo engine from Dope Demo Productions, imported to GitHub.",
    tags: ["demo-engine", "realtime"],
  },
  {
    id: "4k-softsynth",
    category: "demo",
    summary:
      "My old 4k softsynth, imported in an attempt to revive it: music synthesis small enough for a 4 kilobyte intro.",
    tags: ["4k", "synth", "sizecoding"],
  },
];

function checkLive(id: string, live: string | undefined) {
  if (live === undefined) return;
  const url = new URL(live);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".rmstdope.eu")) {
    throw new Error(
      `${id}: live URL must be https://*.rmstdope.eu, got ${live}`,
    );
  }
}

export const projects = curated.map((project, index) => {
  checkLive(project.id, project.live);
  const stats = statsFor(project.id);
  return {
    ...project,
    code: `P-${String(index + 1).padStart(2, "0")}`,
    categoryCode: categories[project.category].code,
    categoryLabel: categories[project.category].label,
    url: `${github}/${project.id}`,
    stars: stats.stars,
    language: stats.language ?? "—",
    since: stats.createdAt.slice(0, 4),
  };
});

export type Project = (typeof projects)[number];
