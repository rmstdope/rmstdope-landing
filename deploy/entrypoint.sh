#!/bin/sh
# Runs the stats refresher beside the main process (Caddy by default).
set -eu

/usr/local/lib/landing/refresh-stats.sh &
exec "$@"
