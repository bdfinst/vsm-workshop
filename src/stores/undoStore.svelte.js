/**
 * Undo/Redo Store - Svelte 5 Runes
 * `createUndoStore(clone)` makes snapshot stacks for undo and redo over any
 * snapshot shape; the caller supplies the deep copy. The `undoStore` singleton
 * is the v1 instance, whose snapshots are `{ steps, connections }`; the v2
 * value stream store makes its own.
 *
 * Design decisions:
 * - D1: In v1, undo snapshots are pushed at COMPONENT CALL SITES, not inside
 *   vsmDataStore (the v2 store pushes inside its own actions instead)
 * - D2: updateStepPosition (drag ops) is excluded from undo
 * - Max depth: 20 entries (oldest evicted on overflow)
 * - Redo stack clears when a new mutation is pushed after undo
 *
 * @file This file uses Svelte 5 runes ($state)
 */

const MAX_UNDO_DEPTH = 20

/**
 * Deep-copy a v1 snapshot to prevent shared-reference mutations
 * @param {{ steps: Array, connections: Array }} snapshot
 * @returns {{ steps: Array, connections: Array }}
 */
const cloneSnapshot = (snapshot) => ({
  steps: snapshot.steps.map((s) => ({ ...s })),
  connections: snapshot.connections.map((c) => ({ ...c })),
})

/**
 * Create an undo/redo store. The caller supplies the deep copy, so the same
 * stacks serve any snapshot shape (v1 `{ steps, connections }`, v2 whole streams).
 * @param {function(*): *} clone - Deep-copies a snapshot
 * @returns {Object} Undo store with reactive state and actions
 */
export function createUndoStore(clone) {
  if (typeof clone !== 'function') {
    throw new TypeError('createUndoStore needs a clone function')
  }

  let undoStack = $state([])
  let redoStack = $state([])

  return {
    /** @returns {boolean} Whether undo is available */
    get canUndo() {
      return undoStack.length > 0
    },

    /** @returns {boolean} Whether redo is available */
    get canRedo() {
      return redoStack.length > 0
    },

    /**
     * Push a snapshot onto the undo stack (before a mutation).
     * Clears the redo stack since the timeline has diverged.
     * @param {*} snapshot - A snapshot of the shape this store's `clone` copies
     */
    pushSnapshot(snapshot) {
      const cloned = clone(snapshot)
      const full = [...undoStack, cloned]
      undoStack = full.length > MAX_UNDO_DEPTH ? full.slice(1) : full
      redoStack = []
    },

    /**
     * Undo the last change: pops from undo stack, pushes currentState to redo.
     * @param {*} currentState - The current state before restoring
     * @returns {*} The snapshot to restore, or null if stack empty
     */
    undo(currentState) {
      if (undoStack.length === 0) return null

      const snapshot = undoStack[undoStack.length - 1]
      undoStack = undoStack.slice(0, -1)
      redoStack = [...redoStack, clone(currentState)]

      return clone(snapshot)
    },

    /**
     * Redo the last undone change: pops from redo stack, pushes currentState to undo.
     * @param {*} currentState - The current state before restoring
     * @returns {*} The snapshot to restore, or null if stack empty
     */
    redo(currentState) {
      if (redoStack.length === 0) return null

      const snapshot = redoStack[redoStack.length - 1]
      redoStack = redoStack.slice(0, -1)
      undoStack = [...undoStack, clone(currentState)]

      return clone(snapshot)
    },

    /**
     * Read the snapshot undo would restore, without moving it.
     * @returns {*} A copy of the snapshot, or null if the undo stack is empty
     */
    peekUndo() {
      return undoStack.length === 0 ? null : clone(undoStack.at(-1))
    },

    /**
     * Read the snapshot redo would restore, without moving it.
     * @returns {*} A copy of the snapshot, or null if the redo stack is empty
     */
    peekRedo() {
      return redoStack.length === 0 ? null : clone(redoStack.at(-1))
    },

    /**
     * Clear both undo and redo stacks
     */
    clear() {
      undoStack = []
      redoStack = []
    },
  }
}

export const undoStore = createUndoStore(cloneSnapshot)
