---
name: pr
description: Run the quality gate (tests, build, lint) then open a pull request. Use when the user says "create a PR" or "open a PR".
---

1. Run `npm test && npm run build && npm run lint`; stop and report on any failure.
2. Run `npm run test:acceptance` if behavior changed.
3. Run `/dev-team:code-review` on the diff and fix findings.
4. `gh pr create` with a summary of changes and test evidence.
