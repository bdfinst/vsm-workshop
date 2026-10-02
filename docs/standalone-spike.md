# Standalone (file://) storage spike

Plan: `plans/guided-mapping-ux.md`, Slice 2, Step 2.1. This record gates Steps 3.2, 11 and 16.

Status: decision table and criteria written before the probe ran. Cells are filled in the "Results" section below.

## Deviations from the plan

- The plan says Chromium and Firefox "on Linux". This run is on macOS (Darwin), so the rows are "Chromium (macOS, automated)" and "Firefox (macOS, automated)". Linux behaviour is not measured here; Slice 16 CI (Linux) will exercise the same engines and should be treated as the confirmation.
- Playwright's bundled Chromium ("Google Chrome for Testing") is used, not a retail Chrome. Playwright's Firefox is used, not retail Firefox.
- Automation can't drive native OS dialogs. Where a column needs one (a user-picked file handle), the cell says what was and wasn't measured rather than guessing.

## Decision table

| Browser (OS, how)            | IDB persists                                       | persist granted                                                                                      | picker                                                     | handle survives                                                                                                                                                                       | beforeunload                 | PNG/PDF export                                                 | shared vs per-path origin                             | moved/renamed file                       | two copies                                                                                        | version skew                                                                                                      |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Chromium (macOS, automated)  | yes                                                | no (resolves false)                                                                                  | yes                                                        | N/A: user-picked handle needs a native dialog. Stand-in (OPFS handle) also fails: `getDirectory()` throws SecurityError on file://                                                    | prompt shown                 | ok (text with inlined font, data-URI image, foreignObject SVG) | shared: a copy in another folder read copy A's record | found, but only because origin is shared | live read yes; BroadcastChannel yes; `versionchange` reaches all open copies; upgrade not blocked | older copy gets `VersionError`; falls back to unversioned open, reads newer record, refuses it                    |
| Firefox (macOS, automated)   | yes                                                | unanswered: `persist()` shows a permission prompt, no answer in 5 s headless; treated as not granted | no                                                         | N/A: no picker, so no user-picked handle. Stand-in (OPFS handle): stored in IDB, found after restart, written after restart (`queryPermission`/`requestPermission` absent, TypeError) | prompt shown                 | ok (text with inlined font, data-URI image, foreignObject SVG) | shared: a copy in another folder read copy A's record | found, but only because origin is shared | live read yes; BroadcastChannel yes; `versionchange` reaches all open copies; upgrade not blocked | older copy gets `VersionError`; falls back to unversioned open, reads newer record, refuses it                    |
| Safari 27.0 (macOS, by hand) | open + write + read round trip ok; restart not run | no (resolves false)                                                                                  | no (neither `showSaveFilePicker` nor `showOpenFilePicker`) | N/A: no picker. Stand-in (OPFS handle) can't be stored: `DataCloneError`                                                                                                              | not run (no hands-on step 2) | ok (text with inlined font, data-URI image, foreignObject SVG) | not run                                               | not run                                  | not run                                                                                           | not run: no existing record (`existing` null), so refusal of newer data untested; own `schemaVersion` 1, write ok |

Column definitions (from the plan, plus the operational definition used by the probe):

- **IDB persists:** a workspace record written to IndexedDB is there after closing the browser and reopening the file. Operational: open + write + read round trip succeeds on file://, and the record is still there after a full browser restart on the same profile. "Usable IndexedDB" means the round trip succeeds.
- **persist granted:** `navigator.storage.persist()` resolves true.
- **picker:** `showSaveFilePicker` exists.
- **handle survives:** a file handle stored in IndexedDB can be re-permitted and written after a reopen.
- **beforeunload:** closing after a click shows the leave prompt.
- **PNG/PDF export:** a canvas drawn with an inlined (data URI) font and an inlined image exports with `toBlob`/`toDataURL` without tainting.
- **shared vs per-path origin:** two copies of the file in different folders see the same IndexedDB or not.
- **moved/renamed file:** the working copy is still found after the file is moved or renamed.
- **two copies:** what happens when two copies are open at once (live visibility of writes, `versionchange` on a schema upgrade, BroadcastChannel delivery).
- **version skew:** data written by a newer copy is refused by an older one. Operational: an older copy (schemaVersion 1) reads a record stamped schemaVersion 2 by a newer copy and detects it; the probe also records whether the browser itself raises `VersionError` when the older copy opens the database at a lower IDB version.

A cell may be `N/A` only with a stated reason. Cells hold short results; raw probe output is under "Raw results".

## How the numbers are decided

Written before the run so the decision isn't reverse-fitted.

