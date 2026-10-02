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

/** The attributes that name a row's controls: buttons and checkboxes, then text fields. */
export const CONTROL_ATTRIBUTE = 'data-control'
export const FIELD_ATTRIBUTE = 'data-field'

const attributeIs = (attribute, value) => `[${attribute}="${value}"]`

/**
 * Selects the text field called `name`.
 * @param {string} name - The field's `data-field` value
 * @returns {string} A CSS selector
 */
export const fieldSelector = (name) => attributeIs(FIELD_ATTRIBUTE, name)

/**
 * Selects whatever is called `name`: a button or checkbox by `data-control`, or
 * a text field by `data-field`.
 * @param {string} name - The control's or field's name
 * @returns {string} A CSS selector
 */
export const controlSelector = (name) =>
  `${attributeIs(CONTROL_ATTRIBUTE, name)}, ${fieldSelector(name)}`

/**
 * Move focus to the first element in the container that matches the selector.
 * @param {?ParentNode} container - Where to look; nothing happens without one
 * @param {string} selector - What to focus
 */
export const focusControl = (container, selector) => {
  container?.querySelector(selector)?.focus()
}
