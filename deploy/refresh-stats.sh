#!/bin/sh
# Keeps /srv/stats.json fresh while the container runs. A failed refresh keeps
# the previous file, so the page falls back to older (at worst build-time) stats.
set -u

lib=/usr/local/lib/landing
interval=${STATS_REFRESH_SECONDS:-3600}

while :; do
  if "$lib/sync-stats.sh" /srv/stats.json "$lib/stats.jq"; then
    echo "stats: refreshed"
  else
    echo "stats: refresh failed; serving previous stats" >&2
  fi
  sleep "$interval"
done
