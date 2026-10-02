/**
 * Move focus to the current stage's heading, if the page has one.
 * @param {ParentNode} [root] - Where to look; the whole document by default
 */
export const focusStageHeading = (root = globalThis.document) => {
  root?.querySelector('[data-testid="stage-heading"]')?.focus()
}
