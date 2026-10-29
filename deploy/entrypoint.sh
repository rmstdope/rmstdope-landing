#!/bin/sh
# Runs the stats refresher beside Caddy. Other commands (a shell, `caddy
# version`, ...) run without it.
set -eu

if [ "${1:-}" = caddy ]; then
  /usr/local/lib/landing/refresh-stats.sh &
fi
exec "$@"
