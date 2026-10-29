import snapshot from "./github-stats.json";

export interface RepoStats {
  stars: number;
  language: string | null;
  createdAt: string;
  pushedAt: string;
}

const repos: Record<string, RepoStats> = snapshot.repos;

/** Public repository count, from the committed GitHub snapshot. */
export const publicRepos = snapshot.publicRepos;

/** Public repositories per primary language, most common first. */
export const languages = snapshot.languages;

/**
 * Stats for a repository. The snapshot only contains public, non-fork repos,
 * so a missing entry fails the build instead of featuring a private repo.
 */
export function statsFor(id: string): RepoStats {
  const stats = repos[id];
  if (!stats) {
    throw new Error(`${id} is not a public repository in github-stats.json`);
  }
  return stats;
}
