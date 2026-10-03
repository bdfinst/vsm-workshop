<!-- spec-version: 1 -->

# Spec: Guided Mapping and Time-Ladder UX

**Format:** dev-team /specs v1 · **Date:** 2026-09-30 · **Revision:** 5 (conflict check before every write, save status structure, dialog focus, memory-only screen) · **Owner:** Bryan Finster
**UX design:** [docs/ux/guided-mapping-ux.md](../ux/guided-mapping-ux.md) · **Mockup:** [docs/ux/mockups/guided-mapping.html](../ux/mockups/guided-mapping.html)

## Intent Description

A delivery team with no value stream mapping experience should be able to build a value stream map in one facilitated session, using only the in-app prompts. Today the app opens on a blank free-form canvas with a flat grid of equally weighted metric tiles, and nothing tells the team what to do next. The team gets lost, and the numbers don't point at anything.

This change replaces that with a guided session of seven stages: scope the stream, list the steps, time each step, capture quality, map rework, review the current state, and draw a future state.

- **Steps.** They are listed forward, starting at Intake. There can be any number of them, and each has a name and a description.
- **Outside-team steps.** A step done by an outside team, whose work time and wait time the team can't see separately, is recorded with one elapsed time.
- **The map.** It is a time ladder drawn to scale, and it stays visible while the team works. Wait rises above the track, process time sits below it, and rework loops hang underneath, each labelled with the share of items that take it.
- **The summary strip.** It sits under the map and leads with flow efficiency. It shows the total time spent on rework, assuming no single rework loop is repeated more than once for an individual work item.
- **Future states.** The team can copy the current state into one or more future states and compare them side by side.

The app is distributed as **one HTML file** that people download and open in a browser on any OS, with no install, server or database. A team can keep **several value streams** in one workspace. In Chrome and Edge the workspace autosaves to a file the user picks. In other browsers it lives in browser storage, and the user saves it by downloading the file. The app warns before the window closes or the page is left with unsaved changes.

The existing simulation, what-if scenarios, and the queue size, batch size and people count fields are removed; future states replace what-if. The free-form canvas stays as a second view of the same ordered steps. The backwards-mapping guidance is removed. Existing saved maps are upgraded without losing the original.

## Architecture Specification

### Scope boundaries

- **In:**
  - guided session (stages 1–7);
  - step list and outside-team steps;
  - time ladder map, rework loops, rework table and summary strip;
  - editable table view, and canvas view with no branching;
  - current and future states, with comparison;
  - undo and redo;
  - export: PNG, PDF, JSON and CSV;
  - migration of saved v1 maps;
  - a workspace holding several value streams, with a home screen to create, open, rename, duplicate, delete, import and export them;
  - saving the workspace to a local file, with an unsaved-changes warning;
  - a standalone single-file HTML build.
- **Out, separate specs later:** defect tracking, multi-user real-time collaboration, SSO and roles, edit history ("view as of"), read-only share links, hosting, native installers (Tauri or Electron), and a database server.
- **Unchanged platform:**
  - A single-user browser app built with Svelte 5 runes. Persistence changes from one localStorage map to a workspace (see Persistence and distribution).
  - Functional style: factory functions, no classes, per `.claude/rules/javascript-svelte.md`.
  - The new model is built **alongside** v1 behind a `ui=guided` toggle and becomes the only model after a successful pilot.

### Data model (schema version 2)

All durations are stored in whole minutes. Percentages are stored as 0–100. `workdayHours` converts working days, and wait time counts working time. Changing `workdayHours` never changes stored minutes; it only changes how they are displayed and entered.

| Entity      | Fields                                                                                                                                                                                                                                                                                        | Rules                                                                                                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace   | `format: "vsm-workspace"`, `schemaVersion: 1`, `id`, `streams[]` (ValueStream, in workspace order), `activeStreamId` (nullable), `revision`, `savedAt`                                                                                                                                        | Stream names are trimmed when a stream is created, imported, migrated or edited (a saved workspace is taken as stored) and need not be unique. A stream with no name yet is shown as "Untitled value stream"; a name cannot be edited to blank, from the home rename or the header's value stream name field. A new stream starts unnamed. Stream ids are unique. `revision` counts edits, not navigation. An empty workspace is valid. |
| ValueStream | `schemaVersion: 2`, `id`, `name`, `description`, `trigger`, `endPoint`, `unitOfWork` (`story` \| `feature` \| `defect`, no default), `workdayHours` (default 8, range 1–24), `versions[]`, `activeVersionId`, `session{activeStage, furthestStage}`, `createdAt`, `updatedAt`                 | Exactly one `current` version. `session` persists so a reload resumes the session.                                                                                                                                                         |
| MapVersion  | `id`, `kind` (`current` \| `future`), `label`, `basedOnVersionId`, `focusItems[]` (≤ 2), `steps[]`, `reworkPaths[]`, `createdAt`                                                                                                                                                              | See the version rules below.                                                                                                                                                                                                               |
| Step        | `id`, `originStepId`, `name`, `description`, `performedBy`, `kind` (`team` \| `outside`), `isHandoff`, `processTime{typ,min?,max?}`, `waitTime{typ,min?,max?}`, `elapsedTime{typ}`, `timeSource` (`estimate` \| `measured`), `pctCA` (null until entered), `notes`, `position{x,y}` | See the step rules below.                                                                                                                                                                                                                  |
| ReworkPath  | `id`, `fromStepId`, `toStepId`, `shareOfRejects` (1–100), `reworkProcessTime?`, `note`                                                                                                                                                                                                        | index(to) ≤ index(from) at all times. When pctCA < 100 on the from step, shares from that step must sum to 100 (otherwise the step is flagged). A step with pctCA = 100 has no paths.                                                      |

