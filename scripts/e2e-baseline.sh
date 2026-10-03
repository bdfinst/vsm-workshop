#!/bin/sh
# Regenerates the visual baselines in the Playwright image CI uses, then checks
# them against the production build the way CI serves it. The baselines reach the
# working tree only after that check passes.
#
# It works from a copy of the repo with its own `npm ci`, so it also runs on a
# Mac: the host node_modules has no Linux build of esbuild or rollup. The copy
# holds the files git tracks (the ones deleted in the working tree are skipped)
# and the files git shows as untracked and not ignored, except untracked .env*
# entries, so local env files and ignored tooling state never enter the container
# mount. Tracked .env* files stay, so the build matches CI. Any rsync error is
# fatal.
#
# Usage: scripts/e2e-baseline.sh [spec-filter]     (default: visual.spec.js)
#
# Platform: the image runs as linux/amd64, as it does on CI's runners, so the
# baselines match CI. On Apple Silicon that is emulation and is slow. Set
# DOCKER_DEFAULT_PLATFORM=linux/arm64 to run natively; the baselines then will
# not match CI, so do not commit them.
#
# Only *-snapshots/*.png files under tests/e2e are copied back, and only after
# every one passes a path check (see scripts/e2e-baseline-lib.sh): a safe name,
# and no symlink in the work copy's tests/e2e or on the way to the destination in
# the repo. Each file is written to a temp name and renamed over the destination.
#
# On failure, including a refused copy-back, the repo is left untouched and the
# Playwright output (test-results, playwright-report) is copied to a new temp
# directory whose path is printed.
#
# Keep IMAGE in sync with .github/workflows/ci.yml and @playwright/test in
# package.json. Renovate bumps all three together (see renovate.json).
set -eu

IMAGE='mcr.microsoft.com/playwright:v1.58.2-noble@sha256:6446946a1d9fd62d9ae501312a2d76a43ee688542b21622056a372959b65d63d'
PLATFORM="${DOCKER_DEFAULT_PLATFORM:-linux/amd64}"
SPEC="${1:-visual.spec.js}"

REPO=$(cd "$(dirname "$0")/.." && pwd)
LIB="$REPO/scripts/e2e-baseline-lib.sh"
# shellcheck source=scripts/e2e-baseline-lib.sh
. "$LIB"
WORK=''
LIST=''
trap 'rm -rf "$WORK" "$LIST"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
WORK=$(mktemp -d "${TMPDIR:-/tmp}/e2e-baseline.XXXXXX")
LIST=$(mktemp "${TMPDIR:-/tmp}/e2e-baseline-files.XXXXXX")

# Container hardening, shared by both runs:
#   --cap-drop=ALL, no-new-privileges  nothing here needs a capability.
#   --user <host user>, HOME=/tmp      no root in the container, so no chown back
#                                      and no root-owned files in the temp copy.
#                                      Playwright starts Chromium with --no-sandbox
#                                      by default, so this works under Docker's
#                                      default seccomp profile.
#   --shm-size=1g                      Chromium needs more than Docker's 64m
#                                      /dev/shm; this replaces --ipc=host.
#   --init                             reaps browser processes and passes Ctrl-C on.
# The confirmation run adds --network none: the build and `vite preview` need no
# network once node_modules exists.

echo "==> Copying the repo files to $WORK"
bl_file_list "$REPO" "$LIST" || exit 1
rsync -a --from0 --files-from="$LIST" \
  --exclude '/node_modules' \
  --exclude '/dist' \
  --exclude '/dist-standalone' \
  --exclude '/.git' \
  --exclude '/.claude/worktrees' \
  --exclude '/test-results' \
  --exclude '/playwright-report' \
  "$REPO"/ "$WORK"/

# Keeps the Playwright output outside the repo and the temp copy, and says where.
save_evidence() {
  EVIDENCE=$(mktemp -d "${TMPDIR:-/tmp}/e2e-baseline-evidence.XXXXXX")
  for name in test-results playwright-report; do
    if [ -d "$WORK/$name" ]; then
      cp -R -P "$WORK/$name" "$EVIDENCE"/
    fi
  done
  echo "Playwright output kept in $EVIDENCE" >&2
}

echo "==> Regenerating baselines for $SPEC ($PLATFORM)"
if ! docker run --rm --init --platform "$PLATFORM" \
  --cap-drop=ALL --security-opt no-new-privileges --shm-size=1g \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e SPEC="$SPEC" \
  -v "$WORK":/work -w /work \
  "$IMAGE" sh -c 'npm ci && npx playwright test "$SPEC" --update-snapshots'
then
  echo 'Regenerating the baselines failed. The repo is untouched.' >&2
  save_evidence
  exit 1
fi

# CI=1 makes Playwright serve the production build with `vite preview`, as CI does.
echo "==> Confirming against the production build (CI mode, no network)"
if ! docker run --rm --init --platform "$PLATFORM" \
  --cap-drop=ALL --security-opt no-new-privileges --shm-size=1g \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  --network none \
  -e SPEC="$SPEC" \
  -v "$WORK":/work -w /work \
  "$IMAGE" sh -c 'export CI=1; npm run build && npm run build:standalone && npx playwright test "$SPEC"'
then
  echo 'The regenerated baselines fail against the production build. The repo is untouched.' >&2
  save_evidence
  exit 1
fi

echo "==> Copying the confirmed snapshots back"
if ! bl_copy_back "$WORK" "$REPO" "$LIB"; then
  echo 'The snapshots were not copied back. The repo is untouched.' >&2
  save_evidence
  exit 1
fi

echo '==> Done. Review the changed snapshots and commit them.'
