# Extract Persistence Out of vsmDataStore

## Context

`src/stores/vsmDataStore.svelte.js` currently mixes domain CRUD (add/update/
delete steps and connections) with localStorage persistence (the `persist()`
call after every mutation). This couples the domain store to the infrastructure
layer and makes the store harder to test in isolation.

## Task

Move `persist()` logic into a dedicated repository/adapter so the store only
manages reactive state and domain logic.

Suggested approach:

1. Create `src/infrastructure/VsmLocalStorageRepository.js` with:
   - `save(vsmData)` — writes to localStorage
   - `load()` — reads and sanitizes from localStorage
   - `clear()` — removes the key

2. Update `vsmDataStore` to accept the repository as a parameter
   (or call the repository from `vsmIOStore` which already handles
   import/export infrastructure concerns).

3. Remove the `persist()` calls from individual store actions. Instead,
   use a `$effect` that watches the state and calls `repository.save()`
   reactively — or call `save()` explicitly at store action boundaries.

## Constraints

- No ES6 classes — use factory functions
- `vsmDataStore` unit tests must not require a localStorage mock
- Quality gates: `npm run test && npm run build && npm run lint`
- Commit after extraction is complete and tests pass

## Files to touch

- `src/stores/vsmDataStore.svelte.js`
- `src/infrastructure/VsmLocalStorageRepository.js` (new)
- `src/utils/persistedState.js` (may be replaced or reduced)
- `tests/unit/stores/vsmStore.test.js` (update if needed)
- `tests/unit/infrastructure/VsmLocalStorageRepository.test.js` (new)
