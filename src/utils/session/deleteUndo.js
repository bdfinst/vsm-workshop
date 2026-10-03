import { TOAST_TYPE } from '../../stores/toastStore.svelte.js'

/**
 * The Undo toast offered after a step is deleted. Undo undoes the latest
 * change, so the toast must close as soon as anything else changes the version
 * (or the stage is left); otherwise it would undo that change instead.
 * @param {Object} options
 * @param {{add: function, dismiss: function}} options.toastStore - Shows the toast
 * @param {{activeVersion: Object, undo: function}} [options.store] - The open value stream store; read when used, so a getter can follow a changing prop. Without one there is no version to go stale.
 * @param {function(): {ok: boolean, announcement?: string}} [options.undo] - What Undo does; the store's undo by default
 * @param {string} [options.hint] - Shown with the toast, e.g. the keyboard shortcut
 * @param {function(string): void} [options.onannounce] - Says something to screen readers
 * @returns {{offer: function(string): void, close: function(): void, closeIfStale: function(): void}}
 */
export const createDeleteUndo = (options) => {
  const { toastStore, onannounce, hint } = options
  // The toast of the last delete, and the version it was offered on.
  let offered = null

  const close = () => {
    if (offered) toastStore.dismiss(offered.id)
    offered = null
  }

  const undo = () => {
    const result = options.undo ? options.undo() : options.store.undo()
    if (result.ok) onannounce?.(result.announcement)
  }

  /**
   * Offer Undo for a delete that just went through. A second offer replaces
   * the first, whose Undo would otherwise undo the newer delete.
   * @param {string} label - What was deleted
   */
  const offer = (label) => {
    close()
    const action = { label: 'Undo', onclick: undo }
    offered = {
      id: toastStore.add(`${label} deleted`, TOAST_TYPE.INFO, undefined, {
        action,
        hint,
      }),
      version: options.store?.activeVersion,
    }
  }

  /** Close the toast if the version has changed since it was offered. */
  const closeIfStale = () => {
    // Read first, so an effect calling this depends on the version even with no toast.
    const version = options.store?.activeVersion
    if (offered && version !== offered.version) close()
  }

  return { offer, close, closeIfStale }
}
