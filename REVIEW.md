# Code Review Tasks

Generated: 2026-03-12 | Overall: **FAIL** | 97 issues (16 errors, 52 warnings, 29 suggestions)

---

## Errors (fix first)

### Svelte

- [ ] `src/components/canvas/nodes/StepNode.svelte:15` — `$derived(() => {...})` stores the function object, not the computed string; all conditional CSS classes (bottleneck, selection ring, step-type border) are silently broken. Replace with `$derived((() => { ... })())` or inline the logic directly.

### Tests

- [ ] `src/utils/simulation/SimulationRunner.js` — Zero unit tests. Add `tests/unit/simulation/SimulationRunner.test.js` covering start, pause, resume, stop, onTick callback, onComplete firing.
- [ ] `src/utils/simulation/ComparisonEngine.js` — Zero unit tests. Add `tests/unit/simulation/ComparisonEngine.test.js` covering `calculateImprovements` (including baseline=0 edge case), `runBaseline`, `runScenario`.
- [ ] `features/step-definitions/data.steps.js:87` — `expect(this.exportClicked).to.be.true` asserts a flag that is never set. Add a When step that sets `this.exportClicked = true` or remove the assertion.
- [ ] `features/step-definitions/phase2.steps.js` — File contains only comments; feature scenarios depending on it are silent no-ops. Implement the missing steps or remove the file.

### Structure

- [ ] `src/services/SimulationService.svelte.js:20` — God object with 7 responsibilities (lifecycle, scenario management, comparison, store mutations, runner delegation, state init, work-item generation). Split into focused services: `SimulationOrchestrator`, `ScenarioManager`, `SimulationStateInitializer`.
- [ ] `src/stores/vsmDataStore.svelte.js:82` — Mixes domain CRUD with localStorage persistence. Extract `persist()` into the repository layer.

### Concurrency

- [ ] `src/utils/simulation/SimulationRunner.js:90` — Race condition in `resume()`: rapid successive calls schedule duplicate `requestAnimationFrame` loops. Guard with an in-progress flag before calling `animate()`.
- [ ] `src/services/SimulationService.svelte.js:42` — Race condition in `startSimulation()`: guard checks `isRunning` but does not set it before yielding control. Call `simControlStore.setRunning(true)` before `runner.start()`.

### Domain

- [ ] `src/utils/validation/vsmValidator.js` / `src/stores/vsmDataStore.svelte.js:24` — `validateAndSanitizeVSMData` is duplicated in both files. Remove the copy from the store and import from `vsmValidator.js`.

### Performance

- [ ] `src/utils/simulation/simulationEngine.js:211` — `queueHistory` grows unbounded (10 steps × 10,000 ticks = 100,000+ entries). Implement a circular buffer, sliding window, or interval sampling.

### Accessibility

- [ ] `src/App.svelte:45` — `<main onclick={...}>` has no keyboard handler or ARIA role. Move the handler to a semantic interactive element.
- [ ] `src/components/canvas/Canvas.svelte:138` — `<div tabindex="0">` with key handler needs `role="application"` or equivalent.
- [ ] `src/components/ui/Header.svelte:132` — Export dropdown is hover-only; no keyboard navigation, no `role="menu"` / `role="menuitem"`. Implement full keyboard nav with arrow keys, Enter, Escape.
- [ ] `src/components/ui/Sidebar.svelte:40` — `<aside>` has no `aria-label`. Add `aria-label="Step templates and instructions"`.

---

## Warnings

### Svelte / Reactivity

- [ ] `src/stores/vsmDataStore.svelte.js:238` — `getStepById`/`getConnectionById` return live `$state` proxy refs; callers can mutate without triggering `persist()`. Return shallow copies.
- [ ] `src/stores/vsmDataStore.svelte.js:105` — `get steps()` / `get connections()` expose live proxy arrays. Return `[...steps]` or document clearly as read-only.
- [ ] `src/components/ui/Header.svelte:7` — `tempName` captures store snapshot at mount; stale if store name changes before user clicks to edit. Re-initialize on `handleNameClick` only.
- [ ] `src/services/SimulationService.svelte.js:165` — Module singleton holds `requestAnimationFrame` loop with no HMR cleanup. Add `import.meta.hot?.dispose(() => runner.stop())`.
- [ ] `src/stores/scenarioStore.svelte.js:27` — `get scenarios()` exposes live proxy; mutation bypasses `updateScenario`. Return a copy or document constraint.

### Functional Programming (no mutations)

