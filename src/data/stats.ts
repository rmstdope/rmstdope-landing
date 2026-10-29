import { isSnapshot, type RepoStats, type Snapshot } from "./format";
import snapshot from "./github-stats.json";

if (!isSnapshot(snapshot)) {
  throw new Error("src/data/github-stats.json is malformed; run npm run sync");
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
