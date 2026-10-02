# UX Design: Guided Mapping and Time Ladder

Status: proposed · 2026-09-30 · Spec: [docs/specs/guided-mapping-ux.md](../specs/guided-mapping-ux.md)

Mockup: open [mockups/guided-mapping.html](mockups/guided-mapping.html) in a browser. It is a static walkthrough with one tab per screen and no live data.

## Problems with the current UI

| Today                                                  | Effect in a workshop                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Opens on a blank free-form canvas                      | The team doesn't know what to enter first, so the facilitator does all the driving |
| Steps are free-floating nodes with PT / LT / %C&A text | Nobody can see where the time goes without reading every box                       |
| Eight equal metric tiles                               | Every number looks equally important, so nothing stands out                        |
| Rework is a dashed edge with a rate                    | The team can't see how far back a failure sends work, or what it costs             |
| Simulation and what-if panels compete for space        | This is an advanced tool shown to first-time mappers                               |

## Principles

1. **One question at a time.** Each stage is a single prompt with an example, and Next stays disabled until the answer is complete.
2. **The map is always visible and always live.** Every edit redraws within 200 ms.
3. **Shape before numbers.** The time ladder, drawn to scale, shows flow efficiency before anyone reads a figure.
4. **All views agree.** The ladder, the summary strip and the rework table flag the same step for the same problem.
5. **Honest about unknowns.** Outside-team steps show as hatched "split unknown" blocks, and the metrics become ranges instead of guesses.
6. **Tables are first-class.** Every drawn figure is also a row that can be edited, both for accessibility and for people who think in spreadsheets.

## Screens

### 0. Home screen (all value streams)

- Opens from "All value streams" in the header, or on launch when no stream is active.
- One line explains the word once: "A workspace is one file that holds all your value streams."
- Cards are in workspace order. New and imported streams go at the end, and a duplicate goes right after its source, named "(copy)", then "(copy 2)".
- Each card shows the name ("Untitled value stream" when blank, with its created date), last updated, step count and furthest stage. The card itself is a link that opens the stream.
- Beside the link, a "⋯" menu button named "Actions for <stream>" has Rename, Duplicate, Export value stream and Delete.
  - The menu works with Enter, Space, the arrow keys and Escape, and focus returns to the button when it closes.
- Toolbar: "New value stream", plus the same "File" menu and save status as the session header.
- Empty workspace: "No value streams yet", with "New value stream" offered. A reload of an empty workspace starts a new stream at Scope instead.
- **Delete:**
  - It confirms, naming the stream, then shows a "<Stream> deleted" toast whose Undo is announced along with its shortcut, Ctrl/Cmd+Z.
  - Ctrl/Cmd+Z on the home screen undoes the last delete, for the whole session.
  - Focus moves to the next card, or to "New value stream" when none are left.
- **Reconnect:** on launch in Chrome or Edge with a previously linked file, a banner offers "Reconnect to <file>".
  - The banner is a region and doesn't take focus.
  - After it is dismissed, the save status keeps a "Reconnect" action.
  - If the file changed since this browser last saved it, the app asks "This file changed since you last saved" with "Keep mine", "Load file" and "Cancel", and writes nothing until the user chooses. The same check runs before every autosave. "Load file" keeps the working copy as a backup first. Focus starts on Cancel, Escape cancels, and focus returns to the control that opened it.
- **Unreadable saved data:** "We couldn't read your saved workspace. Your saved data is kept."
  - The actions, in order: "Open workspace", "Import value stream", "Download the unreadable data", and last "Start an empty workspace".
  - "Start an empty workspace", last, behind a confirm: "Start an empty workspace? The unreadable copy stays kept, but it won't be shown again after this." with "Download the unreadable data", "Start empty" and "Cancel". Focus starts on Cancel, Escape cancels, and focus returns to the control that opened it.
