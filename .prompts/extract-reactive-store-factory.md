# Extract createReactiveStore Factory (If Feasible)

## Context

All 6 stores in `src/stores/` follow the same pattern:
- `function createXStore()` wrapper
- `$state()` declarations
- Getter block in the return object
- `export const xStore = createXStore()` singleton

The review suggested extracting a `createReactiveStore` factory to reduce
boilerplate (~30 lines repeated 6×).

## Constraint / Why This Is Hard

Svelte 5 runes (`$state`, `$derived`) are **compile-time transforms**, not
runtime functions. They must appear as direct expressions in the source file,
not passed through a helper. A generic `createReactiveStore(initialState)`
factory would need to call `$state()` inside a closure, which the Svelte
compiler cannot transform correctly.

## Task

Investigate whether any boilerplate can be safely shared:

1. **Probe approach**: Try creating a `createReactiveStore(fields, actions)`
   utility in a `.svelte.js` file and verify Svelte compiles it correctly
   with `npm run build`. If the build fails or produces incorrect reactivity,
   document the limitation and close this issue.

2. **Alternative**: If a full factory isn't feasible, at minimum extract the
   singleton export pattern into a shared comment template or code snippet
   in `.claude/examples/svelte-stores.md` so future store authors follow the
   same pattern consistently.

3. If the factory approach works, migrate the 4 simplest stores first
   (simControlStore, vsmUIStore, scenarioStore, simulationDataStore) and
   leave the persisted stores (vsmDataStore, vsmIOStore) separate.

## Quality gates

`npm run test && npm run build && npm run lint` must pass after any change.
