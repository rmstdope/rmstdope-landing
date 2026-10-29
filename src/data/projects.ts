import type { ImageMetadata } from "astro";
import { github, liveUrl } from "./site";
import { formatRepo } from "./format";
import { statsFor } from "./stats";

export type Category = "emu" | "game" | "agent" | "demo";

export const categories: Record<Category, { code: string }> = {
  emu: { code: "EMU" },
  game: { code: "GAME" },
  agent: { code: "AGENT" },
  demo: { code: "DEMO" },
};

interface Curated {
  id: string;
  category: Category;
  summary: string;
  tags: string[];
  /** Live deployment; must be an https://*.rmstdope.eu URL. */
  live?: string;
  /** Kept with its data and screenshots, but left out of the page for now. */
  hidden?: boolean;
}

/** Featured repositories, in display order. Only public repos belong here. */
const curated: Curated[] = [
  {
    id: "neser",
    category: "emu",
    summary:
      "Nintendo emulation systems engine in Rust focused on hardware accuracy and compatibility: NES, Game Boy/Color, Game Boy Advance and SNES, with native desktop and browser frontends sharing audio, video, input and save-state code.",
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
    hidden: true,
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
      "My old 4k softsynth, imported in an attempt to port it to arm64 assembler: music synthesis small enough for a 4 kilobyte intro.",
    tags: ["4k", "synth", "sizecoding"],
  },
];

function checkLive(id: string, live: string | undefined) {
  if (live !== undefined && !liveUrl.test(live)) {
    throw new Error(
      `${id}: live URL must be https://<name>.rmstdope.eu, got ${live}`,
    );
  }
}

// Screenshots are optional: src/assets/screenshots/<repo id><n>.png (or .jpg,
// .webp), matched case-insensitively and shown in order of n. A file that
// matches no featured repository, or a repeated number, fails the build.
const screenshotFiles = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/screenshots/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP}",
  { eager: true },
);

const screenshots = new Map<string, { n: number; image: ImageMetadata }[]>();
for (const [path, module] of Object.entries(screenshotFiles)) {
  const name = path
    .split("/")
    .pop()!
    .replace(/\.[^.]+$/, "")
    .toLowerCase();
  const match = /^(.+?)(\d+)$/.exec(name);
  const id = match?.[1];
  if (!id || !curated.some((project) => project.id.toLowerCase() === id)) {
    throw new Error(`${path} must be named <featured repository id><number>`);
  }
  const n = Number(match[2]);
  const shots = screenshots.get(id) ?? [];
  if (shots.some((shot) => shot.n === n)) {
    throw new Error(`more than one screenshot ${n} for ${id}`);
  }
  screenshots.set(id, [...shots, { n, image: module.default }]);
}

function screenshotsFor(id: string) {
  return (screenshots.get(id.toLowerCase()) ?? [])
    .sort((a, b) => a.n - b.n)
    .map((shot) => shot.image);
}

// Validate every project, shown or not, so hidden ones stay ready to return.
curated.forEach((project) => {
  checkLive(project.id, project.live);
  statsFor(project.id);
});

export const projects = curated
  .filter((project) => !project.hidden)
  .map((project, index) => {
    const stats = statsFor(project.id);
    return {
      ...project,
      code: `P-${String(index + 1).padStart(2, "0")}`,
      categoryCode: categories[project.category].code,
      url: `${github}/${project.id}`,
      ...formatRepo(stats),
      since: stats.createdAt.slice(0, 4),
      screenshots: screenshotsFor(project.id),
    };
  });

export type Project = (typeof projects)[number];
