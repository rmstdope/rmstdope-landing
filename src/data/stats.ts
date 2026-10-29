import snapshot from "./github-stats.json";

export interface RepoStats {
  stars: number;
  language: string | null;
  createdAt: string;
  pushedAt: string;
}

export interface Language {
  name: string;
  repos: number;
}

/** The shape of github-stats.json and of the live /stats.json. */
export interface Snapshot {
  generatedAt: string;
  publicRepos: number;
  languages: Language[];
  repos: Record<string, RepoStats>;
}

export const stats: Snapshot = snapshot;

/**
 * Stats for a repository. The snapshot only contains public, non-fork repos,
 * so a missing entry fails the build instead of featuring a private repo.
 */
export function statsFor(id: string): RepoStats {
  const repo = Object.hasOwn(stats.repos, id) ? stats.repos[id] : undefined;
  if (!repo) {
    throw new Error(`${id} is not a public repository in github-stats.json`);
  }
  return repo;
}

/** `2026-10-29T01:15:37Z` → `2026-10-29`. */
export function day(iso: string): string {
  return iso.slice(0, 10);
}

/** `2026-10-29T01:15:37Z` → `2026-10-29 01:15Z`. */
export function minute(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}Z`;
}

/**
 * The dossier's language bars: languages with at least two public repos (at
 * most `top`), plus the number of repos left over in other languages.
 */
export function languageBars(languages: Language[], top = 5) {
  const rows = languages
    .filter(({ name, repos }) => name !== "Other" && repos >= 2)
    .slice(0, top);
  const total = languages.reduce((sum, { repos }) => sum + repos, 0);
  const rest = total - rows.reduce((sum, { repos }) => sum + repos, 0);
  const max = Math.max(1, ...rows.map(({ repos }) => repos));
  return {
    rows: rows.map((row) => ({
      ...row,
      pct: Math.round((row.repos / max) * 100),
    })),
    rest,
  };
}
