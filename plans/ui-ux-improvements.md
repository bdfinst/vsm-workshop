# Plan: UI/UX Improvements — Parallel Implementation

**Created**: 2026-04-13
**Branch**: master
**Status**: approved

## Goal

Implement 13 UI/UX improvements across 5 parallel work streams. Each stream is independent at the feature level — they can be assigned to separate agents or worked concurrently. Streams 3, 4, and 5 share `App.svelte` and `Header.svelte`, so their final commits to those files must be sequenced (see Merge Coordination below). Every stream leaves the codebase in a working, committable state after each step.

## Acceptance Criteria

- [ ] People count `<input type="number">` rendered in step editor form with default 1, min 1, persists on save
- [ ] Queue chart bars scale dynamically to actual max peak queue (not hard-coded 10)
- [ ] Simulation toolbar visually distinct from header (bg-gray-50, "Simulation" label)
- [ ] Every `<input>` in StepEditor and ConnectionEditor has a `<label for="...">` association (verified by Playwright DOM assertion)
- [ ] Simulation results container has `aria-live="polite"` and `role="status"`
- [ ] No native `confirm()` or `alert()` calls remain in `src/` (delete actions use ConfirmPopover, file errors use toast)
- [ ] Toast notification system: auto-dismiss for info (5s), manual dismiss for errors, stacks vertically
- [ ] Help button in sidebar re-shows guidance banner (works even when steps exist on canvas)
- [ ] Simulation panel scrollable when content overflows (max-h-[40vh] inside SimulationPanel.svelte)
- [ ] Scenarios renamable via double-click in comparison view; empty names rejected
- [ ] Welcome screen template cards show step count badges and use differentiated colors
- [ ] Empty canvas shows dashed placeholder at CANVAS_RIGHT_X; placeholder replaces GuidanceBanner (not both)
- [ ] Keyboard shortcuts overlay toggled by `?` key with focus trap; Escape closes
- [ ] Undo/redo via Ctrl+Z / Ctrl+Shift+Z with max 20 levels (semantic mutations only — excludes drag position changes)
- [ ] All tests pass, build succeeds, lint clean

## Prerequisite: Feature Files

Before any stream begins implementation, `.feature` files must be created for each behavioral change in `features/`. This is required by the project's ATDD rules. The specs conversation above contains the Gherkin — they must be committed as files before RED steps begin.

## Design Decisions (from plan review)

### D1: Undo integration boundary
Undo snapshots are pushed at **component call sites**, not inside `vsmDataStore`. The undo store is imported by components (or a thin command dispatcher), never by `vsmDataStore` itself. This keeps the data store free of transient UI concerns.

### D2: Undo scope — semantic mutations only
`updateStepPosition` (drag operations) is **excluded** from undo snapshots. Only these mutations push snapshots: `addStep`, `deleteStep`, `updateStep`, `addConnection`, `deleteConnection`, `updateConnection`. This prevents drag operations from flooding the 20-slot history.

### D3: Undo restore mechanism
`vsmDataStore` must expose a `restoreSnapshot({ steps, connections })` method that bulk-assigns all state fields and calls `persist()`. This is the only way `undoStore.undo()` can write back to private closure state without breaking encapsulation.

### D4: Toast store scope
`toastStore` owns **only** the notification queue (add, dismiss, auto-expire). It does not manage overlay visibility, guidance state, or any persistent UI state. Those remain in `vsmUIStore`.

### D5: Keyboard overlay state
The `isShortcutsOverlayOpen` boolean is `$state` **local to `App.svelte`**, not a store. The overlay must receive focus on open (focus the close button) and trap focus while visible.

### D6: GuidanceBanner vs EmptyCanvasPlaceholder
On an empty canvas, the **EmptyCanvasPlaceholder replaces the GuidanceBanner**. The placeholder incorporates the "map backwards" guidance text. The banner continues to work for the help-recall case (when steps exist). State model: add `guidanceForceShow` boolean to `vsmUIStore`. Banner visibility = `(steps.length === 0 && !guidanceDismissed && !hasPlaceholder) || guidanceForceShow`. The help button sets `guidanceForceShow = true`; dismissing sets it back to `false`.

### D7: Inline edit — accept duplication
Step 4.2 will implement scenario renaming as a self-contained inline-edit within `ScenarioComparison.svelte`. No shared `InlineEdit` component will be extracted. Duplication with Header's map name edit is accepted as reasonable for two instances.