- **Storage notice**, at the top. The no-storage notice is dismissible for the session; dismissing the location notice is remembered:
  - When the browser won't keep data, or doesn't grant persistent storage: "This browser won't keep your work after you close it. Save the workspace file before you leave."
  - When the standalone file is opened from disk: "Your work is stored in this browser for this file location. Save the workspace file to move or update."

### 1. Guided session shell

- **Header:** "All value streams", the map name ("Untitled value stream" until named), an "Editing: <label>" indicator with a version switcher, Undo and Redo, Export, Compare, the save status, one "Save" button, and a "File" menu.
  - The "File" menu has "New value stream", "Open workspace", "Save as…" (Chrome and Edge), "Import value stream" and "Export value stream", each with a one-line helper.
  - "File" is a menu button: Enter or Space opens it on the first item, arrow keys move, Escape closes it and returns focus to "File".
  - "Open workspace" with changes not in a file asks to save first. Focus starts on Cancel, Escape cancels, and focus returns to the control that opened it.
  - "Open workspace" on a file holding one value stream says "This is a single value stream — use Import value stream."
  - Under 640 px the header shows the map name, the save status and one menu holding everything else.
  - On the first, auto-created stream, Scope also shows "Have a workspace file? Open it".
  - In Chrome and Edge, after the first real edit, a one-time dismissible nudge says "Save as… to keep a file copy."
  - Undo and redo also work from Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.
  - Each undo or redo is announced to screen readers.
- **Save status** in the header, always visible, as text with an icon. Only the text is in a `role="status"` element; Retry, Save a copy, Reconnect and Save are sibling buttons outside it:

  | Status                                                                             | When                                                      |
  | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
  | Saved to <file>                                                                    | The linked file matches the data                          |
  | Unsaved changes                                                                    | Linked, in the 500 ms before a write starts               |
  | Saving…                                                                            | A write to the linked file is running                     |
  | Not saved to a file · Save                                                         | Download mode, or a file not reconnected, with edits      |
  | Downloaded vsm-workspace.vsm.json                                                  | Download mode, after a save (each download is a new copy) |
  | Couldn't save to <file>. Your work is still in this browser. · Retry · Save a copy | The last write failed. Uses `--warn-text`.                |
  - Screen readers hear only: "Not saved to a file" (once, until saved), "Couldn't save…", and the first "Saved to" after a failure. Routine "Unsaved changes" and "Saving…" during autosave are silent.
  - Opening a stream, changing stage or going home never counts as a change. A fresh launch with no edits shows nothing unsaved.
  - If permission to the file is denied: "Your browser didn't allow access — changes are kept in this browser only."
  - While it isn't saved, closing or reloading the tab shows the browser's own "Leave site?" prompt. Its wording can't be changed, so the header status is what explains it.
  - "Open workspace" with anything unsaved first asks "You have changes that aren't in a file. Save them first?" with "Save", "Discard" and "Cancel".

- A stage rail below the header shows the seven stages: Scope, Steps, Time, Quality, Rework, Review, Future.
  - Stage states:

    | State           | Shown as                                |
    | --------------- | --------------------------------------- |
    | Current         | Filled with the accent colour           |
    | Complete        | A check                                 |
    | Needs attention | A warning mark plus the reason, as text |
    | Not yet reached | Muted, and not selectable               |

  - Completion is derived from the data, so it is never stored. A reached stage whose data becomes invalid shows "needs attention". For example, a step added on stage 2 has no time yet, so stage 3 shows it.
  - Clicking any reached stage jumps back to it.

- **Layout:**
  - On wide screens: the prompt card and work area on the left, the live map pane on the right (from stage 2 on), and the summary strip pinned along the bottom.
  - Under 640 px: the panes stack, the strip collapses to flow efficiency plus a "Show all metrics" expander, and the ladder scrolls horizontally inside its pane without scrolling the page.
- The prompt card has the question, a one-line explanation, an example, and Back and Next.
- Under Next, one line states what unlocks it, naming the first missing item. For example: "Add the wait time for "Deploy"."
- On a stage change, and when moving between the home screen and a stream, focus moves to the heading.
- There is no stage timer.