**MapVersion rules:**

- A future version is a deep copy of the current one, and each copied step's `originStepId` points at its source step.
- Labels are required and trimmed, and they must be unique ignoring case. "Current state" is reserved.
- The current version can't be deleted. Deleting the active future version makes the current version active.

**Step rules:**

- Order is the array index.
- **Intake** is index 0. It can't be moved, deleted, renamed or made an outside step. Its description, performer and times are editable.
- **Team steps:** processTime.typ ≥ 0, waitTime.typ ≥ 0, and no elapsedTime. `isHandoff` is set by the user.
- **Outside steps:** elapsedTime.typ > 0, elapsedTime has no min or max (one value), and no process or wait time. `isHandoff` is forced true.
- When min and max are given, min ≤ typ ≤ max.
- `originStepId` is null for a new step.

Forward connections are no longer stored: flow follows step order. `position` is used only by the canvas view.

### Persistence and distribution

- **Distribution.**
  - `npm run build:standalone` produces `dist-standalone/vsm-workshop.html`, a single file with every script, style, font and image inlined. Fonts are latin subsets in the weights the UI uses.
  - It must work when opened from disk (`file://`) in current Chrome, Edge, Firefox and Safari on macOS, Windows and Linux, with no network access.
  - Until switch-over, the standalone build opens the guided session without the `ui=guided` option. The mode comes from a pure `resolveUiMode(search, defaultUi)`.
  - It is attached to each GitHub release. The normal `npm run build` stays for development and hosting.
  - In Chrome every copy of the file opened from disk shares one `file://` origin, so copies share one working copy. The workspace `schemaVersion` check refuses data written by a newer copy.
  - v1 maps saved on the hosted app can't be reached from `file://`. Users export them as JSON on the hosted app and use "Import value stream".
- **Working copy.**
  - The whole workspace is kept in IndexedDB (database `vsm-workshop`, store `workspace`), so a crash or reload loses nothing. IndexedDB is used because the file handle must be stored there too, and localStorage is capped at about 5 MB.
  - It is a cache, not the durable copy: browsers may clear it, so the app requests persistent storage once.
  - **Single writer.** The workspace store owns the workspace and is the only code that writes it. A stream store edits through a `persist(stream)` callback; the workspace store replaces that stream, bumps `revision`, sets `updatedAt`, and enqueues one serialized save. All repositories are async.
  - Navigation saves only `activeStreamId` and the active stage, and doesn't bump `revision`, so it never makes the workspace unsaved. Which screen is showing (home or stream) is memory-only. Loading, migrating and auto-creating the first stream set the saved baseline.
  - The workspace store starts with `init()`, with status `loading`, `ready` or `unreadable`. Nothing creates a stream before it is `ready`.
- **Storage notice.** Shown at the top of the app. The no-storage notice is dismissible for the session; dismissing the location notice is remembered:
  - When the browser offers no usable storage, or doesn't grant persistent storage (for example a private window): "This browser won't keep your work after you close it. Save the workspace file before you leave."
  - When the standalone file is opened from disk: "Your work is stored in this browser for this file location. Save the workspace file to move or update." The README says the same.
- **Workspace file** (`*.vsm.json`, the Workspace entity above) is the durable copy. There are two save modes, chosen by feature detection:
  - **Linked file** (the File System Access API is available, i.e. Chrome and Edge).
    - "Save as…" or "Open workspace" links a file.
    - After that, every change autosaves: the write starts 500 ms after the last change and finishes within 2 s.
    - The file handle is kept in IndexedDB. On the next launch the app offers "Reconnect to <file name>", which asks the browser for permission again (Chrome asks on every launch).
    - If permission is denied: "Your browser didn't allow access — changes are kept in this browser only."
  - **Download** (Firefox, Safari, or no linked file). "Save" downloads "vsm-workspace.vsm.json", a new copy each time. "Open workspace" reads a file with a file input.
- **Conflict check.**
  - On reconnect, and before every write to a linked file, the app reads the file. The last-known stamp is kept with the file handle.
  - If the file's `revision` and `savedAt` differ from the last ones this browser saved or opened, it shows "This file changed since you last saved" with "Keep mine", "Load file" and "Cancel". Nothing is written until the user chooses.
  - "Keep mine" writes the working copy to the file. "Load file" first keeps the working copy as a backup, then opens the file as the workspace. "Cancel" leaves the file untouched and the changes unsaved.
- **Save status**, always shown in the header. The status text is a `role="status"` region; its actions (Retry, Save a copy, Reconnect, Save) are sibling buttons outside it:

  | Status                                                                             | When                                                        |
  | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
  | Saved to <file>                                                                    | The linked file matches the working copy                    |
  | Unsaved changes                                                                    | Linked, during the 500 ms before a write starts             |
  | Saving…                                                                            | A write to the linked file is running                       |
  | Not saved to a file · Save                                                         | Download mode, or a linked file not reconnected, with edits |
  | Downloaded vsm-workspace.vsm.json                                                  | Download mode, after a save and before the next edit        |
  | Couldn't save to <file>. Your work is still in this browser. · Retry · Save a copy | The last write failed                                       |
  - After an open, the opened file is linked in Chromium ("Saved to <file>"). In download mode the status is clean until the next edit.
  - A fresh launch with no edits shows no unsaved state.
  - Once the reconnect banner is dismissed, the status keeps a "Reconnect" action.
  - Screen readers hear only: entering "Not saved to a file" (download mode, once until saved), entering "Couldn't save…", and the first "Saved to" after a failure. Linked-mode "Unsaved changes" and "Saving…" are never announced.
  - An edit refused by validation changes nothing, so it starts no write and shows nothing unsaved.
  - Retry makes one write attempt; if it fails again, the failed status and the leave warning stay.