### D8: ConfirmPopover positioning
Use CSS `position: absolute` relative to the trigger button's parent. No portal. If edge-clipping is discovered during implementation, the implementor may switch to `position: fixed` with calculated coordinates.

### D9: Z-index layer table

| Layer | z-index | Component |
|-------|---------|-----------|
| Canvas controls | z-10 | SvelteFlow Controls, MiniMap |
| Guidance banner | z-20 | GuidanceBanner.svelte |
| Export dropdown | z-50 | Header.svelte export menu |
| Confirm popover | z-60 | ConfirmPopover.svelte |
| Toast stack | z-70 | Toast.svelte |
| Keyboard overlay | z-80 | KeyboardShortcutsOverlay.svelte |

## Steps

---

### STREAM 1: Trivial Fixes (no dependencies)

#### Step 1.1: Add people count field to step editor

**Complexity**: trivial
**RED**: Write E2E test: open step editor → assert `data-testid="people-count-input"` is rendered as `<input type="number">` with value 1 → set to 3 → save → reopen → assert value is 3
**GREEN**: Add `<input type="number" min=1 data-testid="people-count-input">` for peopleCount in StepEditor.svelte after batch size in the 2-column grid. Note: `formData.peopleCount` already exists — this is a template-only addition. Verify `stepValidator.js` validates min 1 for peopleCount; add validation if missing.
**REFACTOR**: None needed
**Files**: `src/components/builder/StepEditor.svelte`, possibly `src/utils/validation/stepValidator.js`
**Commit**: `fix: add people count input to step editor form`

#### Step 1.2: Fix queue chart dynamic scaling

**Complexity**: standard
**RED**: Write unit test: given peak queues [5, 20, 8], assert bar for peak 20 is 100% width, bar for peak 5 is 25% width; given all zeros, assert all bars are 0% width
**GREEN**: In SimulationResults.svelte, compute `maxPeakQueue = Math.max(...queueChartData.map(d => d.peakQueue), 1)`. Replace `/ 10` with `/ maxPeakQueue` on line 120. Update `aria-valuemax` to `maxPeakQueue`.
**REFACTOR**: Extract max computation to a `$derived` value
**Files**: `src/components/simulation/SimulationResults.svelte`
**Commit**: `fix: scale queue chart bars dynamically to actual peak values`

#### Step 1.3: Differentiate simulation toolbar

**Complexity**: trivial
**RED**: Write E2E test asserting SimulationControls has `bg-gray-50` class and contains text "Simulation"
**GREEN**: Change container to `bg-gray-50 border-b`; add `<span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Simulation</span>` at left
**REFACTOR**: None needed
**Files**: `src/components/simulation/SimulationControls.svelte`
**Commit**: `style: visually differentiate simulation toolbar from header`

---

### STREAM 2: Accessibility (no dependencies)

#### Step 2.1: Associate form labels with controls

**Complexity**: standard
**RED**: Write Playwright test that navigates to the step editor and asserts every `<input>`, `<select>`, and `<textarea>` with a `data-testid` has a corresponding `<label>` element whose `for` attribute matches the input's `id`
**GREEN**: Add `id` attributes to all inputs in StepEditor (step-name, step-type, description, process-time, lead-time, percent-ca, queue-size, batch-size, people-count) and ConnectionEditor (connection-type, rework-rate). Add matching `for` attributes to labels.
**REFACTOR**: None needed
**Files**: `src/components/builder/StepEditor.svelte`, `src/components/builder/ConnectionEditor.svelte`
**Commit**: `fix(a11y): associate all form labels with their controls`

#### Step 2.2: Add aria-live region for simulation results

**Complexity**: trivial
**RED**: Write Playwright test asserting SimulationResults container has `aria-live="polite"` attribute
**GREEN**: Add `aria-live="polite"` and `role="status"` to SimulationResults outer `{#if results}` container div
**REFACTOR**: None needed
**Files**: `src/components/simulation/SimulationResults.svelte`
**Commit**: `fix(a11y): announce simulation results to screen readers`

---

### STREAM 3: Dialog & Notification System (no dependencies)

#### Step 3.1: Create toast notification store and component

**Complexity**: standard
**RED**: Write unit tests for toast store: `add(message, 'info')` adds to queue, auto-dismiss fires after duration (use `vi.useFakeTimers()`), `dismiss(id)` removes immediately, multiple toasts stack in order. `toastStore` owns only the notification queue — no overlay or guidance state.
**GREEN**: Create `src/stores/toastStore.svelte.js` (factory function, `$state` for messages array) and `src/components/ui/Toast.svelte` (fixed bottom-right, z-70, auto-dismiss for info, manual for error)
**REFACTOR**: None needed
**Files**: `src/stores/toastStore.svelte.js`, `src/components/ui/Toast.svelte`, `tests/unit/stores/toastStore.test.js`
**Commit**: `feat: add toast notification system`

