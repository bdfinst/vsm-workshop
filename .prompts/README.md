# Future Work Prompts

Prompts for deferred refactoring tasks. Each file is a self-contained brief
that can be handed directly to an AI coding session.

| File | Topic | Effort |
|------|-------|--------|
| `split-simulation-service.md` | Split 7-responsibility god object into 3 focused services | Large |
| `extract-persistence-layer.md` | Move `persist()` out of domain store into infrastructure | Medium |
| `invert-simulation-service-deps.md` | Inject store dependencies rather than importing singletons | Medium |
| `extract-reactive-store-factory.md` | Investigate shared boilerplate factory for Svelte 5 stores | Small/Spike |

## Why These Were Deferred

These items were flagged during the March 2026 code review (`REVIEW.md`) but
not implemented because they require architectural changes that go beyond
isolated fixes and would touch multiple files across layers. Each prompt
includes full context, constraints, and quality gate requirements.