- **Decision: go** if, for every browser measured, IDB persists is yes, export doesn't taint, and the shared-origin / version-skew results match what 3.2 already assumes (one working copy per origin, `schemaVersion` check refuses newer data), with no change needed to 3.2, 11 or 16.
- **Decision: adjust** otherwise, naming the change. Likely triggers:
  - IDB persists is no for a browser: that browser takes the storage-unavailable path (16.1) and its row is dropped from the 16.1 reopen outline.
  - persist granted is false: the "won't keep your work" notice (16.1) shows in that browser.
  - picker absent: that browser is download mode only (11.1/11.3); already planned, listed for completeness.
  - handle survives is no or not measurable: 11.3 reconnect relies on a user gesture every session.
  - beforeunload doesn't prompt: 11.4's guard is not reliable there.
  - export taints: 6.1/15.2 must inline more, or export by another route.
  - origin is per-path: copies don't share a working copy; the location notice (16.1) is the only guard.
  - the browser raises `VersionError` for an older copy: 3.2 must open the database without pinning a lower IDB version than another copy may have used (open with no version, or catch `VersionError` and treat as "newer data").
- A decision made while Safari is PENDING is provisional.

## Results

Run: `node spikes/run-probe.mjs` on 2026-10-01, macOS (Darwin 27.0.0), Playwright 1.58.2. Chromium is Playwright's Chrome for Testing 145 (headless). Firefox is Playwright's Firefox 146.0.1 (headless; `npx playwright install firefox` was needed and succeeded). Every browser used a persistent profile in a fresh temp directory; "IDB persists" closes the browser and relaunches that profile. The shared-origin, moved/renamed, two-copy and version-skew columns used real temp copies of the probe in different folders (`copyA/`, `copyB/nested/`, `copyC/` stamped schemaVersion 2, and `copyA` renamed into `copyD/`), opened at the same time in one profile.

### Notes on the cells

- **IDB persists:** open, write and read round trip passed on file://, and the record written before the restart was read after it, in both browsers.
- **persist granted:** Chromium resolves false without a prompt. Firefox asks the user; headless can't answer, so the call never resolved. Code must not await `persist()` on the load path.
- **handle survives:** not measured for a user-picked handle in either browser (Chromium has the picker but it opens a native dialog; Firefox has no picker). The OPFS-handle stand-in checks the same mechanism (a handle kept in IndexedDB, written after a reopen). It works in Firefox and can't start in Chromium on file:// (`getDirectory()` throws SecurityError), so it does not stand in for Chromium. Whether a picked handle survives a reopen in Chromium file:// is therefore not established; verify by hand in Chrome before relying on it in 11.3. This deviation is why the cell isn't "yes".
- **beforeunload:** Playwright `page.close({ runBeforeUnload: true })` after a real click on "Arm leave prompt" raised a `beforeunload` dialog in both browsers. Headless dialog events are evidence the handler is honoured, not proof of the visible prompt in a headed browser.
- **PNG/PDF export:** three canvases (text with a data-URI `@font-face`, a data-URI SVG image, and an SVG `foreignObject`, the route `html-to-image` takes) all exported with `toBlob` and `toDataURL`. No PDF library is in the probe; the app builds the PDF from the canvas image, so an untainted canvas is the precondition measured.
- **shared vs per-path origin:** Chromium reports origin `file://`; Firefox reports `null`, yet both shared one IndexedDB across files in different folders. The plan's risk note says other browsers "can lose the working copy" when the file moves; this was not seen in Chromium or Firefox. Safari is the open question.
- **two copies:** three copies open at once. A write by one is readable by the others, a `BroadcastChannel` message from one reached the other two, and a newer copy's schema upgrade delivered `versionchange` to every open copy. The probe closes its connection on `versionchange`, so the upgrade was never blocked. A copy that doesn't close would block the newer copy's upgrade.
- **version skew:** the newer copy opened IndexedDB at version 2. The older copy, opening at version 1, got the browser's own `VersionError`. Falling back to an unversioned open let it read the newer record and refuse it by `schemaVersion`.

### Raw rows

The runner's output, one table row per browser (full JSON: `node spikes/run-probe.mjs --json <path>`):

```text
Chromium: IDB persists=yes; persist=false; picker=yes; beforeunload=beforeunload dialog;
  export=ok/ok/ok; shared=yes; moved=found; BroadcastChannel B=1 D=1;
  versionchange on 3 of 3 open copies; older copy VersionError=true, refused=true
Firefox:  IDB persists=yes; persist=no answer in 5 s; picker=no; beforeunload=beforeunload dialog;
  export=ok/ok/ok; shared=yes; moved=found; BroadcastChannel B=1 D=1;
  versionchange on 3 of 3 open copies; older copy VersionError=true, refused=true
```