#### Step 3.2: Create confirmation popover component

**Complexity**: standard
**RED**: Write test: ConfirmPopover renders message, Confirm button triggers onconfirm callback, Cancel button triggers oncancel callback. Position: CSS absolute (z-60) relative to trigger parent.
**GREEN**: Create `src/components/ui/ConfirmPopover.svelte`
**REFACTOR**: None needed
**Files**: `src/components/ui/ConfirmPopover.svelte`
**Commit**: `feat: add inline confirmation popover component`

#### Step 3.3: Replace all confirm() and alert() calls

**Complexity**: standard
**RED**: Write Playwright E2E tests: (1) click Delete on a step → assert ConfirmPopover appears with "Delete [name]?" text → click Cancel → step still exists → click Delete again → Confirm → step removed. (2) Import an invalid file → assert toast notification appears with error message (no native alert). These tests must fail against the current code.
**GREEN**: Replace `confirm()` calls with ConfirmPopover in: StepEditor (delete), ConnectionEditor (delete), Canvas (keyboard delete), Header (new map). Replace `alert()` calls with `toastStore.add()` in: WelcomeScreen (file too large, invalid type, import failed), Header (file validation errors). Mount `<Toast />` in App.svelte.
**REFACTOR**: None needed
**Files**: `src/components/builder/StepEditor.svelte`, `src/components/builder/ConnectionEditor.svelte`, `src/components/canvas/Canvas.svelte`, `src/components/ui/Header.svelte`, `src/components/ui/WelcomeScreen.svelte`, `src/App.svelte`
**Commit**: `refactor: replace native dialogs with inline confirmations and toasts`

#### Step 3.4: Add help recall button to sidebar

**Complexity**: standard
**RED**: Write E2E test: create map with 2 steps → dismiss guidance → click help button in sidebar → assert guidance banner reappears → dismiss again → assert hidden
**GREEN**: Add `guidanceForceShow` boolean to `vsmUIStore` with `forceShowGuidance()` and `dismissGuidance()` (sets both `guidanceDismissed=true` and `guidanceForceShow=false`). Update GuidanceBanner visibility: show when `guidanceForceShow` is true (regardless of step count) OR when `steps.length === 0 && !guidanceDismissed`. Add `?` icon button at bottom of Sidebar that calls `vsmUIStore.forceShowGuidance()`.
**REFACTOR**: None needed
**Files**: `src/components/ui/Sidebar.svelte`, `src/components/ui/GuidanceBanner.svelte`, `src/stores/vsmUIStore.svelte.js`
**Commit**: `feat: add help button to recall guidance banner`

---

### STREAM 4: Layout & Interaction Polish (no dependencies)

#### Step 4.1: Make simulation panel scrollable

**Complexity**: trivial
**RED**: Write E2E test asserting SimulationPanel container has `overflow-y: auto` computed style
**GREEN**: Add `max-h-[40vh] overflow-y-auto` to the outer container **inside SimulationPanel.svelte** (not in App.svelte — the constraint belongs to the component that owns the content)
**REFACTOR**: None needed
**Files**: `src/components/ui/SimulationPanel.svelte`
**Commit**: `fix: make simulation panel scrollable when content overflows`

#### Step 4.2: Add scenario renaming

