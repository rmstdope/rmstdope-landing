import { day, languageBars, minute, type Snapshot } from "../data/stats";

// The HTML carries the build-time stats. This swaps in the container's latest
// /stats.json when it is available and well-formed; otherwise nothing changes.

function isSnapshot(value: unknown): value is Snapshot {
  const v = value as Snapshot;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.generatedAt === "string" &&
    Number.isInteger(v.publicRepos) &&
    Array.isArray(v.languages) &&
    v.languages.every(
      (l) => typeof l?.name === "string" && Number.isInteger(l?.repos),
    ) &&
    typeof v.repos === "object" &&
    v.repos !== null
  );
}

function set(selector: string, text: string) {
  document.querySelectorAll(selector).forEach((el) => (el.textContent = text));
}

function apply(data: Snapshot) {
  set('[data-stat="publicRepos"]', String(data.publicRepos));
  set('[data-stat="generatedAt"]', minute(data.generatedAt));

  document
    .querySelectorAll<HTMLElement>("[data-repo][data-stat]")
    .forEach((el) => {
      const id = el.dataset.repo!;
      const repo = Object.hasOwn(data.repos, id) ? data.repos[id] : undefined;
      if (!repo) return;
      const value = {
        stars: String(repo.stars),
        language: repo.language ?? "—",
        pushed: day(repo.pushedAt),
      }[el.dataset.stat!];
      if (value !== undefined) el.textContent = value;
    });

  // Update bars in place only when the same languages are ranked the same.
  const rows = document.querySelectorAll<HTMLElement>("[data-lang]");
  const bars = languageBars(data.languages);
  const sameOrder =
    rows.length === bars.rows.length &&
    bars.rows.every((bar, i) => rows[i].dataset.lang === bar.name);
  if (sameOrder) {
    set('[data-stat="restRepos"]', String(bars.rest));
    bars.rows.forEach((bar, i) => {
      rows[i].querySelector(".count")!.textContent = String(bar.repos);
      rows[i].style.setProperty("--pct", `${bar.pct}%`);
    });
  }
}

fetch("/stats.json", { cache: "no-cache" })
  .then((response) => (response.ok ? response.json() : undefined))
  .then((data) => isSnapshot(data) && apply(data))
  .catch(() => {});