- [ ] `features/step-definitions/helpers/SimulationTestHelper.js:4` — ES6 class with no framework constraint. Convert to factory function `createSimulationTestHelper`.
- [ ] `features/step-definitions/helpers/VSMTestHelper.js:3` — ES6 class with no framework constraint. Convert to factory function `createVSMTestHelper`.
- [ ] `src/utils/simulation/simulationEngine.js:174` — `completedCount++` inside `.map()` callback is an impure side-effect. Use `filter().length` or `reduce`.
- [ ] `src/utils/simulation/simulationEngine.js:401` — `peakQueues[record.stepId] = record.queueSize` inside `forEach`. Replace with `reduce`.
- [ ] `src/utils/simulation/simulationEngine.js:193` — Spreads object then mutates copy inside `forEach` in `updateQueues`. Replace with `reduce`.
- [ ] `src/utils/simulation/simulationEngine.js:387` — `let totalLeadTime += ...` inside `forEach`. Replace with `reduce`.
- [ ] `src/data/stepTemplates.js:217` — `getTemplatesByCategory` mutates `let grouped` with `push()`. Replace with `reduce`.
- [ ] `features/step-definitions/helpers/testStores.js:255` — `loadTemplate` uses `.push()` on locally-created arrays. Build immutably with `map` then spread.

### Tests

- [ ] `tests/unit/validation/connectionValidator.test.js:117` — Missing test: `undefined` reworkRate on a rework connection silently passes validation (NaN comparison). Add the case and fix the validator.
- [ ] `tests/unit/simulation/simulationEngine.test.js` — `hasReworkPath` and `calculateReworkProbability` have no direct tests. Add a `describe` block for each.
- [ ] `tests/unit/calculations/metrics.test.js:271` — Missing boundary test: queueSize exactly at threshold should NOT be a bottleneck (strict `>`).

### Structure / DRY

- [ ] `src/stores/` (all 6) — ~30-line singleton/getter/reset boilerplate repeated 6×. Extract a `createReactiveStore` factory.
- [ ] `src/stores/vsmIOStore.svelte.js:19` — Template connection remapping logic duplicated at lines 19–27 and 46–56. Extract `remapConnectionIds(connections, oldSteps, newSteps)`.
- [ ] `src/utils/validation/vsmValidator.js:44` — Step validation `forEach` reaches 4 levels of nesting. Extract `validateStepStructure(step, index)`.
- [ ] `src/utils/validation/vsmValidator.js:68` — Connection validation mirrors step validation nesting. Extract `validateConnectionStructure(connection, index)`.
- [ ] `src/services/SimulationService.svelte.js:38` — Directly imports and mutates 4 stores. Invert dependency: pass store actions as parameters.

### Performance

- [ ] `src/stores/simulationDataStore.svelte.js:86` — `addQueueHistoryEntry` spreads entire array on every 60fps tick. Use `addQueueHistoryBatch` for bulk updates instead.
- [ ] `src/utils/simulation/SimulationRunner.js:29` — `queueHistory` reset to `[]` on every tick before rebuild creates GC pressure. Accumulate naturally without resetting.

### Domain Boundaries

- [ ] `src/data/thresholds.js:31` — `CANVAS_START_X`, `CANVAS_STEP_SPACING`, `CANVAS_Y` are UI constants in a domain file. Move to `src/data/canvasConfig.js` or similar.
- [ ] `src/data/stepTypes.js:13` — `STEP_TYPE_CONFIG` (label, icon, color) is UI rendering config mixed into domain constants. Move to a UI layer file.
- [ ] `src/infrastructure/VsmJsonRepository.js:35` — Deserializer applies domain defaults (UUID, timestamps). Infrastructure should return raw data; let the store/domain apply defaults.
- [ ] `src/stores/vsmDataStore.svelte.js:148` — `loadMap()` accepts raw data without validation. Validate with `validateVSMData` before assigning to state.
- [ ] `src/stores/vsmDataStore.svelte.js:172` — Canvas auto-positioning logic in the domain store. Extract to `src/utils/ui/autoPositionStep.js`.

### Accessibility

- [ ] `src/components/canvas/nodes/StepNode.svelte:36` — Queue badge uses `title` only; add `aria-label="Queue: {data.queueSize} items waiting"`.
- [ ] `src/components/canvas/nodes/StepNode.svelte:43` — Batch badge uses `title` only; add `aria-label="Batch size: {data.batchSize}"`.
- [ ] `src/components/metrics/MetricsDashboard.svelte:24` — `title` attribute tooltips are not keyboard-accessible. Replace with `aria-label`.
- [ ] `src/components/simulation/SimulationControls.svelte:149` — Progress bar has no `aria-label` / `role="progressbar"` with `aria-valuenow`.
- [ ] `src/components/simulation/SimulationControls.svelte:107` — Speed-control button group lacks visible `:focus` indicator. Add `focus:ring-2`.
- [ ] `src/components/simulation/SimulationResults.svelte:107` — Chart bars are visual-only. Add `aria-label` or `role="progressbar"` with value attributes.
- [ ] `src/components/simulation/ScenarioComparison.svelte:92` — `<th>` elements missing `scope="col"`. Screen readers cannot associate headers with cells.
- [ ] `src/components/ui/Header.svelte:107` — Editable map-name button lacks `aria-label="Edit map name"`.
- [ ] `src/components/ui/Header.svelte:139` — Dropdown container missing `role="menu"`.
- [ ] `src/components/ui/Sidebar.svelte:57` — Category toggle button missing `aria-expanded` and `aria-controls`.
- [ ] `src/components/ui/WelcomeScreen.svelte:88` — Template buttons are icon-only with no `aria-label`.
- [ ] `src/components/ui/WelcomeScreen.svelte:46` — Emoji in heading not `aria-hidden="true"`.

