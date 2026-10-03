/**
 * The delete flow shared by the Steps stage and the home screen: ask first,
 * then delete (the caller's `run` deletes and offers Undo, see
 * `createDeleteUndo`), or give focus back when the question is cancelled.
 * Pure orchestration; the callers own the popover, the delete and the toast.
 * @param {Object} options
 * @param {function(): void} options.ask - Show the confirmation
 * @param {function(): void} options.close - Hide the confirmation
 * @param {function(): void} options.run - Delete, and offer Undo
 * @param {function(): void} options.restoreFocus - Put focus back on the control that asked
 * @returns {{request: function(boolean=): void, confirm: function(): void, cancel: function(): void}}
 */
export const createConfirmThenUndo = ({ ask, close, run, restoreFocus }) => ({
  /** The delete control was used; `needsConfirm` false deletes straight away. */
  request: (needsConfirm = true) => (needsConfirm ? ask() : run()),
  confirm: () => {
    close()
    run()
  },
  cancel: () => {
    close()
    restoreFocus()
  },
})