- **Unsaved-changes warning.**
  - While the status is unsaved, saving or failed, closing the window, reloading or leaving the page triggers the browser's standard "Leave site?" prompt (`beforeunload`). The browser controls its wording.
  - Leaving the stream for the home screen doesn't warn, because the data is still in the workspace.
- **Opening a different workspace.**
  - With any status other than saved (in either mode), the app first asks "You have changes that aren't in a file. Save them first?" with "Save", "Discard" and "Cancel". Focus starts on Cancel, Escape cancels, and focus returns to the control that opened it.
  - Every "Open workspace" entry point goes through one open operation.
  - Opening swaps the file handle first, then marks the new workspace as saved. It never writes to the old file, and it invalidates pending home-screen undo.
  - A value stream JSON file is refused with "This is a single value stream — use Import value stream."
- **File menu.**
  - The header shows the save status and one "Save" button.
  - "File" is a menu button: Enter or Space opens it on the first item, arrow keys move, Escape closes it and returns focus to "File".
  - "New value stream", "Open workspace", "Save as…" (Chrome and Edge), "Import value stream" and "Export value stream" sit under a "File" menu, each with a one-line helper.
  - The first, auto-created stream also offers "Have a workspace file? Open it" on Scope.
  - In Chrome and Edge, after the first real edit, a one-time dismissible nudge says "Save as… to keep a file copy."
  - Under 640 px the header shows the value stream name, the save status and a menu.
- **Home screen.**
  - It lists every stream in workspace order with its name, last updated time, step count and furthest stage (a pure `streamSummary(stream, now)`). An unnamed stream also shows its created date. The home screen explains "workspace" once.
  - Actions:
    - "New value stream" appends a stream.
    - Open.
    - Rename. A blank name is refused with "Add a name", and the header's "Value stream name" field refuses it the same way, keeping the previous name. Names are trimmed in both places, and saving a name that is unchanged once trimmed changes nothing (no new "updated" time, no lost undo history). Typing a blank name is refused even for an unnamed stream; leaving the header field untouched is not an edit.
    - A refusal shows its message under the field (`role="alert"`, with `aria-invalid` and `aria-describedby` on the field), keeps focus in the field, and clears on the next edit. The header's refusal also clears when another stream is opened.
    - A value stream's name is edited in those two places only. Scope has no name field: while the stream is unnamed it shows one line, "Name this value stream in the header.", and the Next gate says "Add a name in the header".
    - Duplicate inserts the copy after its source, named "<name> (copy)", then "<name> (copy 2)". A copy of an unnamed stream is named "Untitled value stream (copy)": the copy is named after how its source is listed.
    - Delete confirms, naming the stream, then shows an Undo toast.
    - "Import value stream" (a v1 map file or a value stream JSON file) appends a stream. An imported id that already exists gets a new one, and its name is trimmed.
    - "Export value stream" writes a value stream JSON file named "<name>.json" (an unnamed stream is "Untitled value stream.json"), with characters invalid in file names replaced by "-".
  - Each card is a link, with a sibling "⋯" menu button named "Actions for <stream>".
  - An empty workspace shows "No value streams yet" and offers "New value stream". The header's "All value streams" returns to the home screen.
- **Launch and screen.**
  - The screen (`home` or `stream`) is memory-only: it starts as `stream`, or `home` when no stream is active. `activeStreamId` is saved.
  - The app opens the active stream at its `session.activeStage` when there is one. Going to the home screen keeps `activeStreamId`, so a reload reopens that stream.
  - With an empty workspace, including a reload after every stream was deleted, it creates a stream and opens it at Scope. The empty home screen shows only until the next reload.
  - With streams but none active, it shows the home screen.
