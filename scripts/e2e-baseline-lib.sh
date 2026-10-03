# shellcheck shell=sh
# Helpers for scripts/e2e-baseline.sh. Sourced, never run; POSIX sh.
# They live here so tests/shell/e2e-baseline-copy-back.sh can exercise them
# without Docker.

# Prints an error and returns 1.
bl_refuse() {
  echo "e2e-baseline: refusing: $*" >&2
  return 1
}

# Writes to $2 the NUL-separated list of files to copy into the container: what
# git tracks, plus what it shows as untracked and not ignored, minus tracked
# files deleted in the working tree (there is nothing to copy for them) and minus
# untracked .env* entries (a tracked .env* file stays, so the build matches CI).
#
# Newline and NUL are swapped (newline -> \001, NUL -> newline) so grep can work
# on the names line by line, then swapped back. A name that holds a \001 byte
# decodes to a different name, which rsync then cannot find and fails on.
# Usage: bl_file_list REPO OUTFILE
bl_file_list() {
  bl_repo=$1
  bl_out=$2
  bl_tmp=$(mktemp -d "${TMPDIR:-/tmp}/e2e-baseline-list.XXXXXX") || return 1

  git -C "$bl_repo" ls-files -z --deleted | tr '\n\0' '\001\n' >"$bl_tmp/deleted" || return 1
  git -C "$bl_repo" ls-files -z --cached | tr '\n\0' '\001\n' >"$bl_tmp/cached" || return 1
  git -C "$bl_repo" ls-files -z --others --exclude-standard | tr '\n\0' '\001\n' >"$bl_tmp/others" || return 1

  # grep exits 1 when it selects nothing, which is fine here; 2 or more is an error.
  if [ -s "$bl_tmp/deleted" ]; then
    grep -vxF -f "$bl_tmp/deleted" "$bl_tmp/cached" >"$bl_tmp/tracked"
    [ $? -le 1 ] || return 1
  else
    cp "$bl_tmp/cached" "$bl_tmp/tracked" || return 1
  fi
  grep -Ev '(^|/)\.env[^/]*(/|$)' "$bl_tmp/others" >"$bl_tmp/untracked"
  [ $? -le 1 ] || return 1

  cat "$bl_tmp/tracked" "$bl_tmp/untracked" | tr '\001\n' '\n\0' >"$bl_out" || return 1
  rm -rf "$bl_tmp"
}

# True when neither $2 nor any directory on the way down to it, under $1, is a
# symlink. A path that does not exist yet passes.
# Usage: bl_no_symlink_on_path ROOT RELATIVE_PATH
bl_no_symlink_on_path() {
  bl_p=$1
  bl_old_ifs=$IFS
  IFS=/
  set -f
  # shellcheck disable=SC2086 # splitting on / is the point
  set -- $2
  IFS=$bl_old_ifs
  set +f
  for bl_part in "$@"; do
    bl_p=$bl_p/$bl_part
    if [ -L "$bl_p" ]; then
      return 1
    fi
  done
}

# Checks one candidate: a path relative to the work copy that must be
# tests/e2e/<dirs>-snapshots/<name>.png with nothing else in it, and a safe
# place in the repo to write it.
# Usage: bl_check_candidate REPO RELATIVE_PATH
bl_check_candidate() {
  bl_rel=$2
  case $bl_rel in
    *[!A-Za-z0-9._/-]*) bl_refuse "unexpected character in the path '$bl_rel'" ;;
    */../* | */..) bl_refuse "'..' in the path '$bl_rel'" ;;
    *)
      printf '%s\n' "$bl_rel" |
        grep -Eq '^tests/e2e/[A-Za-z0-9._/-]+-snapshots/[A-Za-z0-9._-]+\.png$' ||
        bl_refuse "not a snapshot PNG under tests/e2e: '$bl_rel'"
      ;;
  esac || return 1
  bl_no_symlink_on_path "$1" "$bl_rel" || bl_refuse "a symlink on the way to '$bl_rel' in the repo" || return 1
  if [ -d "$1/$bl_rel" ]; then
    bl_refuse "a directory is in the way of '$bl_rel' in the repo"
  fi
}

# Copies one file to a temp name next to its destination, then renames it over
# the destination. rename replaces an existing symlink; it never writes through it.
# Usage: bl_copy_one WORK REPO RELATIVE_PATH
bl_copy_one() {
  bl_dest=$2/$3
  bl_dir=$(dirname "$bl_dest")
  mkdir -p "$bl_dir" || return 1
  bl_part=$(mktemp "$bl_dir/.e2e-baseline.XXXXXX") || return 1
  if cp "$1/$3" "$bl_part" && chmod 644 "$bl_part" && mv -f "$bl_part" "$bl_dest"; then
    return 0
  fi
  rm -f "$bl_part"
  return 1
}

# Runs in a child shell that xargs starts with a batch of absolute paths.
# Usage: bl_each check|copy WORK REPO FILE...
bl_each() {
  bl_mode=$1
  bl_work=$2
  bl_repo=$3
  shift 3
  for bl_file in "$@"; do
    bl_relpath=${bl_file#"$bl_work"/}
    bl_check_candidate "$bl_repo" "$bl_relpath" || return 1
    if [ "$bl_mode" = copy ]; then
      bl_copy_one "$bl_work" "$bl_repo" "$bl_relpath" || return 1
    fi
  done
}

# Copies the regular *.png files under WORK/tests/e2e/**/*-snapshots into REPO,
# at the same relative paths. Nothing is copied unless every candidate passes the
# checks; one refusal fails the whole copy and leaves REPO untouched.
# LIB is the path of this file, which the child shells source.
# Usage: bl_copy_back WORK REPO LIB
bl_copy_back() {
  bl_w=$1
  bl_r=$2
  bl_lib=$3
  for bl_d in "$bl_w/tests" "$bl_w/tests/e2e"; do
    if [ -L "$bl_d" ]; then
      bl_refuse "'${bl_d#"$bl_w"/}' in the work copy is a symlink" || return 1
    fi
  done
  if [ ! -d "$bl_w/tests/e2e" ]; then
    bl_refuse "no tests/e2e in the work copy" || return 1
  fi
  if [ -L "$bl_r/tests" ] || [ -L "$bl_r/tests/e2e" ]; then
    bl_refuse "tests or tests/e2e in the repo is a symlink" || return 1
  fi

  bl_found=$(mktemp "${TMPDIR:-/tmp}/e2e-baseline-found.XXXXXX") || return 1
  if ! find "$bl_w/tests/e2e" -type f -name '*.png' -path '*-snapshots/*' -print0 >"$bl_found"; then
    rm -f "$bl_found"
    bl_refuse "could not list the snapshots" || return 1
  fi

  # The first pass checks every candidate; the second checks again and copies.
  for bl_mode in check copy; do
    # shellcheck disable=SC2016 # the child shell expands $1 and $@
    # Without -r, GNU xargs runs the command once on empty input; bl_each copes.
    if ! xargs -0 sh -c '. "$1"; shift; bl_each "$@"' sh "$bl_lib" "$bl_mode" "$bl_w" "$bl_r" <"$bl_found"; then
      rm -f "$bl_found"
      return 1
    fi
  done
  rm -f "$bl_found"
}
