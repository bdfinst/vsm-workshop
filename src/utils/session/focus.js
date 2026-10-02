/**
 * Move focus to the current stage's heading, if the page has one.
 * @param {ParentNode} [root] - Where to look; the whole document by default
 */
export const focusStageHeading = (root = globalThis.document) => {
  root?.querySelector('[data-testid="stage-heading"]')?.focus()
}

/**
 * Move focus where a screen opens: onto the upgrade notice's heading when one
 * is showing, so a screen reader announces it, otherwise the stage heading.
 * @param {ParentNode} [root] - Where to look; the whole document by default
 */
export const focusOpeningTarget = (root = globalThis.document) => {
  const notice = root?.querySelector('[data-testid="upgrade-notice-title"]')
  if (notice) notice.focus()
  else focusStageHeading(root)
}
