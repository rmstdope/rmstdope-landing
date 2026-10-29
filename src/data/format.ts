// Stats types and formatting shared by the build and the browser. This module
// must not import the snapshot, so the client bundle stays small.

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

const isTimestamp = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);

function isRepo(v: unknown): v is RepoStats {
  const r = v as RepoStats;
  return (
    typeof r === "object" &&
    r !== null &&
    Number.isInteger(r.stars) &&
    (r.language === null || typeof r.language === "string") &&
    isTimestamp(r.createdAt) &&
    isTimestamp(r.pushedAt)
  );
}

/** Full structural check, so a bad live file can never half-apply. */
export function isSnapshot(value: unknown): value is Snapshot {
  const v = value as Snapshot;
  return (
    typeof v === "object" &&
    v !== null &&
    isTimestamp(v.generatedAt) &&
    Number.isInteger(v.publicRepos) &&
    v.publicRepos > 0 &&
    Array.isArray(v.languages) &&
    v.languages.every(
      (l) => typeof l?.name === "string" && Number.isInteger(l?.repos),
    ) &&
    typeof v.repos === "object" &&
    v.repos !== null &&
    Object.values(v.repos).every(isRepo)
  );
}

/** `2026-10-29T01:15:37Z` → `2026-10-29`. */
export function day(iso: string): string {
  return iso.slice(0, 10);
}

/** `2026-10-29T01:15:37Z` → `2026-10-29 01:15Z`. */
export function minute(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}Z`;
}

/** The repo stats as displayed, keyed by their `data-stat` names. */
export function formatRepo(repo: RepoStats) {
  return {
    stars: String(repo.stars),
    language: repo.language ?? "—",
    pushed: day(repo.pushedAt),
  };
}

/**
 * The dossier's language bars: languages with at least two public repos (at
 * most `top`), plus the number of remaining repos, including those GitHub
 * detected no language for.
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