### 2. List steps (stage 2)

- Intake is row 1. It is locked, with the chip "always first".
- Each row shows:
  - the step number and name;
  - a one-line description;
  - who does it;
  - a "Handed off to another team" toggle;
  - Our team / Outside.
- "+ Add step after …" sits at the bottom. Hovering between two rows shows "+ insert step here".
- **Reordering:**
  - Rows reorder by drag, by visible Move up and Move down buttons, or with Alt+↑/↓. Each move is announced.
  - A move that would make a rework path point forward is refused, with the reason shown.
- Starter suggestions (refinement, development, code review, build/CI, test, approval, deploy, release, validate) appear as chips.
- **Outside step:** the row gets a hatched fill with a dashed border and the text "outside". It counts as a handoff automatically. The prompt explains when to use it: "another team does it and you only see it leave and come back".
  - Switching an existing step between team and outside asks first, because the step's times are cleared.
- **Delete:** if the step has data or rework paths, a confirm names how many paths go with it. After the delete, a "<Step> deleted" toast with an Undo action appears. Intake has no delete control.

### 3. Time each step (stage 3)

- Team steps have process time and wait time fields (typical value, with optional min and max), a unit selector (min / h / days), and an Estimate or Measured chip.
- Outside steps have a single "elapsed, submitted → returned" field spanning both columns, with the same hatched background.
- A mini ladder under the form redraws as values are typed. It also shows the flow efficiency calculated so far.

### 3b. Quality and rework (stages 4 and 5)

- **Quality:**
  - The prompt reads: "Out of 100 items that reach this step, how many can you use without asking for a correction?"
  - The field starts empty. It echoes the answer, for example "80 usable, 20 sent back", along with the reject rate.
- **Rework:**
  - Only steps below 100% %C/A are listed.
  - Each one chooses where its rejects go. Targets are limited to that step or earlier ones.
  - Each path takes a share of the step's rejects, plus an optional rework time. Shares must add up to 100%, and a flag shows the running total, for example "Shares add up to 80% — need 100%".
  - When every step is at 100%, the stage says so, and Next is enabled.

### 4. Live map: time ladder

- A horizontal track runs across the map.
  - Each step's wait is a grey block rising above the track, and its process time is an accent block sinking below it. Widths are to scale by default, and an "Equal width" toggle is available.
  - Step boxes sit under the track, showing name, performer, process time and %C/A.
- **Encodings:**

  | Encoding                                                           | Meaning                                                             |
  | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
  | Accent outline                                                     | Handoff                                                             |
  | Dashed outline plus the missing field's name                       | Incomplete                                                          |
  | Hatched block across the track, labelled "elapsed · split unknown" | Outside step                                                        |
  | ⚑                                                                  | Largest wait, and lowest %C/A (written as text as well as the flag) |

- **Rework loops** hang under the step boxes, from the rejecting step back to its target.
  - Colour by depth: grey for 0–1, amber for 2–3, red for 4+. Line weight shows share of rejects.
  - Each loop's label reads, for example: "depth 3 · 20% of items · +1.9d avg per item".
  - A "Shade ladder under loop" toggle shades the section of the ladder that the loop repeats.
- A Map / Table / Canvas switch changes the view. The Canvas view is the existing Svelte Flow canvas, showing the same ordered steps with no branching.
- Long streams scroll horizontally, with the toolbar and summary strip pinned. Zoom to fit is one click.

### 5. Rework table

One row per path, sorted worst first by added time per item. Columns: path, depth (colour dot plus number), items that take it, share of rejects, rework time R, added per item. Rolled %C/A appears under the table.

### 6. Summary strip

- **Hero:** flow efficiency, large, with one sentence of context. Example: "14.5h of hands-on work inside an 18.8 working-day lead time." When the stream has an outside step, it shows as a range.
- **Secondary row:** lead time, process time, rolled %C/A, handoffs.
- **Rework trio:** first-pass lead time, then time on rework, then rework-adjusted lead time. The stated assumption sits under it: _Assumes no single rework loop is repeated more than once for an individual work item._
- **Flag callouts:** the largest wait and the lowest %C/A, naming the same step the ladder flags.