### Security

- [ ] `src/components/ui/Header.svelte:66` — No file-size limit before `reader.readAsText()`. Add `if (file.size > 10_000_000) return`.
- [ ] `src/components/ui/WelcomeScreen.svelte:28` — Same missing file-size limit on JSON import.
- [ ] `src/infrastructure/VsmJsonRepository.js:35` — `JSON.parse()` without prototype-pollution guard. Add reviver stripping `__proto__`, `constructor`, `prototype` keys.

### Concurrency

- [ ] `src/services/SimulationService.svelte.js:165` — Eager singleton; initialization failure is silent. Wrap in try/catch or defer creation.

---

## Suggestions

### Svelte

- [ ] `src/utils/persistedState.svelte.js` — No runes used; `.svelte.js` extension is misleading. Rename to `persistedState.js`.

### Tests

- [ ] `tests/unit/simulation/simulationEngine.test.js:92` — No test for `isRunning=false, isPaused=false` state. Document whether ticks advance when stopped.
- [ ] `tests/unit/calculations/metrics.test.js:60` — Zero-leadTime path only asserts `value`; also assert `percentage`, `status`, `displayValue`.
- [ ] `tests/unit/simulation/simulationStore.test.js:9` — Svelte 5 rune state persists across test files. Verify `vi.resetModules()` or equivalent isolation is configured.
- [ ] `tests/e2e/canvas.spec.js:44` — Pan test uses `toBeCloseTo(x + 100, 0)` (±0.5px); consider asserting direction of delta instead of exact offset.
- [ ] `tests/unit/validation/vsmValidator.test.js` — No test for `steps` containing a primitive (e.g., `steps: [42]`). Add to verify "must be an object" path.

### Structure

- [ ] `src/services/SimulationService.svelte.js:164` — Eager module-level singleton hides initialization order. Consider lazy init or explicit setup in `App.svelte`.
- [ ] `src/utils/simulation/` — Boundaries between `simulationEngine.js`, `SimulationRunner.js`, `ComparisonEngine.js` are unclear. Document public contract or reorganize as `SimulationCore`, `SimulationController`, `SimulationComparator`.

### Performance

- [ ] `src/components/canvas/Canvas.svelte:44` — `$derived` nodes array spreads every step on every change. Consider Map-based memoization to skip unchanged steps.
- [ ] `src/utils/calculations/metrics.js:86` — `calculateMetrics` runs all calculations on every access. Move to a `$derived` block in the store to leverage Svelte caching.
- [ ] `src/services/SimulationService.svelte.js:70` — `addQueueHistoryBatch` called on every tick (~60/s). Throttle to every 5–10 ticks or 100ms to reduce reactivity churn.

### Domain

- [ ] `src/utils/validation/stepValidator.js:60` — `undefined` field values produce odd NaN comparisons. Add null-coalescing defaults before validation checks.
- [ ] `src/stores/vsmDataStore.svelte.js:70` — Persisted data loaded at init without validation. Run `validateVSMData` on restore to catch corrupted localStorage.

### Accessibility

- [ ] `src/components/canvas/nodes/StepNode.svelte:55` — Abbreviated terms (PT, LT, %C&A) have no accessible explanation. Add `aria-label` or `title` with full names.
- [ ] `src/components/ui/Header.svelte:137` — `▾` symbol used as dropdown indicator. Replace with SVG icon and `aria-label="Export options"`.
- [ ] `src/components/ui/Sidebar.svelte:97` — How-to-Use instructions are plain text paragraphs. Convert to `<ul>` or `<dl>` for semantic structure.
- [ ] `src/components/ui/WelcomeScreen.svelte:57` — Map name label spacing may obscure its association with the input. Ensure label is visually connected or use `aria-labelledby`.
- [ ] `src/components/ui/WelcomeScreen.svelte:135` — Hidden file input for import may not be keyboard-accessible. Test keyboard activation of the delegated click.

### Security

- [ ] `src/utils/persistedState.svelte.js:44` — Silent `catch` in `getPersistedValue` hides data loss. Log or re-throw in non-test environments.
- [ ] `src/utils/export/exportAsPng.js` / `exportAsPdf.js` — Filename sanitization allows leading/trailing dots. Tighten the regex or validate the final result.
- [ ] `src/components/ui/Header.svelte:32` — File type is only validated at the UI level (`accept=".json"`). Add explicit MIME/extension check in the handler.

### Functional Programming

- [ ] `features/step-definitions/world.js:12` — `class VSMWorld extends World` is a Cucumber framework requirement, suggest replacements for cucumber.
