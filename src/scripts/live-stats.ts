import {
  formatRepo,
  isSnapshot,
  languageBars,
  minute,
  type Snapshot,
} from "../data/format";

// The HTML carries the build-time stats. This swaps in the container's latest
// /stats.json when it is available and well-formed; otherwise nothing changes.

function set(selector: string, text: string) {
  document.querySelectorAll(selector).forEach((el) => (el.textContent = text));
}

function renderLanguages(data: Snapshot) {
  const list = document.querySelector("[data-lang-list]");
  const row =
    document.querySelector<HTMLTemplateElement>("#lang-row")?.content
      .firstElementChild;
  const rest = document.querySelector<HTMLElement>("[data-rest]");
  if (!list || !row || !rest) return;

  const bars = languageBars(data.languages);
  list.replaceChildren(
    ...bars.rows.map((bar) => {
      const li = row.cloneNode(true) as HTMLElement;
      li.dataset.lang = bar.name;
      li.style.setProperty("--pct", `${bar.pct}%`);
      li.querySelector(".name")!.textContent = bar.name;
      li.querySelector(".count")!.textContent = String(bar.repos);
      return li;
    }),
  );
  rest.hidden = bars.rest === 0;
  set('[data-stat="restRepos"]', String(bars.rest));
}

function apply(data: Snapshot) {
  set('[data-stat="publicRepos"]', String(data.publicRepos));
  set('[data-stat="generatedAt"]', minute(data.generatedAt));

  document
    .querySelectorAll<HTMLElement>("[data-repo][data-stat]")
    .forEach((el) => {
      const id = el.dataset.repo!;
      if (!Object.hasOwn(data.repos, id)) return;
      const shown: Record<string, string> = formatRepo(data.repos[id]);
      const value = shown[el.dataset.stat!];
      if (value !== undefined) el.textContent = value;
    });

  renderLanguages(data);
}

fetch("/stats.json", { cache: "no-cache" })
  .then((response) => (response.ok ? response.json() : undefined))
  .then((data) => isSnapshot(data) && apply(data))
  .catch(() => {});
