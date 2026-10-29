# Turns GitHub's /users/<user>/repos response into the page's stats snapshot.
# Only public, non-fork repositories are kept. Run with --arg now <timestamp>.
if type != "array" then
  error("unexpected GitHub response: \(.message? // type)")
elif length >= 100 then
  error("100 or more repositories: add pagination to sync-stats.sh")
else
  [.[] | select((.fork | not) and (.private | not))]
end
| if length == 0 then error("no public repositories") else . end
| {
    generatedAt: $now,
    publicRepos: length,
    languages: (
      group_by(.language // "Other")
      | map({name: (.[0].language // "Other"), repos: length})
      | sort_by(-.repos, .name)
    ),
    repos: (
      sort_by(.name | ascii_downcase)
      | map({
          key: .name,
          value: {
            stars: .stargazers_count,
            language: .language,
            createdAt: .created_at,
            pushedAt: .pushed_at
          }
        })
      | from_entries
    )
  }
