#!/bin/sh
# Exercises the helpers of scripts/e2e-baseline.sh without Docker: the copy-back
# against hostile file names and symlinks, and the file list handed to rsync.
# Usage: sh tests/shell/e2e-baseline-copy-back.sh      (not part of `npm test`)
set -u

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
LIB="$ROOT/scripts/e2e-baseline-lib.sh"
# shellcheck source=scripts/e2e-baseline-lib.sh
. "$LIB"

NL='
'
SANDBOX=$(mktemp -d "${TMPDIR:-/tmp}/e2e-baseline-test.XXXXXX")
trap 'rm -rf "$SANDBOX"' EXIT
failures=0
total=0

pass() { total=$((total + 1)); echo "ok   - $1"; }
fail() { total=$((total + 1)); failures=$((failures + 1)); echo "FAIL - $1"; }

# Fresh WORK (the copy the container wrote) and REPO, each with a normal snapshot in WORK.
setup() {
  rm -rf "$SANDBOX/work" "$SANDBOX/repo" "$SANDBOX/victim"
  mkdir -p "$SANDBOX/work/tests/e2e/visual.spec.js-snapshots" "$SANDBOX/repo/tests/e2e"
  printf 'new png' >"$SANDBOX/work/tests/e2e/visual.spec.js-snapshots/ok.png"
  printf 'victim' >"$SANDBOX/victim"
  WORK=$SANDBOX/work
  REPO=$SANDBOX/repo
}

# Runs the copy-back; stderr is kept in $SANDBOX/err.
run_copy_back() { bl_copy_back "$WORK" "$REPO" "$LIB" 2>"$SANDBOX/err"; }

repo_has_no_png() { [ -z "$(find "$REPO" -type f -name '*.png' -print)" ]; }

expect_refused() {
  if run_copy_back; then fail "$1 (was copied)"; return; fi
  if ! repo_has_no_png; then fail "$1 (repo touched)"; return; fi
  pass "$1"
}

setup
if run_copy_back && [ "$(cat "$REPO/tests/e2e/visual.spec.js-snapshots/ok.png")" = 'new png' ]; then
  pass 'a normal snapshot PNG is copied'
else
  fail 'a normal snapshot PNG is copied'
fi
if [ -n "$(find "$REPO" -name '.e2e-baseline.*' -print)" ]; then
  fail 'no temp file is left behind'
else
  pass 'no temp file is left behind'
fi

setup
mkdir -p "$WORK/tests/e2e/${NL}x-snapshots"
printf 'x' >"$WORK/tests/e2e/${NL}x-snapshots/a.png"
expect_refused 'a directory named with a newline and x-snapshots is refused, with the normal PNG held back too'

setup
printf 'x' >"$WORK/tests/e2e/visual.spec.js-snapshots/helpers.js${NL}.png"
expect_refused 'a file named helpers.js, newline, .png is refused'

setup
mkdir -p "$SANDBOX/elsewhere/visual.spec.js-snapshots"
printf 'x' >"$SANDBOX/elsewhere/visual.spec.js-snapshots/ok.png"
rm -rf "$WORK/tests/e2e"
ln -s "$SANDBOX/elsewhere" "$WORK/tests/e2e"
expect_refused 'a symlinked tests/e2e in the work copy is refused'
rm -rf "$SANDBOX/elsewhere"

setup
mv "$WORK/tests" "$SANDBOX/real-tests"
ln -s "$SANDBOX/real-tests" "$WORK/tests"
expect_refused 'a symlinked tests in the work copy is refused'
rm -rf "$SANDBOX/real-tests"

setup
mkdir -p "$REPO/tests/e2e/visual.spec.js-snapshots"
ln -s "$SANDBOX/victim" "$REPO/tests/e2e/visual.spec.js-snapshots/ok.png"
if run_copy_back; then
  fail 'a destination symlink is refused'
elif [ "$(cat "$SANDBOX/victim")" = victim ] && [ -L "$REPO/tests/e2e/visual.spec.js-snapshots/ok.png" ]; then
  pass 'a destination symlink is refused, and the file it points to is not written'
