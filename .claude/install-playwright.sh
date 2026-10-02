#!/usr/bin/env bash
# install-playwright.sh — SessionStart hook that installs Playwright's Chromium
# so Claude Code can run the e2e/visual suite and take screenshots to validate
# UI changes in a web session.
#
# ── REQUIREMENTS ────────────────────────────────────────────────────────────
# The container is ephemeral, so the browser must be (re)installed each session.
# This only works if the environment's NETWORK ACCESS policy allows the download
# host  cdn.playwright.dev  (Playwright's Chromium build) plus the package-manager
# mirrors for Chromium's OS libraries (libnss3, libatk, ...). Configure that in
# the environment settings → Network access → Custom. Docs:
#   https://code.claude.com/docs/en/claude-code-on-the-web
#
# Fail-open: never blocks a session. Quiet no-op when Chromium is already present
# or when the network policy blocks the download.
#
# Opt out:  export CLAUDE_SKIP_PLAYWRIGHT=1
set -u

log() { printf '[install-playwright] %s\n' "$*" >&2; }

if [ "${CLAUDE_SKIP_PLAYWRIGHT:-0}" = "1" ]; then
  log "skipped (CLAUDE_SKIP_PLAYWRIGHT=1)"
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
command -v npx >/dev/null 2>&1 || { log "npx not found; skipping"; exit 0; }

# Already installed? Playwright caches browsers under ~/.cache/ms-playwright by
# default, but PLAYWRIGHT_BROWSERS_PATH overrides that (this environment points
# it at /opt/pw-browsers). Honor the override so the presence check is accurate
# and we don't re-invoke install every session.
browsers_path="${PLAYWRIGHT_BROWSERS_PATH:-${HOME}/.cache/ms-playwright}"
if ls "${browsers_path}"/chromium-*/ >/dev/null 2>&1; then
  log "chromium already present in ${browsers_path}; nothing to do"
  exit 0
fi

# Prefer installing OS deps too (needs apt/root + network). Fall back to the
# browser-only install if --with-deps isn't permitted.
log "installing Chromium…"
if npx --yes playwright install --with-deps chromium >/tmp/playwright-install.log 2>&1 \
  || npx --yes playwright install chromium >>/tmp/playwright-install.log 2>&1; then
  log "Chromium installed"
else
  log "install failed — the network policy likely blocks cdn.playwright.dev."
  log "see /tmp/playwright-install.log; allow the host in the environment's Network access settings."
fi

exit 0
