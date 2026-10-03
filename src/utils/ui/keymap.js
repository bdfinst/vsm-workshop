/**
 * The guided session's keyboard shortcuts, kept pure so they can be tested
 * without a browser. v1's shortcuts live in `App.svelte` and are separate.
 */

// Input types that take typed text; the others (checkbox, button, range ...) do not.
const TEXT_INPUT_TYPES = [
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
]

/**
 * Whether typing goes into this element, so the browser's own text undo applies.
 * @param {{tagName?: string, type?: string, isContentEditable?: boolean} | null} element - The focused element
 * @returns {boolean}
 */
export const isTextEntry = (element) => {
  if (!element) return false
  if (element.isContentEditable) return true
  if (element.tagName === 'TEXTAREA') return true
  if (element.tagName !== 'INPUT') return false
  return TEXT_INPUT_TYPES.includes(element.type ?? 'text')
}

/**
 * The session action a key press asks for.
 * Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z redoes. While a text field has focus
 * both are left to the browser, which undoes the typing in that field.
 * @param {{key: string, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean, altKey: boolean}} event - The key press
 * @param {Object} [context]
 * @param {boolean} [context.inTextField] - A text field has focus
 * @returns {'undo' | 'redo' | null} The action, or null when the press is not ours
 */
export const shortcutFor = (event, { inTextField = false } = {}) => {
  const modified = event.ctrlKey || event.metaKey
  if (!modified || event.altKey || inTextField) return null
  if (event.key.toLowerCase() !== 'z') return null
  return event.shiftKey ? 'redo' : 'undo'
}

const MENU_ACTIONS = {
  ArrowDown: 'next',
  ArrowUp: 'previous',
  Home: 'first',
  End: 'last',
  Escape: 'close',
  Tab: 'leave',
}

/**
 * What a key press asks of an open menu. Enter and Space are not here: they
 * press the focused item, as on any button.
 * @param {{key: string, ctrlKey: boolean, metaKey: boolean, altKey: boolean}} event - The key press
 * @returns {'next' | 'previous' | 'first' | 'last' | 'close' | 'leave' | null}
 *   `close` closes it and keeps focus on its button; `leave` closes it and
 *   lets focus move on. Null when the press is not the menu's.
 */
export const menuActionFor = (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  return MENU_ACTIONS[event.key] ?? null
}

/**
 * Which menu item an action lands on. Arrow keys wrap round the ends.
 * @param {string} action - From `menuActionFor`
 * @param {number} current - The focused item's index, or -1 when none has focus
 * @param {number} count - How many items the menu has
 * @returns {number} The item to focus; `current` for an action that does not move
 */
export const menuIndexFor = (action, current, count) => {
  if (action === 'first') return 0
  if (action === 'last') return count - 1
  if (action === 'next') return (current + 1) % count
  if (action === 'previous') return current <= 0 ? count - 1 : current - 1
  return current
}