**Complexity**: standard
**RED**: Write unit test for `scenarioStore.renameScenario(id, name)` — renames scenario, rejects empty string. Write E2E test: double-click scenario name → edit → Enter saves → name persists.
**GREEN**: Add `renameScenario(id, name)` to scenarioStore (validates non-empty). Add inline-edit UI in ScenarioComparison.svelte (self-contained, no shared component — duplication with Header's map name edit is accepted per D7).
**REFACTOR**: None needed
**Files**: `src/stores/scenarioStore.svelte.js`, `src/components/simulation/ScenarioComparison.svelte`
**Commit**: `feat: allow renaming scenarios in comparison view`

#### Step 4.3: Improve welcome screen template cards

**Complexity**: trivial
**RED**: Write E2E test asserting each template card contains step count text
**GREEN**: Add `{template.steps.length} steps` badge to template buttons; use differentiated color shades (green-600, teal-600, cyan-600)
**REFACTOR**: None needed
**Files**: `src/components/ui/WelcomeScreen.svelte`
**Commit**: `style: differentiate template cards with step counts and colors`

#### Step 4.4: Add empty canvas placeholder

**Complexity**: standard
**RED**: Write E2E test: empty canvas shows placeholder with "Add your first step" text at right side; after adding a step, placeholder is hidden. Assert GuidanceBanner is NOT shown when placeholder is visible (per D6 — placeholder replaces banner on empty canvas).
**GREEN**: Create `EmptyCanvasPlaceholder.svelte` with dashed outline and guidance text. Render in Canvas when `nodes.length === 0`. Update GuidanceBanner condition to not render when placeholder is active.
**REFACTOR**: None needed
**Files**: `src/components/canvas/EmptyCanvasPlaceholder.svelte`, `src/components/canvas/Canvas.svelte`, `src/components/ui/GuidanceBanner.svelte`
**Commit**: `feat: show placeholder on empty canvas guiding first step placement`

#### Step 4.5: Add keyboard shortcuts overlay

**Complexity**: standard
**RED**: Write E2E test: press `?` → overlay appears listing "Delete — Remove selected step", "? — Show shortcuts" → press Escape → overlay closes. Assert overlay receives focus on open.
**GREEN**: Create `KeyboardShortcutsOverlay.svelte` (z-80, modal with focus trap on close button). Wire `?` keypress in App.svelte. Overlay visibility is `$state` local to App.svelte (`let isShortcutsOverlayOpen = $state(false)`) — per D5, not a store.
**REFACTOR**: None needed
**Files**: `src/components/ui/KeyboardShortcutsOverlay.svelte`, `src/App.svelte`
**Commit**: `feat: add keyboard shortcuts overlay triggered by ? key`

---

### STREAM 5: Undo/Redo (no dependencies)

#### Step 5.1: Create undo store with snapshot stack

**Complexity**: complex
**RED**: Write unit tests: pushSnapshot stores `{ steps, connections }`, undo restores previous snapshot and pushes current to redo stack, redo re-applies, max depth 20 (oldest entries evicted), redo stack clears on new mutation after undo, canUndo/canRedo reflect stack state
**GREEN**: Create `src/stores/undoStore.svelte.js` with factory function, `$state` for undoStack and redoStack arrays. Methods: `pushSnapshot(snapshot)`, `undo(currentState)` returns previous snapshot, `redo(currentState)` returns next snapshot.
**REFACTOR**: None needed
**Files**: `src/stores/undoStore.svelte.js`, `tests/unit/stores/undoStore.test.js`
**Commit**: `feat: add undo/redo store with snapshot stack`

#### Step 5.2: Wire undo into vsmDataStore via component call sites

**Complexity**: complex
**RED**: Write integration tests covering all 6 mutation types: (1) addStep → undo → step gone, (2) deleteStep → undo → step restored, (3) updateStep → undo → old values restored, (4) addConnection → undo → connection gone, (5) deleteConnection → undo → connection restored, (6) updateConnection → undo → old values restored. Also: redo stack clears on new mutation after undo.
**GREEN**: Add `restoreSnapshot({ steps, connections })` method to vsmDataStore that bulk-assigns state and persists. Push undo snapshots at component call sites (Sidebar addStep, StepEditor save/delete, ConnectionEditor save/delete, Canvas keyboard delete) — per D1, never inside vsmDataStore itself. `updateStepPosition` is excluded per D2. Undo scope: vsmDataStore mutations only, not scenarioStore or simulationControlStore.
**REFACTOR**: Extract a `withUndo(fn)` helper that captures snapshot, calls fn, to reduce boilerplate at call sites
**Files**: `src/stores/vsmDataStore.svelte.js` (add restoreSnapshot), `src/components/ui/Sidebar.svelte`, `src/components/builder/StepEditor.svelte`, `src/components/builder/ConnectionEditor.svelte`, `src/components/canvas/Canvas.svelte`
**Commit**: `feat: wire undo snapshots into vsmDataStore mutations at call sites`

#### Step 5.3: Add keyboard bindings and header buttons

**Complexity**: standard
**RED**: Write E2E test: add step → Ctrl+Z → canvas empty; Ctrl+Shift+Z → step returns. Assert header undo/redo buttons show correct disabled state.
**GREEN**: Wire Ctrl+Z / Ctrl+Shift+Z in App.svelte keydown handler (stopPropagation to prevent canvas handler interference). Add undo/redo icon buttons in Header with `disabled` when stack is empty.
**REFACTOR**: None needed
**Files**: `src/App.svelte`, `src/components/ui/Header.svelte`
**Commit**: `feat: add undo/redo keyboard shortcuts and header buttons`

---

## Merge Coordination

Streams 3, 4, and 5 all modify `App.svelte` and/or `Header.svelte`. To avoid merge conflicts:

1. Each stream works in its own worktree/branch
2. Merge order: Stream 3 first (mounts Toast), then Stream 4 (wires ? key), then Stream 5 (wires Ctrl+Z + header buttons)
3. After each merge, the next stream rebases before its App.svelte/Header.svelte commits

## Parallel Execution Map

```
Stream 1 ──→ [1.1] → [1.2] → [1.3] → done
Stream 2 ──→ [2.1] → [2.2] → done
Stream 3 ──→ [3.1] → [3.2] → [3.3] → [3.4] → done ──┐
Stream 4 ──→ [4.1] → [4.2] → [4.3] → [4.4] → [4.5] → merge after S3
Stream 5 ──→ [5.1] → [5.2] → [5.3] ─────────────────→ merge after S4

Streams 1, 2, 3, 4, 5 start simultaneously.
Steps within each stream are sequential.
App.svelte/Header.svelte merges are sequenced: S3 → S4 → S5.
```

## Complexity Classification

| Rating | Criteria | Review depth |
|--------|----------|--------------|
| `trivial` | Single-file change, config, style-only | Skip inline review |
| `standard` | New function, component, or behavioral change | Spec-compliance + relevant agents |
| `complex` | Architectural change, cross-cutting concern | Full agent suite |

## Pre-PR Quality Gate

- [ ] All unit tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Linter passes (`npm run lint`)
- [ ] E2E tests pass (`npx playwright test`)
- [ ] `/code-review` passes
- [ ] Feature files committed before implementation

## Risks & Open Questions

- **Undo snapshot size**: Full `{ steps, connections }` snapshots 20 deep. Acceptable for workshop-sized maps. If maps grow large, switch to command pattern (delta-based). Undo scope is explicitly bounded to vsmDataStore only.
- **Z-index conflicts**: Resolved by D9 layer table. Implementors must use the assigned values.
- **Pre-existing E2E failures**: 6 of 8 original canvas.spec.js tests fail due to Svelte Flow handle drag issues unrelated to this plan. New E2E tests should use the low-level mouse API pattern from `tests/e2e/edge-routing.spec.js` (boundingBox + mouse.move/down/up with steps).
- **Toast auto-dismiss timing in tests**: Unit tests for toast store must use `vi.useFakeTimers()` to avoid flakiness.
- **Event propagation for ? and Escape keys**: App.svelte keydown handler must check `event.target` to avoid firing when the user is typing in an input field. The overlay Escape handler must `stopPropagation` to prevent clearing step selection.

## Plan Review Summary

Four critics reviewed this plan. All returned needs-revision on the initial draft. The following blockers were identified and resolved in this revision:

**Resolved blockers:**
1. Undo store coupling into vsmDataStore → resolved by D1 (call-site snapshots) and D3 (restoreSnapshot method)
2. updateStepPosition in undo stack → resolved by D2 (excluded)
3. Step 3.3 grep-as-test → replaced with behavioral Playwright E2E tests
4. Step 2.1 build-warning-as-test → replaced with Playwright DOM label/input assertions
5. Missing .feature files → added as prerequisite
6. GuidanceBanner state machine → resolved by D6 (guidanceForceShow + placeholder replaces banner)
7. Scrollable panel in wrong layer → moved to SimulationPanel.svelte
8. Step 1.1 ambiguous criterion → explicitly requires rendered `<input>` element

**Warnings addressed:**
- Toast store scope constrained (D4)
- Keyboard overlay state ownership specified (D5)
- Z-index layer table added (D9)
- Inline-edit duplication accepted (D7)
- Merge coordination for shared files documented
- Step 5.2 integration tests expanded to all 6 mutation types
- Step 3.3 distinguishes popover (deletes) from toast (file errors) at call-site level
- Focus trap specified for keyboard overlay (D5)

**Remaining observations (non-blocking):**
- Stream 4 is the longest stream (5 steps) — consider moving 4.1/4.3 to Stream 1 for load balancing
- Keyboard shortcuts overlay documents only 3 shortcuts — acceptable for now, can grow organically
- Toast auto-dismiss tests must use fake timers
- Scenario renaming should reject empty names (added to Step 4.2)