- **Undo** is per stream, and its snapshots leave out `session`. Opening another stream starts a fresh undo history. The workspace remembers the last home-screen delete (a newer delete replaces it), so it is undone from its toast or with Ctrl/Cmd+Z on the home screen, for the session. The shortcut still works after opening another stream and coming back; the toast does not come back. A restore that cannot work (the stream's id is in use again) ends it, and opening another workspace clears it.

### Calculations (pure functions, `src/utils/calculations/`)

For steps 1..n: PT, WT, EL (elapsed time of outside steps) and CA as a fraction.

- PT_total = Σ PT over team steps. WT_total = Σ WT over team steps. EL_total = Σ EL over outside steps.
- LT = PT_total + WT_total + EL_total.
- Flow efficiency = PT_total ÷ LT. When any outside step exists, it is shown as the range PT_total ÷ LT to (PT_total + EL_total) ÷ LT.
- Rolled %C/A = Π CA_i. Reject rate of step i = 1 − CA_i.
- Rework path j → k: depth = index(j) − index(k). R(j,k) = the time of steps k through j − 1 (PT + WT for team steps, EL for outside steps), plus the path's `reworkProcessTime`.
- Share of items taking path j → k: P(j,k) = (1 − CA_j) × s_jk.
- Rework time added per item at step j: E_j = (1 − CA_j) × Σ_k s_jk × R(j,k). **Assumption, shown in the UI:** no single rework loop is repeated more than once for an individual work item.
- Time on rework = Σ E_j. Rework-adjusted LT = LT + Σ E_j. Rework-adjusted flow efficiency = PT_total ÷ rework-adjusted LT (a range when outside steps exist).
- Also computed:
  - step count;
  - handoff count (steps with `isHandoff`);
  - the three largest waits (team steps only, ties broken by step order);
  - the three paths with the most added time;
  - the lowest %C/A;
  - share of LT spent waiting, WT_total ÷ LT (a range when outside steps exist).
- Ranges: when min or max are entered, each metric also gets a low value (every min) and a high value (every max).
- Incomplete: a metric that depends on a missing value returns `{ incomplete: true, stepName }` and never a partial number. It names the first missing step in step order.
- Display:
  - durations under one working day are shown in hours to one decimal ("8.0 hours");
  - longer ones in working days to one decimal ("1.0 days", "18.8 days");
  - percentages to one decimal.
- Metrics take only the version (minutes in, minutes out). `workdayHours` is used only by the formatting and unit-conversion functions.

These replace `calculateReworkImpact` (a summed rate with a geometric multiplier), `calculateTotalQueueSize`, `identifyBottlenecks` and `calculateActivityRatio`.

### Editing rules (store)

- Every edit goes through store actions that call the domain validators. Invalid edits are rejected with a message, and the stored value stays unchanged.
- Reorder and insert are refused if they would make an existing rework path point forward. The message is "A rework path would point forward — remove or change it first".
- **Deleting a step:**
  - It removes the paths from and to that step.
  - The remaining shares are left as they are, and they are flagged if they no longer sum to 100.
  - A confirm is shown when the step has any data or paths. It states how many paths will be removed.
  - After deleting, an "Undo" toast appears.
- Setting a step's %C/A to 100 when it has paths asks for confirmation, then removes them.
- Switching a step between team and outside asks for confirmation, then clears the time fields that no longer apply.
- **Undo and redo:**
  - They cover every edit to the ValueStream, including future-state create and delete, focus items, and session stage changes that complete a stage.
  - They are available as toolbar buttons and as Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.
  - Each undo or redo is announced in a live region.
  - They use their own undo instance with whole-ValueStream snapshots, pushed inside store actions. This deliberately departs from v1's call-site rule D1.

### Stage rules

- **A stage is complete** when it has been reached and all its required fields are valid now. Completion is derived, never stored.
- **Needs attention:** a reached stage that becomes invalid (for example, a new step has no time) shows as "needs attention" on the rail, with the reason.
- **Navigation:** the rail lets the user jump to any stage up to `furthestStage`. Next moves forward only when the current stage is valid.
- **Stages 2–5** edit the **active version**. A persistent "Editing: <label>" indicator and a version switcher sit in the shell. Scope edits the value stream.
- Required fields per stage:

  | Stage | Required                                                                 |
  | ----- | ------------------------------------------------------------------------ |
  | 1     | name, trigger, end point, unit of work (whitespace-only counts as empty) |
  | 2     | at least 2 steps, each with a name and performer                         |
  | 3     | typical time for every step                                              |
  | 4     | %C/A for every step                                                      |
  | 5     | every step with %C/A < 100 has paths whose shares sum to 100             |
  | 6     | none                                                                     |
  | 7     | none                                                                     |

- The "why Next is disabled" text names only what is missing. The name is edited in the header, so its part reads "a name in the header".

### Layout

- **Shell regions:**
  - a header with "All value streams", the value stream name, the "Editing:" indicator and switcher, the save status, undo and redo, Export, and Compare;
  - the stage rail;
  - the stage prompt card and work area;
  - from stage 2 on, a map pane with a Map / Table / Canvas switch;
  - the summary strip pinned at the bottom.
- **Under 640 px:** the summary strip collapses to the flow efficiency figure and an expander, and the ladder scrolls horizontally.
- **Resume:** a reload resumes the active stream at `session.activeStage`, and edits save to the working copy on each valid change.

### Migration (v1 → v2, on first launch and on JSON import)

- **Preserve the original.**
  - On first launch with no workspace in IndexedDB, a v1 map in the localStorage key `vsm-data` is migrated and added as the workspace's first stream. The v1 key is never rewritten or deleted, and it is not imported again once a workspace exists.
  - Corrupted saved data (the IndexedDB workspace, or a workspace file) is never overwritten. Its raw text is kept under a backup record.
  - The user sees "We couldn't read your saved workspace. Your saved data is kept." with, in this order:
    - "Open workspace";
    - "Import value stream";
    - "Download the unreadable data";
    - "Start an empty workspace", last, behind a confirm: "Start an empty workspace? The unreadable copy stays kept, but it won't be shown again after this." with "Download the unreadable data", "Start empty" and "Cancel". Focus starts on Cancel, Escape cancels, and focus returns to the control that opened it.
  - A corrupt workspace next to a valid v1 key does not migrate the v1 map.
  - Data with a newer `schemaVersion`, from IndexedDB or a file, is refused with "This file was made by a newer version of the app". Valid JSON that isn't a workspace is refused with "This isn't a VSM workspace file". A workspace with any invalid stream is refused whole. Nothing is changed.
  - The codec checks structure only: types, Intake first, and no forward rework. Completeness is a stage status, not a load error.
- **Step order:** a topological sort of forward connections. Ties, and any cycle, are broken by `position.x`.
- **Intake:**
  - If a v1 step is named "intake" (any case), it moves to index 0 and is renamed "Intake".
  - Otherwise an Intake step is inserted at index 0 with processTime 0, waitTime 0 and `estimate`. LT and PT are then unchanged.
- **Times:**
  - `processTime.typ = processTime` (missing becomes 0).
  - `waitTime.typ = leadTime − processTime`. When leadTime < processTime, the wait is set to 0 and the step is listed in "What changed". LT then rises to PT for that step.
  - `kind = team`, `isHandoff = false`, `timeSource = estimate`.
- **Rework:**
  - Rework connections become ReworkPaths, with shares = each rate ÷ the sum of rates from that step × 100, rounded so they sum to 100.
  - If pctCA = 100 but rework exists, set pctCA = 100 − min(Σ rates, 99).
  - A v1 rework connection that points forward is dropped.
  - A v1 step with pctCA < 100 and no rework keeps its pctCA, and stage 5 shows "needs attention".
- **Dropped:** `queueSize`, `batchSize`, `peopleCount`, `tools`, `type`, and forward connections.
- **Result:**
  - The migrated map becomes version `current`, with `furthestStage` = 7 and `activeStage` = 6 (Review).
  - A persistent, dismissible "Map upgraded" notice lists only the changes that were actually applied: Intake inserted, fields dropped, parallel branches placed in sequence, forward rework dropped, clamped waits. It also says the original is kept.
  - The migration is idempotent.
- **JSON import:**
  - It accepts v1 and v2.
  - A malformed or unsupported file is rejected with a message naming the problem, and the workspace is unchanged.
  - An imported stream whose id already exists gets a new id.

### Components

New modules live under `v2/` directories with canonical identifier names (`createStep`, `calculateMetrics`), so the final switch-over only changes import paths.

| Area                           | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/models/v2/`               | Value stream, map version, step and rework path factories                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/utils/calculations/v2/`   | `totals`, `rework`, `flags` (largest waits, lowest %C/A, top paths), `format` (`formatDuration`, `formatPercent`, `toMinutes`, `fromMinutes`), and an `index` facade                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/utils/validation/v2/`     | Domain validators, used by the store, the stages and the table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/utils/migration/`         | `migrateV1ToV2` (pure) and `decideLoad(rawWorkspace, rawV1)` (pure) → `{ workspace, changes, unreadable }`, behind a thin async load shell                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/utils/ui/`                | `rowModel` (shared by the stages, table and CSV), `ladderModel` (what the ladder draws, from a version and its flags), `ladderLayout` (`sizeLadder`: a model sized into a layout, with an explicit `pixelsPerMinute`), `ladderGeometry`, `ladderView` (fit, label lanes, annotations and label width by character class), `flaggedSteps` (the steps `metrics.flags` names, shared by the ladder and the strip), `summaryModel` (the strip's text), `loopLayout`, `canvasAdapter`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/stores/`                  | `createValueStreamStore({ stream, persist })`, a factory using a `createUndoStore(clone)` factory instance; it derives `metrics` and `ladderModel` (the ladder model, independent of the width it is drawn at) for the active version. `sessionUIStore` holds `uiMode` (from the pure `resolveUiMode`), `viewMode` (the one source of which view shows; `'map'` by default), `ladderPixelsPerMinute` and `showLoopShading`. `saveStatusStore` wraps the file saver reactively. v1 stores are untouched until switch-over.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/components/session/`      | `GuidedRoot` (load, unreadable screen, notices, reconnect, unload guard, home or stream), a presentational `SessionShell`, `SessionHeader`, `StageRail`, `PromptCard`, `DurationInput`, `StepListRow`, and one component per stage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/components/map/`          | `MapPane`, `LadderMap` (with `LadderStep`), `ReworkLoops`, `SummaryStrip` (with `SummaryFigure`), `StepTable`, `ReworkTable`, `ViewSwitch`, `VersionCompare`, `CanvasView`, `StepNodeV2`, `ReworkEdgeV2` (new files, not edits to the v1 canvas)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/persistence/v2/`          | `workspaceCodec` (parse, structurally validate and serialize the workspace), `valueStreamJson` (`importValueStream`, v1 or v2, and `exportValueStream`), the async `indexedDbWorkspaceRepository` and `memoryWorkspaceRepository`, `createSaveStatus`, and `createFileSaver({ getSnapshot, subscribeCommit, serialize, fs, handleStore, download, clock })`, a plain-JS state machine for the linked-file and download modes.                                                                                                                                                                                                                                                                                                                                                                       |
| `src/infrastructure/v2/`       | Browser adapters only: `browserFileSystem`, `handleStore` and `browserDownload`. Tests pass fakes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/stores/v2/workspaceStore` | The single writer: `init()` and `status`, streams in order, `activeStreamId`, the memory-only `screen`, read-only `revision`/`savedRevision` and `subscribeCommit`, create/open/rename/duplicate/remove/restore/import/export/replaceWorkspace, and `revision`. `createValueStreamStore` edits one stream and persists through it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/components/home/`         | `HomeScreen`, `StreamCard`, `SaveStatus`, `ReconnectPrompt`, `ConflictPrompt`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Build                          | `vite.standalone.config.js`, which applies `mergeConfig` to a shared config factory exported by `vite.config.js` and adds `vite-plugin-singlefile` (dev dependency) with `cssCodeSplit: false`, a large `assetsInlineLimit` and `inlineDynamicImports`; the `build:standalone` script, and a release workflow step that attaches the file                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/utils/export/v2/`         | `exportCsv`, `exportLadderPng` and `exportOnePagePdf` (new modules). JSON export is `exportValueStream`, shared with the home screen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Removed at switch-over         | `components/simulation/*`, `services/Simulation*`, `services/ScenarioManager.js`, `utils/simulation/*`, `stores/simulation*`, `stores/scenarioStore.svelte.js`, `stores/vsmDataStore.svelte.js`, `stores/vsmIOStore.svelte.js`, `ui/SimulationPanel.svelte`, `ui/GuidanceBanner.svelte`, `ui/Sidebar.svelte`, `ui/EditorPanel.svelte`, `builder/*`, `canvas/*` (v1), `metrics/MetricsDashboard.svelte`, v1 `utils/calculations/metrics.js`, `models/ConnectionFactory.js`, `utils/undoHelper.js`, `data/exampleMaps.js`, `types/index.js`, queue and bottleneck thresholds, and v1 export modules. **Kept:** `undoStore` (as the factory), `toastStore`, `persistedState`, `ConfirmPopover`, `Toast`, `KeyboardShortcutsOverlay`, `stepTemplates` (starter chips, without queueSize and batchSize). |
| Tests                          | Vitest (`tests/unit/v2/`) for logic and stores, Playwright (`tests/e2e/guided/`) for UI. Cucumber is removed (plan step 1.1b), so no `features/` tree remains. Deleted at switch-over: the v1 Playwright specs and unit tests for removed modules (listed in the plan).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Docs                           | `README.md`, `.claude/rules/vsm-domain.md`, `.claude/guides/architecture.md`, `tests/README.md`, and `docs/ux/pilot-results.md` (new)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Constraints

- **Speed:** metrics and layout recompute within 200 ms of an edit (median of 20 runs, after warm-up) for 40 steps and 80 rework paths.
- **WCAG 2.1 AA:**
  - Every figure on the map is also in the table view.
  - Colour is never the only signal:
    - depth and outside status are written as text;
    - deltas carry ▲/▼ and "better" or "worse";
    - wait blocks have an outline, to meet 3:1 non-text contrast;
    - warning text uses a token with at least 4.5:1 contrast.
  - The stage rail is a `nav` with `aria-current="step"`.
  - Focus moves to the stage heading when the stage changes.
  - The disabled Next has `aria-describedby` pointing at its reason.
  - Inline errors use `aria-invalid` and `aria-describedby`.
  - Every control can be used by keyboard: reorder has visible Move up and Move down buttons as well as Alt+↑/↓.
- **Layout:** works at 1280 px and at 400 px.
- **Standalone:** the single file is under 5 MB (5 × 1024 × 1024 bytes), makes no network requests, and needs no server, install or database.
- **Browsers:** current Chrome, Edge, Firefox and Safari. Linked-file autosave is Chromium-only; the other browsers use download mode with the same features otherwise. CI runs Playwright's Chromium, Firefox and WebKit. WebKit is not Safari, so Safari on macOS is checked by hand.
- **Test IDs:** the existing `data-testid` convention is kept.
- **Export feedback:** exports show a busy state ("Preparing PDF…") and a failure message with Retry. PNG covers the full ladder extent. The PDF fits one page.
- **CSV:**
  - Durations are in minutes.
  - Escaping follows RFC 4180.
  - Cells starting with `=`, `+`, `-` or `@` are prefixed with `'`.
- **Integration:** each slice merges to trunk as its own PR behind the toggle. v1 remains the default until the switch-over.

## Acceptance Criteria

**Guided session**

1. A new guided map opens at stage 1. The stage rail shows all seven stages. Next is disabled until the current stage's required fields are valid, and the reason names only what is missing.
2. The user can return to any reached stage in one click. Edits there recompute the map immediately. A reached stage that becomes invalid shows "needs attention".
3. No stage timer or timebox exists anywhere in the UI.
4. A reload resumes the active stream at the last active stage with every valid edit kept, including after a visit to the home screen. Reloading an empty workspace starts a new stream at Scope.
5. The header always shows which version is being edited, and stages 2–5 edit that version.

**Step list**

6. Intake is step 1. It can't be deleted, moved, renamed or made outside. Its description, performer and times are editable.
7. The team can:
   - add any number of steps, and insert one between any two;
   - reorder by drag, by the Move buttons or by keyboard;
   - delete any step except Intake, with a confirm when the step has data and an Undo toast.

   Each step has a name, a description, a performer and a handoff toggle.

8. A step toggled to Outside is shown hatched with a dashed outline and the text "outside" in the list, the ladder, the table and the canvas. Stage 3 shows a single elapsed-time field for it, and it counts as a handoff.

**Metrics** (the working day is 8 h)

9. Reference map, 5 team steps:
   - Inputs: PT 60, 240, 480, 60, 30 min; WT 2400, 480, 960, 2880, 1440 min; all %C/A 100.
   - The app shows LT 18.8 days (9,030 min), PT 1.8 days (870 min) and flow efficiency 9.6%.
10. Same map, with step 4 at %C/A 80 and one rework path from step 4 to step 1 at share 100:
    - The reject rate shows as 20% on step 4.
    - The loop is drawn at depth 3 in amber, labelled "20% of items".
    - Rolled %C/A is 80.0%.
    - R is 9.6 days (4,620 min).
    - Time on rework is 1.9 days (924 min).
    - Rework-adjusted LT is 20.7 days (9,954 min).
    - The at-most-once assumption text is visible next to time on rework.
11. Adding an outside step with elapsed time 1,440 min to the map in criterion 9 shows LT 21.8 days (10,470 min) and flow efficiency "8.3%–22.1%".
12. A rework path can never point forward:
    - forward targets are not offered;
    - the store rejects forward paths;
    - reorders or inserts that would create one are refused.

    A step whose shares don't sum to 100 is flagged, and the flag shows the current sum.

13. A metric that depends on a missing value shows "incomplete" and names the first such step, never a number.
14. The largest wait and the lowest %C/A each carry a flag on the ladder, and the summary strip's flagged-steps list names the same step for each.
15. Every edit, including step delete with paths and future-state create or delete, can be undone and redone from the toolbar or the keyboard.

**Views**

16. The ladder is drawn to scale by default, with an equal-width toggle.
    - Loops are grey for depth 0–1, amber for 2–3 and red for 4+. Line weight shows share, and depth is written as text.
    - A toggle shades steps k through j − 1 for each loop.
17. The table view shows every step field and every figure on the map. Edits there go through the same validation and update the ladder, the canvas and the metrics.
18. The canvas view shows the same ordered steps. Dragging changes position only, and no forward connection can be drawn.
19. The Rework table lists every path, sorted by added time per item. It shows depth, share of items, share of rejects, R, and added time. With no paths it shows "No rework paths — every step is at 100% %C/A".

**Review and future state**

20. Stage 6 shows the three largest waits and the three paths with the most added time, and lets the team pick up to two focus items.
21. Stage 7:
    - creates labelled future states as copies of the current state, and more than one can exist;
    - validates labels (required, unique ignoring case);
    - asks for confirmation before deleting a future state;
    - never deletes the current state.
22. The side-by-side view:
    - puts both versions on one time scale (same minutes per pixel);
    - shows deltas for LT, flow efficiency, rolled %C/A, rework-adjusted LT and handoffs, with ▲/▼ text;
    - strikes through current-state steps whose id is no future step's `originStepId`;
    - marks future steps with no `originStepId` as "new".

**Data and export**

23. A v1 map in localStorage (on first launch), or a v1 map file (on import), migrates per the migration rules into a stream of the workspace:
    - It produces exactly the same LT and PT, except for steps whose wait was clamped, which are listed.
    - The v1 original is kept.
    - The "Map upgraded" notice lists exactly the changes that applied.
24. Corrupted saved data, malformed import files and malformed or newer workspace files are never overwritten or partially loaded. The user sees what went wrong, is told the saved data is kept, and can open a workspace, import a stream, download the unreadable data, or (after a confirm) start an empty workspace.
25. Export produces:
    - a PNG of the full ladder and the summary strip;
    - a one-page PDF with the map, the summary strip, the top waits and the top rework loops, even with 40 steps and 80 paths;
    - a JSON v2 file that round-trips;
    - a CSV containing every figure in the table view, in minutes, safely escaped.

    Each export shows progress and reports failure.

26. At switch-over, simulation, what-if scenarios, queue size, batch size, people count and the backwards-mapping guidance are gone from the UI. The files listed in the plan are deleted, and a test asserts that they are absent.

**Quality**

27. With 40 steps and 80 rework paths, metrics and layout recompute in under 200 ms (median of 20 runs).
28. axe reports no WCAG 2.1 AA violations on each stage and view, checked from the slice that introduces it. The listed keyboard flows work without a mouse.
29. `npm test`, `npm run build`, `npm run lint` and `npm run test:acceptance` pass on every slice PR.
30. The README and `.claude/rules/vsm-domain.md` state the v2 fields, the formulas and the at-most-once assumption. `docs/ux/guided-mapping-ux.md` and the mockup exist.
31. **Pilot gate, manual, before switch-over:** in a pilot session on the standalone file (which opens the guided session), a team with no VSM experience completes stages 1–6 for a 10-step stream in under 90 minutes using only the in-app prompts. The results are recorded in `docs/ux/pilot-results.md`.

**Workspace and distribution**

32. The home screen lists every stream in workspace order. A user can create, open, rename, duplicate and delete streams (delete confirms, then offers Undo), import a v1 map or a value stream JSON file as a new stream, and export one stream as a value stream JSON file. Edits to one stream never change another.
33. In Chrome and Edge, after the user links a workspace file, every valid change is written to it within 2 s, and the header shows "Saved to <file>". On the next launch the app offers to reconnect to that file. A file changed elsewhere since the last save is never overwritten until the user chooses "Keep mine".
34. In Firefox and Safari, "Save" downloads the workspace file and "Open workspace" loads one. The header shows "Not saved to a file · Save" whenever there are edits since the last save, and "Downloaded vsm-workspace.vsm.json" after one. A fresh launch with no edits shows nothing unsaved.
35. While there are unsaved changes, a pending save or a failed save, closing the window, reloading or leaving the page shows the browser's "Leave site?" prompt. With everything saved, or with no edits since launch, no prompt appears.
36. A failed file write shows "Couldn't save to <file>. Your work is still in this browser." with "Retry" and "Save a copy", keeps the change in the working copy, and keeps the warning active until a save succeeds. On reconnect or before any write, a linked file that changed elsewhere offers "Keep mine", "Load file" or "Cancel", and nothing is written until the user chooses.
37. `npm run build:standalone` produces one HTML file under 5 MB (5 × 1024 × 1024 bytes). Opened from disk with the network disabled, it runs every stage through Future and exports PNG and PDF in Chrome, Firefox and Safari. CI checks Chromium, Firefox and WebKit; Safari on macOS is checked by hand, with a pass or fail recorded per capability.

## Ambiguity Log

| Decision                                                                 | Classification               | Resolved By | Rationale / Answer                                                                                                                                                 |
| ------------------------------------------------------------------------ | ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scope of this spec vs the full pasted spec                               | `requires-stakeholder-input` | human       | Mapping UX and future state. Defects, collaboration, SSO, edit history and share links become separate specs.                                                      |
| Fate of simulation, what-if, and queue/batch/people fields               | `requires-stakeholder-input` | human       | Remove all of it. Future state replaces what-if.                                                                                                                   |
| Free-form canvas                                                         | `requires-stakeholder-input` | human       | Keep it as a second view.                                                                                                                                          |
| Branching on the canvas                                                  | `requires-stakeholder-input` | human       | No branching. It is a view of the same ordered steps.                                                                                                              |
| Wait time: working or calendar                                           | `requires-stakeholder-input` | human       | Working time, using `workdayHours` (default 8).                                                                                                                    |
| Step listing direction                                                   | `requires-stakeholder-input` | human       | Forward from Intake. The backwards walk was rejected.                                                                                                              |
| Outside-team steps                                                       | `requires-stakeholder-input` | human       | One elapsed time. Flow efficiency becomes a range.                                                                                                                 |
| Rework time formula                                                      | `requires-stakeholder-input` | human       | Each loop is used at most once per item, and the assumption is shown in the UI.                                                                                    |
| Stage timer / timebox                                                    | `requires-stakeholder-input` | human       | Removed.                                                                                                                                                           |
| Rework loops on the live map with % of items                             | `requires-stakeholder-input` | human       | Yes. P(j,k) = (1 − CA_j) × s_jk.                                                                                                                                   |
| Process time of 0                                                        | `requires-stakeholder-input` | human       | Allowed for team steps, so an inserted Intake is 0/0 and migrated LT and PT are exact.                                                                             |
| Scope cut (table/canvas, review/future, export)                          | `requires-stakeholder-input` | human       | Keep them all. Each slice is its own PR to trunk behind the toggle.                                                                                                |
| Pilot timing                                                             | `requires-stakeholder-input` | human       | Before switch-over, as a hard gate for removing v1.                                                                                                                |
| Intake is fixed                                                          | `inferable`                  | inference   | "It should start with Intake" means Intake always exists and comes first. Its name, position and team kind are locked so migration and the prompts can rely on it. |
| Largest wait excludes outside steps                                      | `inferable`                  | inference   | An outside step's wait portion is unknown by definition.                                                                                                           |
| Outside steps carry %C/A and can be in rework loops                      | `inferable`                  | inference   | Outside teams still return approve or reject. Their elapsed time counts in R.                                                                                      |
| Outside steps count as handoffs; team steps have a handoff toggle        | `inferable`                  | inference   | The pasted spec has `isHandoff` per step. Outside steps are by definition another team.                                                                            |
| Keep the v1 original on migration; v2 wins when both exist               | `inferable`                  | inference   | A single-user browser app has no other backup. Non-destructive is the only safe reading.                                                                           |
| Reorder that would create a forward rework path is refused               | `inferable`                  | inference   | The non-destructive choice. The user fixes the path explicitly.                                                                                                    |
| Stage completion is derived from validity                                | `inferable`                  | inference   | "Sticky" completion would misstate progress after later edits.                                                                                                     |
| %C/A is entered as a percent, prompted "Out of 100 items…", with an echo | `inferable`                  | inference   | The "out of 10" wording invites entering 8 into a 0–100 field. The echo ("80 usable, 20 sent back") confirms the value.                                            |
| Unit of work has no default                                              | `inferable`                  | inference   | A default would make the stage 1 gate trivially true.                                                                                                              |
| Stage 4 has no default %C/A                                              | `inferable`                  | inference   | A prefilled 100 would pass the gate without a decision.                                                                                                            |
| Depth-0 loop colour                                                      | `inferable`                  | inference   | It is the shallowest loop, so grey.                                                                                                                                |
| min/max, units input, notes, CSV and PDF export                          | `inferable`                  | inference   | Stated in the pasted spec and within the chosen scope.                                                                                                             |
| Undo is snapshot-in-store (departs from v1 rule D1)                      | `inferable`                  | inference   | Future-state and session edits have no single call site, and a whole-stream snapshot is simplest.                                                                  |
| Product name                                                             | `inferable`                  | inference   | "VSM Workshop" stays. "Flow Bench" was a mockup placeholder.                                                                                                       |
| Distribution model                                                       | `requires-stakeholder-input` | human       | A standalone package people download and run locally on any OS, with no separate database install. It ships as one HTML file, not an installer.                    |
| Multiple value streams                                                   | `requires-stakeholder-input` | human       | Yes: a workspace with a home screen.                                                                                                                               |
| Warn before leaving with unsaved changes                                 | `requires-stakeholder-input` | human       | Yes: the browser's `beforeunload` prompt, plus a save status in the header.                                                                                        |
| Autosave to the linked file vs explicit Save                             | `inferable`                  | inference   | With a linked file, autosave keeps the file current so the warning rarely fires. Download mode can't autosave, so it needs an explicit Save.                       |
| One workspace file for all streams, not one file per stream              | `inferable`                  | inference   | One file is one thing to back up and one permission grant. Single streams can still be exported and imported as value stream JSON files.                                          |
| IndexedDB as the working copy                                            | `inferable`                  | inference   | It survives reloads and crashes and holds more than localStorage. The file stays the durable copy because browsers may clear storage.                              |
| Stream names need not be unique                                          | `inferable`                  | inference   | Streams are identified by id. Duplicates get " (copy)", and blocking duplicate names adds friction with no benefit.                                                |
| Overwriting a linked file changed elsewhere                              | `inferable`                  | inference   | Never silently. A `revision` and `savedAt` stamp is compared on reconnect and before every write, and the user chooses "Keep mine", "Load file" or "Cancel".       |
| Who writes the workspace                                                 | `inferable`                  | inference   | Only the workspace store, through one serialized save queue. Two writers could interleave and lose an edit.                                                        |
| Autosave debounce                                                        | `inferable`                  | inference   | 500 ms. "Unsaved changes" during the wait and "Saving…" during the write, within the 2 s criterion.                                                                |
| Navigation counts as an edit                                             | `inferable`                  | inference   | No. Opening a stream or changing stage never makes the workspace unsaved, so a fresh launch never prompts.                                                         |
| Load-time validation                                                     | `inferable`                  | inference   | Structural only (types, Intake first, no forward rework). An unfinished stream is valid; completeness is a stage status.                                           |
| Keep rename and duplicate on the home screen                             | `inferable`                  | inference   | Tracking several streams needs them, and they are small.                                                                                                           |
| Unreadable data on launch                                                | `inferable`                  | inference   | The data is kept and downloadable. "Start an empty workspace" comes last, behind a confirm.                                                                        |

## Consistency Gate

- [x] Intent is unambiguous
- [x] Every behavior/goal maps to an acceptance criterion
- [x] Architecture constrains without over-engineering
- [x] Terminology consistent across artifacts (step, outside step, rework path, share of rejects, share of items, time on rework, current/future state, reached/complete/needs attention)
- [x] No contradictions between artifacts
- [x] Every gap/ambiguity finding is logged — inferable with rationale or resolved by human

**Verdict: PASS**