### 7. Review (stage 6)

The finished map, the totals, the three largest waits and the three costliest rework paths. The team picks up to two of them as focus items for the future state.

### 8. Current vs future (stage 7)

- Two ladders sit side by side on one time scale.
  - Removed steps are struck through on the current map.
  - New steps carry a "NEW" tag.
- The delta row shows lead time, flow efficiency, rolled %C/A, rework-adjusted lead time and handoffs. Improvements are shown in green.
- A team can keep several labelled future states, for example "90-day target" and "end state".

## Visual system

| Token                          | Light                                  | Use                                                                       |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------------------------- |
| `--accent`                     | `#2e5eaa`                              | Process time, handoff outline, active stage, primary buttons              |
| `--neutral-bg`                 | `#eeece5`                              | Wait blocks. They always carry an outline, to meet 3:1 non-text contrast. |
| `--good` / `--warn` / `--crit` | `#2f8f5b` / `#c77d12` / `#c23b34`      | Status and rework depth only, never used for decoration                   |
| `--warn-text`                  | a darker amber, ≥ 4.5:1 on the surface | Any warning shown as text ("needs attention", share flags)                |
| Hatch                          | 45° stripes on `--surface-2`           | Outside-team steps                                                        |

- **Type:** IBM Plex Sans for UI text and IBM Plex Mono for every number and time (tabular figures).
- **Dark mode:** mirrors every token. See the mockup's `:root` blocks.
- **Tailwind:** these map to the existing Tailwind usage in `.claude/rules/ui-patterns.md`. Put the tokens in `tailwind.config.js` as theme colours.

## Accessibility

- Every figure appears in the table view and in the CSV export.
- Depth and outside status are always written as text, never shown by colour or pattern alone.
- The stage rail, the Move up and Move down buttons, the view toggles, the loop details and the export menu can all be used by keyboard and have visible focus.
- Next carries `aria-describedby` pointing at its unlock reason. Field errors use `aria-invalid`.
- Moves, deletes, undo and redo are announced in a live region. The save status announces only the changes listed under Save status.
- The home card link and its "⋯" menu button are siblings, never nested.
- Loop tooltips are also available through focus, not only hover.
- WCAG 2.1 AA is checked with axe on every stage and view.

## Mockup decisions log

| Explored                                 | Decision                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Backwards walk from "live in production" | Rejected. Steps are listed forward from Intake.                                                                  |
| Stage timer / timebox                    | Removed                                                                                                          |
| Rework shown only on its own tab         | The loops were also added to the live map, with the share of items                                               |
| Rework time with ÷CA (repeat rejections) | Replaced by the at-most-once-per-item assumption, stated in the UI                                               |
| Defect trend screen                      | Moved out of this spec. It will be its own spec.                                                                 |
| %C/A asked "out of 10"                   | Changed to "Out of 100 items…" with an echo, to match the 0–100 field                                            |
| Drag-only reorder                        | Added Move up and Move down buttons for keyboard and touch                                                       |
| Delete without recovery                  | Added a confirm when the step has data, an Undo toast, and full undo/redo                                        |
| Simulation and what-if                   | Removed from the product                                                                                         |
| Where data lives                         | One workspace file holding every stream, autosaved in Chrome/Edge, downloaded elsewhere. No database or install. |
| Five save buttons in the header          | One "Save" plus a "File" menu, with a helper line per action                                                     |
| Overwriting a file changed elsewhere     | Checked on reconnect and before every write; the user picks "Keep mine", "Load file" or "Cancel"                 |
| "Start an empty workspace" first         | Moved last, behind a confirm, after "Download the unreadable data"                                               |
| Custom "unsaved changes" dialog on close | Not possible in browsers. The native prompt plus the header status is used instead.                              |
| Existing v1 users                        | Maps migrate on load, the original is kept, and a "What changed" notice lists every adjustment                   |
