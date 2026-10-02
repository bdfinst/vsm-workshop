#!/usr/bin/env bash
# install-dev-team.sh — SessionStart hook that installs the dev-team plugin in
# Claude Code sessions of ANY repository. Attempts install by DEFAULT.
#
# ── WHAT IT DOES ────────────────────────────────────────────────────────────
# On session start, if a `claude` CLI is present and the plugin isn't already
# installed, it registers the published marketplace and installs the plugin:
#     claude plugin marketplace add bdfinst/agentic-dev-team
#     claude plugin install dev-team@bfinster
# A plugin installed at SessionStart takes effect on the NEXT session, not the
# current one. The hook is fail-open: it never blocks a session from starting,
# and it is a quiet no-op when dev-team is already installed.
#
# ── HOW TO USE IT IN ANOTHER REPO ───────────────────────────────────────────
# 1. Copy this file to  .claude/install-dev-team.sh  in your repo.
# 2. Register it as a SessionStart hook in  .claude/settings.json  (merge this
#    into any existing "hooks" block):
#
#      {
#        "hooks": {
#          "SessionStart": [
#            { "hooks": [ { "type": "command",
#              "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/install-dev-team.sh\"" } ] }
#          ]
#        }
#      }
#
# That's it — no env var needed. It runs by default in every session.
#
# ── OPT OUT ─────────────────────────────────────────────────────────────────
# To disable auto-install in a given environment (e.g. a laptop where you manage
# plugins by hand), set  DEV_TEAM_CLOUD_INSTALL=0  there. Where dev-team is
# already installed it is a quiet no-op regardless.
#
# Portable: bash 3.2-safe, no GNU-only tools; runs on macOS, Linux, and Git Bash.
set -uo pipefail

# ── Opt-out gate ────────────────────────────────────────────────────────────
# Enabled by default; set DEV_TEAM_CLOUD_INSTALL=0 to skip.
if [ "${DEV_TEAM_CLOUD_INSTALL:-1}" = "0" ]; then
  exit 0
fi

MARKETPLACE="${DEV_TEAM_MARKETPLACE:-bdfinst/agentic-dev-team}"
PLUGIN="${DEV_TEAM_PLUGIN:-dev-team@bfinster}"

# ── No CLI: guide instead of failing ────────────────────────────────────────
# Cloud VMs may not ship the `claude` CLI, so installation isn't possible. Emit
# SessionStart guidance and exit cleanly.
if ! command -v claude >/dev/null 2>&1; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"The dev-team plugin could not be installed in this session because no `claude` CLI is available here. To use it: install Claude Code locally and run `claude plugin marketplace add bdfinst/agentic-dev-team` then `claude plugin install dev-team@bfinster`; or drive its skills directly from the bdfinst/agentic-dev-team repo (see its docs/using-plugin-skills-in-the-web-environment.md)."}}
JSON
  exit 0
fi

# ── Already installed: quiet no-op ──────────────────────────────────────────
if claude plugin list 2>/dev/null | grep -qi 'dev-team'; then
  exit 0
fi

# ── Install (time-boxed so a slow network can't hang session start) ─────────
# timeout (GNU) → gtimeout (BSD/macOS via coreutils) → unbounded fallback.
_tmo() {
  if command -v timeout >/dev/null 2>&1; then timeout 120 "$@"
  elif command -v gtimeout >/dev/null 2>&1; then gtimeout 120 "$@"
  else "$@"; fi
}

_tmo claude plugin marketplace add "$MARKETPLACE" >/dev/null 2>&1 || true
_tmo claude plugin install "$PLUGIN" >/dev/null 2>&1 || true
exit 0
