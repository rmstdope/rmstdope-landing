#!/bin/sh
# Checks the stats transform against fixtures, including rejected responses.
set -eu

dir=$(dirname "$0")
transform() {
  jq --arg now 2026-01-01T00:00:00Z -f "$dir/stats.jq" "$@"
}

actual=$(transform "$dir/fixtures/repos.json")
expected=$(jq . "$dir/fixtures/stats.json")
if [ "$actual" != "$expected" ]; then
  echo "stats transform output differs from fixtures/stats.json:" >&2
  printf '%s\n' "$actual" >&2
  exit 1
fi
# Object keys must keep the case-insensitive order, not just the same content.
[ "$(printf '%s' "$actual" | jq -c '.repos | keys_unsorted')" = '["Alpha","beta","gamma","zeta"]' ]

for bad in '{"message": "API rate limit exceeded"}' '[]' \
  "$(jq -n '[range(100) | {name: "r\(.)", fork: false, private: false}]')"; do
  if printf '%s' "$bad" | transform >/dev/null 2>&1; then
    echo "stats transform accepted a bad response: $(printf '%s' "$bad" | head -c 60)" >&2
    exit 1
  fi
done
echo "stats transform: ok"
