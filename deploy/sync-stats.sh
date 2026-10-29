#!/bin/sh
# Fetches public GitHub repository stats and atomically writes the snapshot.
# Usage: sync-stats.sh OUTPUT [FILTER]
# Unauthenticated: one request per run, well inside GitHub's 60/hour limit.
set -eu

out=$1
filter=${2:-$(dirname "$0")/stats.jq}
url="https://api.github.com/users/rmstdope/repos?per_page=100&type=owner"

# Work outside the output directory: in the container that is Caddy's web root.
tmp=$(mktemp "${TMPDIR:-/tmp}/stats.XXXXXX")
api=$tmp.api
trap 'rm -f "$tmp" "$api"' EXIT
trap 'exit 1' INT TERM

if command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 30 -A rmstdope-landing \
    -H "Accept: application/vnd.github+json" -o "$api" "$url"
else
  wget -q -T 30 -U rmstdope-landing \
    --header "Accept: application/vnd.github+json" -O "$api" "$url"
fi

jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" -f "$filter" "$api" >"$tmp"
chmod 644 "$tmp"
# Same filesystem in the container, so this is an atomic rename.
mv "$tmp" "$out"
