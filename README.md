# rmstdope-landing

The landing page for [rmstdope.eu](https://rmstdope.eu), built with
[Astro](https://astro.build) as a fully static site and served by Caddy.
It is deployed by [rmstdope-infra](https://github.com/rmstdope/rmstdope-infra)
as the `landing` app.

## Development

Requires Node.js 24.

```sh
npm install
npm run dev           # local dev server
npm run check         # Astro/TypeScript checks
npm run format:check  # Prettier
npm run build         # static output in dist/
npm run test:e2e      # build, then Playwright + axe (desktop and Pixel 7)
```

Install the test browser once with `npx playwright install chromium`.

## Structure

- `src/pages/index.astro` composes the page from `src/components/`.
- `src/styles/global.css` holds the design tokens (colors, fonts, spacing) and
  the reduced-motion override; fonts are self-hosted via Fontsource (Latin subset).
- `src/data/projects.ts` lists the featured repositories with curated summaries,
  tags and live URLs (which must be `https://*.rmstdope.eu`). Only public repos belong there.
- `src/data/github-stats.json` is a snapshot of public repo stats (stars, language,
  dates); a featured repo missing from it fails the build. Refresh it with
  `npm run sync` (needs `jq` and `curl`).

## Screenshots and share image

Project screenshots are optional. Add `src/assets/screenshots/<repo id>.png`
(16:9, at least 1600×900; the id as in `src/data/projects.ts`, e.g. `neser.png`).
The build resizes them to WebP; a file that matches no featured repo fails the
build, and projects without one keep the radar placeholder.

`public/og.png` is the social share image. Regenerate it with `npm run og`
after changing the name, tagline or palette.

## Production image

The `Dockerfile` builds the site and copies `dist/` into a `caddy` image that
follows the rmstdope-infra static app contract:

- listens on `0.0.0.0:8080`
- `/healthz` returns `ok`
- `/release.json` contains `{"revision":"<commit SHA>"}` (from the `VCS_REF` build arg)
- HTML and `/release.json` revalidate; hashed `/_astro/*` assets are cached immutably

To smoke-test an image locally (requires Docker):

```sh
docker build --build-arg VCS_REF="$(git rev-parse HEAD)" -t rmstdope-landing:smoke .
python3 deploy/test_container.py rmstdope-landing:smoke --revision "$(git rev-parse HEAD)"
```

## Live GitHub stats

`deploy/sync-stats.sh` fetches the public repo list from the GitHub API (one
unauthenticated request) and runs `deploy/stats.jq`, which keeps only public,
non-fork repos and writes the snapshot atomically. `deploy/test_stats.sh`
checks the transform against fixtures.

The same script runs in two places:

- **Build time:** `npm run sync` updates the committed snapshot. The build bakes
  it into the HTML and serves it as `/stats.json`.
- **In the container:** `deploy/entrypoint.sh` starts `deploy/refresh-stats.sh`
  beside Caddy. It rewrites `/srv/stats.json` at startup and then hourly
  (`STATS_REFRESH_SECONDS`). A failed refresh keeps the previous file.

In the browser, `src/scripts/live-stats.ts` fetches `/stats.json` and updates
the repo count, stars, languages, last push and sync time. A missing or
malformed response leaves the build-time numbers in place.

## CI and deployment

`.github/workflows/ci.yml` runs checks and the container smoke test on every
push and pull request. On pushes to `main` it then publishes
`ghcr.io/rmstdope/rmstdope-landing` and uploads the `deployment-manifest`
artifact. The rmstdope-infra poller on the VPS picks up the newest successful
`main` build automatically (intermediate commits may be superseded).

### One-time setup

1. Create a DNS A (and AAAA, if used) record for the apex `rmstdope.eu` pointing at the VPS.
2. After the first `main` build, set the `rmstdope-landing` GHCR package visibility to **public**.
3. Add `rmstdope/rmstdope-landing` to the VPS GitHub token's selected repositories
   (Contents read, Actions read).
4. Register, release and enable automatic updates from an rmstdope-infra operator checkout:

```sh
rmstdope-deploy app register landing \
  --repository rmstdope/rmstdope-landing \
  --image-repository ghcr.io/rmstdope/rmstdope-landing \
  --domain rmstdope.eu
rmstdope-deploy validate landing
rmstdope-deploy release landing --latest
rmstdope-deploy auto enroll landing
rmstdope-deploy auto resume landing
```