### Safari 27.0 (macOS, by hand): first run only

Single "Run checks" on `file://`: IndexedDB opened at its own version (no `VersionError`, no unversioned fallback) and round-tripped; `persist()` resolved false; no file pickers; OPFS exists but its handle can't be stored in IndexedDB (`DataCloneError`); canvas export ok including `foreignObjectSvg`; `localStorage` works. Safari therefore runs in download mode.

Not run (cells say "not run"): restart persistence, `beforeunload`, shared vs per-path origin, moved/renamed file, two copies, version skew against existing newer data. Steps 2 to 6 below remain open. None changes the decision: download mode needs no handle, and the IndexedDB-version handling is already required by the Chromium and Firefox results. Run them before Slice 16 and fill the "not run" cells.

Procedure for the remaining steps:

1. In Safari, open `spikes/file-protocol-probe.html` from disk (a `file://` address). Click "Run checks", then copy the JSON from the page and keep it as "first run".
2. Click "Arm leave prompt", then try to close the tab. Note whether a leave prompt appears (choose to stay).
3. Quit Safari fully and reopen the same file. Click "Run checks" and copy the JSON. `idb.markerBefore` non-null means IDB persists.
4. Copy the file into a different folder and open that copy; click "Run checks". `idb.markerBefore.href` pointing at the first copy means a shared origin. Then rename or move the first copy, open it, and run: `idb.markerBefore` non-null means the working copy is still found.
5. Make a third copy with `const SCHEMA_VERSION = 1` changed to `2`, open it and run. Then reload a version-1 copy and run: `idb.versionError: true` and `skew.refusedNewerData: true` are the version-skew result.
6. If the Web Inspector console is available, read `__events` in the version-1 tabs for `versionchange` and `broadcast` entries; if not, write N/A with that reason.
7. Fill the Safari row from the JSON: `idb.roundtrip` and step 3, `persist.granted`, `picker.showSaveFilePicker`, `handle`, the step 2 prompt, `exportCanvas` (including `foreignObjectSvg`, where WebKit most often differs), then steps 4 to 6. Then re-check the Decision below.

## Effects on later steps

- **3.2 (workspace codec and repositories):** Both browsers keep IndexedDB across a restart on file://, so the IndexedDB working copy works as planned. Changes:
  - Open the database so a newer copy can't lock this one out: either never raise the IndexedDB version for workspace-format changes (keep `schemaVersion` inside the record only), or catch `VersionError`, reopen without a version, and treat what is found as newer data.
  - Close the connection on `versionchange` (the probe did; the upgrade was not blocked).
  - `navigator.storage.persist()` can hang unanswered (Firefox). Call it without awaiting it on the load path, and report `persisted` false until it resolves.
- **11 (save to file):** The picker exists in Chromium only; Firefox gets download mode. Persisting a picked handle across reopen is not established (see the handle note), so 11.3's reconnect stays a user-gesture action each session and 11.2's `handleStore` should treat a handle that can't be stored or re-permitted as "download mode", not an error. `beforeunload` is honoured in both browsers, so the 11.4 guard is usable.
- **16 (standalone on every engine):** The reopen outline in 16.1 keeps Chromium and Firefox. The WebKit row stays until Safari is filled; Playwright WebKit is not Safari. Chromium resolves `persist()` false and Firefox leaves it unanswered, so the "doesn't grant persistent storage" notice would appear on every file:// open in both, although data survives a restart there. The notice text says work won't be kept after closing, which is false for those browsers. 16.1 should keep the text for the storage-unavailable case and word the persist-not-granted case differently (data kept, but the browser may evict it). The location notice says work is stored "for this file location"; in Chromium and Firefox the store is shared by every file:// location, so that wording is only accurate if Safari is per-path.

Decision: adjust — 3.2 opens IndexedDB without pinning a version a newer copy can't lower (or catches VersionError and falls back to an unversioned open), closes on versionchange, and never awaits navigator.storage.persist(); 11 treats a handle that can't be stored or re-permitted as download mode and doesn't assume handle persistence on file:// (not established in Chromium, no picker in Firefox); 16.1 keeps Chromium and Firefox in the reopen outline, expects the persist-not-granted notice on every Chromium and Firefox file:// open, and reviews the "for this file location" wording once Safari's origin sharing is known. Safari (first run): no picker, handle can't be stored, persist not granted, so download mode and the persist-not-granted notice apply there too. Safari restart, beforeunload and origin-sharing cells are open and are closed before Slice 16.
