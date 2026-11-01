#!/usr/bin/env bash
# Deploys origin/main when it changed (run every minute by masterg-update.timer, as user masterg).
# Builds into a fresh release folder, switches the `current` symlink, restarts, checks the site answers,
# and rolls back if it doesn't. Class data and logs live in shared/ and survive every deploy.
# Waits while anyone used the app in the last 2 minutes, so a deploy never cuts off a live session.
set -euo pipefail
ROOT=/srv/masterg
exec 9>"$ROOT/.update.lock"
flock -n 9 || exit 0
cd "$ROOT/repo"
git fetch --quiet origin main
TARGET=$(git rev-parse origin/main)
CURRENT=$(readlink -f "$ROOT/current" 2>/dev/null | xargs -r basename || true)
[ "${1:-}" != "--force" ] && [ "$CURRENT" = "$TARGET" ] && exit 0
if [ "${1:-}" != "--force" ] && find "$ROOT/shared/logs" -name events.jsonl -mmin -2 | grep -q .; then
  echo "$(date -Is) live session in the last 2 min: deploy of ${TARGET:0:7} waits"
  exit 0
fi
REL="$ROOT/releases/$TARGET"
if [ ! -f "$REL/.built" ]; then
  rm -rf "$REL"
  git worktree prune
  git worktree add --quiet --detach "$REL" "$TARGET"
  ln -sfn "$ROOT/shared/.env.local" "$REL/.env.local"
  (cd "$REL" && npm ci --no-audit --no-fund --loglevel=error && NODE_OPTIONS=--max-old-space-size=1536 npx next build) > "$ROOT/shared/build-${TARGET:0:7}.log" 2>&1 || { echo "$(date -Is) build of ${TARGET:0:7} FAILED (see shared/build-${TARGET:0:7}.log); still serving ${CURRENT:0:7}"; exit 1; }
  # Link the shared data and logs only AFTER the build: the build traces the app's logs/ folder and fails on
  # links that point outside the release (deploy of e0223c1, 1 Nov).
  ln -sfn "$ROOT/shared/data" "$REL/data"
  ln -sfn "$ROOT/shared/logs" "$REL/logs"
  touch "$REL/.built"
fi
PREV=$(readlink -f "$ROOT/current" 2>/dev/null || true)
ln -sfn "$REL" "$ROOT/current"
sudo /usr/bin/systemctl restart masterg
for i in $(seq 1 30); do curl -fs -o /dev/null http://localhost:3000/ && break; sleep 2; done
if ! curl -fs -o /dev/null http://localhost:3000/; then
  echo "$(date -Is) ${TARGET:0:7} did not come up: rolling back to $(basename "${PREV:-none}" | cut -c1-7)"
  [ -n "$PREV" ] && ln -sfn "$PREV" "$ROOT/current" && sudo /usr/bin/systemctl restart masterg
  exit 1
fi
echo "$(date -Is) deployed ${TARGET:0:7}"
# keep the last 3 releases
ls -1dt "$ROOT"/releases/*/ | tail -n +4 | while read -r old; do git worktree remove --force "$old" 2>/dev/null || rm -rf "$old"; done
