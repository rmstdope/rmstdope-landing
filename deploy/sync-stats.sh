#!/bin/sh
# Fetches public GitHub repository stats and atomically writes the snapshot.
# Usage: sync-stats.sh OUTPUT [FILTER]
# Unauthenticated: one request per run, well inside GitHub's 60/hour limit.
set -eu

out=$1
filter=${2:-$(dirname "$0")/stats.jq}
url="https://api.github.com/users/rmstdope/repos?per_page=100&type=owner"

tmp=$(mktemp "$out.XXXXXX")
trap 'rm -f "$tmp" "$tmp.api"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsS --max-time 30 -A rmstdope-landing \
    -H "Accept: application/vnd.github+json" -o "$tmp.api" "$url"
else
  wget -q -T 30 -U rmstdope-landing \
    --header "Accept: application/vnd.github+json" -O "$tmp.api" "$url"
fi

jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" -f "$filter" "$tmp.api" >"$tmp"
chmod 644 "$tmp"
mv "$tmp" "$out"
