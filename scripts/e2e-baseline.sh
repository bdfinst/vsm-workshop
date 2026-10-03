#!/bin/sh
# Regenerates the visual baselines in the Playwright image CI uses, then checks
# them against the production build the way CI serves it.
#
# It works from a copy of the repo with its own `npm ci`, so it also runs on a
# Mac: the host node_modules has no Linux build of esbuild or rollup, and the
# container could not start a dev server or a build from it.
#
# Usage: scripts/e2e-baseline.sh [spec-filter]     (default: visual.spec.js)
# Set DOCKER_DEFAULT_PLATFORM (for example linux/amd64) to run the image for another
# architecture than the host's, as CI does on x86 runners.
#
# Keep IMAGE in sync with .github/workflows/ci.yml and @playwright/test in
# package.json. Renovate bumps all three together (see renovate.json).
set -eu

IMAGE='mcr.microsoft.com/playwright:v1.58.2-noble@sha256:6446946a1d9fd62d9ae501312a2d76a43ee688542b21622056a372959b65d63d'
SPEC="${1:-visual.spec.js}"

REPO=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d "${TMPDIR:-/tmp}/e2e-baseline.XXXXXX")
trap 'rm -rf "$WORK"' EXIT INT TERM

# Containers create files as root on a Linux host; hand them back so the cleanup
# above can remove them. Harmless on Docker Desktop.
OWNER="$(id -u):$(id -g)"

echo "==> Copying the repo to $WORK"
rsync -a \
  --exclude '/node_modules' \
  --exclude '/dist' \
  --exclude '/dist-standalone' \
  --exclude '/.git' \
  --exclude '/.claude/worktrees' \
  --exclude '/test-results' \
  --exclude '/playwright-report' \
  "$REPO"/ "$WORK"/

# Each container command ends by handing the files back to the host user, so the
# cleanup can remove them on a Linux host (the container runs as root).
echo "==> Regenerating baselines for $SPEC"
docker run --rm --ipc=host \
  -e SPEC="$SPEC" -e OWNER="$OWNER" \
  -v "$WORK":/work -w /work \
  "$IMAGE" sh -c 'npm ci && npx playwright test "$SPEC" --update-snapshots; status=$?; chown -R "$OWNER" /work; exit $status'

echo "==> Copying the snapshots back"
for dir in "$WORK"/tests/e2e/*-snapshots; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  mkdir -p "$REPO/tests/e2e/$name"
  cp "$dir"/*.png "$REPO/tests/e2e/$name"/
done

# CI=1 makes Playwright serve the production build with `vite preview`, as CI does.
echo "==> Confirming against the production build (CI mode)"
if ! docker run --rm --ipc=host \
  -e SPEC="$SPEC" -e OWNER="$OWNER" \
  -v "$WORK":/work -w /work \
  "$IMAGE" sh -c 'export CI=1; npm run build && npm run build:standalone && npx playwright test "$SPEC"; status=$?; chown -R "$OWNER" /work; exit $status'
then
  echo 'The regenerated baselines fail against the production build. They are copied into the repo but should not be committed.' >&2
  exit 1
fi

echo '==> Done. Review the changed snapshots and commit them.'
