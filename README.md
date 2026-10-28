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
```

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