else
  fail 'a destination symlink is refused, and the file it points to is not written'
fi

setup
mkdir -p "$SANDBOX/victim-dir"
ln -s "$SANDBOX/victim-dir" "$REPO/tests/e2e/visual.spec.js-snapshots"
if run_copy_back; then
  fail 'a symlinked parent directory in the repo is refused'
elif [ -z "$(find "$SANDBOX/victim-dir" -type f -print)" ]; then
  pass 'a symlinked parent directory in the repo is refused'
else
  fail 'a symlinked parent directory in the repo is refused'
fi
rm -rf "$SANDBOX/victim-dir"

setup
mkdir -p "$REPO/tests/e2e/visual.spec.js-snapshots/ok.png"
expect_refused 'a directory where the destination file should go is refused'
rm -rf "$REPO/tests/e2e"

# `..` cannot come out of find, so the check is called directly.
setup
for rel in 'tests/e2e/../x-snapshots/a.png' 'tests/e2e/a-snapshots/../../../b.png' 'tests/e2e/a-snapshots/..' '../tests/e2e/a-snapshots/b.png'; do
  if bl_check_candidate "$REPO" "$rel" 2>/dev/null; then
    fail "a '..' path is refused: $rel"
  else
    pass "a '..' path is refused: $rel"
  fi
done
for rel in 'tests/e2e/a-snapshots/b.txt' 'tests/other/a-snapshots/b.png' 'tests/e2e/a/b.png' 'tests/e2e/a-snapshots/b c.png'; do
  if bl_check_candidate "$REPO" "$rel" 2>/dev/null; then
    fail "a path outside the pattern is refused: $rel"
  else
    pass "a path outside the pattern is refused: $rel"
  fi
done

# The file list for rsync: a tracked file deleted in the working tree is
# dropped, an untracked .env* is dropped, a tracked .env* stays, and a name with
# a newline survives.
GITDIR=$SANDBOX/gitrepo
mkdir -p "$GITDIR/sub"
git -C "$GITDIR" init -q
git -C "$GITDIR" config user.email t@example.com
git -C "$GITDIR" config user.name t
printf 'x' >"$GITDIR/kept.txt"
printf 'x' >"$GITDIR/gone.txt"
printf 'x' >"$GITDIR/.env.example"
printf 'x' >"$GITDIR/sub/odd${NL}name.txt"
git -C "$GITDIR" add -A
git -C "$GITDIR" commit -q -m init
rm "$GITDIR/gone.txt"
printf 'x' >"$GITDIR/new.txt"
printf 'x' >"$GITDIR/.env"
printf 'x' >"$GITDIR/.env.local"
printf 'x' >"$GITDIR/sub/.env.production"
printf 'x' >"$GITDIR/environment.txt"
bl_file_list "$GITDIR" "$SANDBOX/list" || fail 'the file list is built'
has() { tr '\0' '\n' <"$SANDBOX/list" | grep -qxF -- "$1"; }
if has kept.txt && has new.txt && has .env.example && has environment.txt && has "sub/odd"; then
  pass 'tracked, untracked, tracked .env* and a lookalike name are listed; a newline in a name survives'
else
  fail 'tracked, untracked, tracked .env* and a lookalike name are listed; a newline in a name survives'
fi
if has gone.txt; then fail 'a tracked file deleted in the working tree is dropped'; else pass 'a tracked file deleted in the working tree is dropped'; fi
if has .env || has .env.local || has sub/.env.production; then
  fail 'untracked .env* files are dropped'
else
  pass 'untracked .env* files are dropped'
fi
if [ "$(tr -cd '\0' <"$SANDBOX/list" | wc -c | tr -d ' ')" = 5 ]; then
  pass 'the list holds exactly kept, new, .env.example, environment and the odd name'
else
  fail 'the list holds exactly kept, new, .env.example, environment and the odd name'
fi

echo "$((total - failures))/$total passed"
[ "$failures" -eq 0 ]
